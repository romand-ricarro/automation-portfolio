import os
import logging
import asyncio
import time
from collections import defaultdict
from datetime import datetime

import discord
from discord.ext import commands

import gspread
from oauth2client.service_account import ServiceAccountCredentials

from dotenv import load_dotenv

# --------------------------------------------------------
# 1) LOGGING CONFIG
# --------------------------------------------------------
logging.basicConfig(
    filename='/home/ec2-user/fssecbot/fssecbot.log',  # Make sure this directory exists!
    level=logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s"
)
logger = logging.getLogger(__name__)

# --------------------------------------------------------
# 2) LOAD ENV VARIABLES
# --------------------------------------------------------
load_dotenv()
DISCORD_TOKEN = os.getenv("DISCORD_TOKEN")
TRAINING_TRACKER_ID = os.getenv("TRAINING_TRACKER_ID")
GOOGLE_CREDS_JSON = os.getenv("GOOGLE_CREDS_JSON")
ANNOUNCE_CHANNEL_ID = int(os.getenv("ANNOUNCE_CHANNEL_ID", "0"))

if not DISCORD_TOKEN:
    logger.error("DISCORD_TOKEN is missing! Check your .env file.")
if not TRAINING_TRACKER_ID:
    logger.error("TRAINING_TRACKER_ID is missing! Check your .env file.")
if not GOOGLE_CREDS_JSON:
    logger.error("GOOGLE_CREDS_JSON is missing! Check your .env file.")
if not ANNOUNCE_CHANNEL_ID:
    logger.warning("ANNOUNCE_CHANNEL_ID not set or invalid. Bot won't post in a channel.")

# --------------------------------------------------------
# 3) MESSAGE TRACKER CLASS
# --------------------------------------------------------
class MessageTracker:
    def __init__(self, cooldown_period=1800):  # 30 minutes cooldown
        self.last_dm_time = defaultdict(float)  # discord_id -> timestamp
        self.sent_notifications = set()  # Track (discord_id, role) combinations that have been sent
        self.cooldown_period = cooldown_period

    def can_send_message(self, discord_id: str, role: str) -> bool:
        """Check if we can send a message for this user/role combination"""
        key = (discord_id, role)
        
        # If we've already sent this notification, don't send again
        if key in self.sent_notifications:
            logger.debug(f"Already sent notification for {discord_id} - {role}")
            return False
        
        # Check cooldown
        current_time = time.time()
        if current_time - self.last_dm_time[discord_id] < self.cooldown_period:
            logger.debug(f"User {discord_id} is in cooldown period")
            return False
        
        return True

    def record_message(self, discord_id: str, role: str):
        """Record that we've sent a message"""
        self.last_dm_time[discord_id] = time.time()
        self.sent_notifications.add((discord_id, role))
        logger.info(f"Recorded message sent to {discord_id} for role {role}")

    def clear_notification(self, discord_id: str, role: str):
        """Clear a notification after user responds (allows future notifications for same role)"""
        key = (discord_id, role)
        if key in self.sent_notifications:
            self.sent_notifications.remove(key)
            logger.info(f"Cleared notification record for {discord_id} - {role}")

# --------------------------------------------------------
# 4) SET UP GOOGLE SHEETS
# --------------------------------------------------------
logger.info("Authorizing Google Sheets...")
scope = [
    "https://spreadsheets.google.com/feeds",
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive.file",
    "https://www.googleapis.com/auth/drive",
]
try:
    creds = ServiceAccountCredentials.from_json_keyfile_name(GOOGLE_CREDS_JSON, scope)
    client = gspread.authorize(creds)

    # Open by key, then select the tab named "Training Trackers"
    sheet = client.open_by_key(TRAINING_TRACKER_ID).worksheet("Training Trackers")
    logger.info("Successfully opened the 'Training Tracker' worksheet.")
except Exception as e:
    logger.exception("Failed to set up Google Sheets client: %s", e)
    raise

# --------------------------------------------------------
# 5) DISCORD BOT SETUP
# --------------------------------------------------------
intents = discord.Intents.default()
intents.message_content = True
intents.members = True

bot = commands.Bot(command_prefix="!", intents=intents)
message_tracker = MessageTracker(cooldown_period=1800)  # 30 minute cooldown
message_row_map = {}  # message_id -> { notifications: [], role: str, member_name: str }

@bot.event
async def on_ready():
    logger.info(f"Logged in as {bot.user} (ID: {bot.user.id}). Bot is ready!")
    bot.loop.create_task(background_sheet_poller())

# --------------------------------------------------------
# 6) BACKGROUND TASK: POLL SHEET PERIODICALLY
# --------------------------------------------------------
async def background_sheet_poller():
    """
    Runs indefinitely. Every 60 seconds, checks the Google Sheet for
    new "Yes" entries and sends them a DM if not yet 'DM Sent'.
    """
    await bot.wait_until_ready()
    logger.info("Background sheet poller started.")

    while not bot.is_closed():
        try:
            await check_sheet_logic()
        except Exception as e:
            logger.exception("Error in background_sheet_poller: %s", e)

        await asyncio.sleep(60)  # Poll every 60 seconds

async def check_sheet_logic():
    """
    Reads the Training Tracker worksheet and processes eligible entries.
    Groups notifications by discord_id and role, combines multiple recommendations,
    and sends ONE DM per user per role.
    """
    logger.debug("Checking sheet in background...")

    all_data = sheet.get_all_values()
    logger.debug(f"Retrieved {len(all_data)} total rows (including header).")

    # Group notifications by (discord_id, role) to prevent duplicates
    notification_groups = defaultdict(list)  # (discord_id, role) -> [row_data]
    
    for i, row in enumerate(all_data[1:], start=2):
        # Updated column references
        unique_id     = row[0].strip()
        discord_id    = row[1].strip()  # Discord ID moved to column B
        member_name   = row[2].strip()
        role_data     = row[3].strip()
        origin        = row[4].strip()
        
        # Check general eligibility in column H (normally 7)
        is_eligible = row[7].strip().lower() == "yes" if len(row) > 7 else False
        
        # Check if DM has been sent - column AB (normally 27)
        feedback_sent = row[27].strip().lower() if len(row) > 27 else ""

        # Skip if not eligible or already sent
        if not is_eligible or feedback_sent == "dm sent":
            continue

        # Skip if no discord ID or role
        if not discord_id or not role_data:
            continue

        # Group by user and role
        key = (discord_id, role_data)
        notification_groups[key].append({
            'row_number': i,
            'unique_id': unique_id,
            'member_name': member_name,
            'origin': origin
        })

    logger.info(f"Found {len(notification_groups)} unique notification groups to process")

    # Process each group (one message per user per role)
    for (discord_id, role_data), notifications in notification_groups.items():
        # Check if we can send this message
        if not message_tracker.can_send_message(discord_id, role_data):
            logger.info(f"Skipping notification for {discord_id} (role: {role_data}) - already sent or in cooldown")
            continue

        try:
            user = await bot.fetch_user(int(discord_id))
            if not user:
                logger.warning(f"Could not fetch user with ID {discord_id}")
                continue

            # Combine origins from multiple entries
            origins = ", ".join(sorted(set(n['origin'] for n in notifications)))
            member_name = notifications[0]['member_name']  # Should be same for all
            
            dm_text = (
                f"🔔 **Training Opportunity** 🔔\n\n"
                f"Hello {member_name}!\n\n"
                f"You are now eligible for training in role: **{role_data}**\n"
                f"Based on: {origins}\n\n"
                f"• To **ACCEPT** this opportunity, react with ✅\n"
                f"• To **DECLINE** this opportunity, react with ❌"
            )
            
            dm_message = await user.send(dm_text)
            await dm_message.add_reaction("✅")
            await dm_message.add_reaction("❌")

            # Record this message to prevent duplicates
            message_tracker.record_message(discord_id, role_data)

            # Store all notifications in message_row_map
            message_row_map[dm_message.id] = {
                'notifications': notifications,
                'role': role_data,
                'member_name': member_name
            }

            # Get current timestamp
            current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

            # Mark ALL related rows as "DM Sent" and add timestamp
            for notification in notifications:
                row_num = notification['row_number']
                sheet.update_cell(row_num, 28, "DM Sent")  # Column AB
                sheet.update_cell(row_num, 30, current_time)  # Column AD (dmSentAt)
                logger.info(f"Updated row {row_num}, marked as 'DM Sent' at {current_time}")

            logger.info(f"Successfully sent DM to {member_name} ({discord_id}) for role {role_data}")

            # Add delay between different users to avoid rate limiting
            await asyncio.sleep(2)

        except discord.Forbidden:
            logger.warning(f"Cannot send DM to user {discord_id} - DMs may be disabled")
        except discord.NotFound:
            logger.warning(f"User {discord_id} not found")
        except Exception as e:
            logger.exception(f"Error processing notifications for {discord_id}: {e}")

# --------------------------------------------------------
# 7) EVENT: on_reaction_add
# --------------------------------------------------------
@bot.event
async def on_reaction_add(reaction, user):
    # Ignore the bot's own reactions
    if user == bot.user:
        return

    # Make sure this is a DM channel and the message has an associated mapping
    if isinstance(reaction.message.channel, discord.DMChannel):
        emoji = str(reaction.emoji)
        
        # Fetch the full message to ensure we have the latest data
        try:
            message = await reaction.message.channel.fetch_message(reaction.message.id)
        except discord.NotFound:
            logger.warning(f"Message {reaction.message.id} not found")
            return
        except Exception as e:
            logger.exception(f"Error fetching message: {e}")
            return
            
        row_info = message_row_map.get(message.id)
        if not row_info:
            logger.debug(f"No row info found for message ID {message.id}. Ignoring reaction.")
            return

        notifications = row_info['notifications']
        role_data = row_info['role']

        if emoji in ["✅", "❌"]:
            try:
                # Get current timestamp for member reply
                reply_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                
                # Send the comment request
                comment_prompt = await reaction.message.channel.send("📝 Would you like to share any thoughts about your decision? This helps us improve our training process.")
                
                try:
                    user_comment = await bot.wait_for(
                        "message",
                        check=lambda m: m.author == user and m.channel == reaction.message.channel,
                        timeout=120.0
                    )
                except asyncio.TimeoutError:
                    await reaction.message.channel.send("⏱️ No comment received within 2 minutes. No worries - your response has been recorded successfully.")
                    user_comment = None

                accept_or_reject = "Accept" if emoji == "✅" else "Reject"
                
                # Update all related rows with the same response
                try:
                    for notification in notifications:
                        row_number = notification['row_number']
                        sheet.update_cell(row_number, 10, accept_or_reject)  # Column J
                        if user_comment:
                            sheet.update_cell(row_number, 11, user_comment.content)  # Column K
                        
                        # Add timestamp when member replied
                        sheet.update_cell(row_number, 31, reply_time)  # Column AE (repliedAt)
                    
                    logger.info(f"Successfully updated sheet for {user.name} ({user.id}) - {accept_or_reject} at {reply_time}")
                except Exception as e:
                    logger.exception(f"Error updating sheet: {e}")
                    await reaction.message.channel.send("⚠️ There was an error recording your response. Please try again in a few moments or contact Romand from Tech Tools if the issue persists.")
                    return

                # Clear the notification record so they can receive future notifications for this role
                message_tracker.clear_notification(str(user.id), role_data)

                await reaction.message.channel.send("✨ Thank you for your feedback! Your response has been recorded successfully.")
                    
                # Post in announcement channel
                if ANNOUNCE_CHANNEL_ID:
                    channel = bot.get_channel(ANNOUNCE_CHANNEL_ID)
                    if channel is None:
                        logger.warning(f"Could not find channel {ANNOUNCE_CHANNEL_ID}")
                        return
                    
                    color = 0x2ECC71 if accept_or_reject == "Accept" else 0xCC0000
                    embed_title = (
                        f"✅ {row_info['member_name']} accepted training for {role_data}"
                        if accept_or_reject == "Accept"
                        else f"❌ {row_info['member_name']} rejected training for {role_data}"
                    )
                    embed_desc = (
                        f"Reason: {user_comment.content if user_comment else 'No comment provided'}" 
                        if accept_or_reject == "Reject" 
                        else f"Additional comments: {user_comment.content if user_comment else 'No comment provided'}" 
                    )

                    embed = discord.Embed(
                        title=embed_title,
                        description=embed_desc,
                        color=color
                    )
                    embed.set_footer(text="FoodStyles Secretary Bot")

                    try:
                        await channel.send(embed=embed)
                        logger.info(f"Posted Accept/Reject update in channel {ANNOUNCE_CHANNEL_ID}")
                    except Exception as e:
                        logger.exception(f"Failed to send embed in channel {ANNOUNCE_CHANNEL_ID}: {e}")
            
            except Exception as e:
                logger.exception(f"Error processing reaction: {e}")
                await reaction.message.channel.send("⚠️ An error occurred while processing your response. Please try again in a few moments or contact Romand from Tech Tools if the issue persists.")

# --------------------------------------------------------
# 8) RUN THE BOT
# --------------------------------------------------------
if __name__ == "__main__":
    if DISCORD_TOKEN:
        logger.info("Starting the Discord bot...")
        bot.run(DISCORD_TOKEN)
    else:
        logger.error("No DISCORD_TOKEN found. Exiting.")