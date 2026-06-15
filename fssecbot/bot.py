import discord
from discord.ext import commands
from google_sheets import GoogleSheetsClient
import asyncio
from flask import Flask, request
import threading
import logging
import datetime
from logging_config import setup_logging
from config import Config
from utils.messaging import format_bulletin_embed

# Setup logging
setup_logging()
logger = logging.getLogger(__name__)

# Initialize Google Sheets Client
sheets_client = GoogleSheetsClient()

# Initialize Discord Bot
intents = discord.Intents.default()
intents.members = True  # Required to access member information
intents.message_content = True  # Message Content Intent
bot = commands.Bot(command_prefix='!', intents=intents)

# Initialize Flask App
app = Flask(__name__)

@bot.event
async def on_ready():
    logger.info(f'Logged in as {bot.user.name} - {bot.user.id}')

# Add this route for testing
@app.route('/', methods=['GET'])
def home():
    return "Bot is running and accessible!", 200

@app.route('/trigger', methods=['POST'])
def trigger():
    token = request.headers.get('Authorization')
    logger.info(f"Received POST request to /trigger with token: {token}")
    if token != f"Bearer {Config.SECRET_TOKEN}":
        logger.warning(f"Unauthorized trigger attempt with token: {token}")
        return 'Unauthorized', 401

    logger.info("Received authorized trigger request from Google Apps Script.")
    try:
        # Run send_bulletin in a separate thread to avoid blocking Flask
        threading.Thread(target=lambda: asyncio.run_coroutine_threadsafe(send_bulletin(), bot.loop)).start()
        logger.info("Started send_bulletin coroutine in a separate thread.")
    except Exception as e:
        logger.error(f"Failed to start send_bulletin coroutine: {e}")
        return 'Failed to start bulletin sending.', 500
        
    return 'Bulletin sent!', 200

async def send_bulletin():
    logger.info("Entered send_bulletin function.")
    try:
        bulletin_entries = sheets_client.get_bulletin_board()
        logger.info(f"Retrieved {len(bulletin_entries)} bulletin entries.")
        
        discord_records = sheets_client.get_discord_ids()
        logger.info(f"Retrieved {len(discord_records)} Discord user records.")
        
        if not bulletin_entries:
            logger.warning("No bulletin entries found.")
            return
        
        if not discord_records:
            logger.warning("No Discord user records found.")
            return
        
        # Get current date
        current_date = datetime.datetime.now().strftime("%d/%m/%Y")
        
        for record in discord_records:
            discord_user_id = record.get('discord_user_id')
            team_member = record.get('team_member')
            
            if not discord_user_id:
                logger.warning(f"Missing Discord User ID for team member: {team_member}")
                continue
            
            try:
                user = await bot.fetch_user(discord_user_id)
                if user:
                    embed = discord.Embed(
                        title=f"New Bulletin Announcement ({current_date})",
                        color=0x3498db,  # Choose your preferred color
                    )
                    
                    total_entries = len(bulletin_entries)
                    for idx, entry in enumerate(bulletin_entries):
                        bulletin_embed = format_bulletin_embed(entry)
                        embed.add_field(
                            name=bulletin_embed.title,
                            value=(
                                f"{bulletin_embed.description}\n"
                                f"**Priority:** {entry.get('PRIORITY', 'N/A')}\n"
                                f"**Date Added:** {entry.get('DATE ADDED', 'N/A')}\n"
                                f"**Due Date:** {entry.get('DUE DATE', 'N/A')}\n"
                            ),
                            inline=False
                        )
                        # Add a blank field for spacing only if it's not the last entry
                        if idx < total_entries - 1:
                            embed.add_field(name="\u200b", value="\u200b", inline=False)
                    
                    await user.send(embed=embed)
                    logger.info(f"Sent embed message to {team_member} ({discord_user_id})")
                else:
                    logger.warning(f"User not found for Discord ID: {discord_user_id}")
            except discord.DiscordException as e:
                logger.error(f"Discord error when sending message to {team_member} ({discord_user_id}): {e}")
            except Exception as e:
                logger.error(f"Unexpected error when sending message to {team_member} ({discord_user_id}): {e}")
    except Exception as e:
        logger.error(f"Error in send_bulletin: {e}")

def run_flask():
    logger.info(f"Starting Flask server at {Config.FLASK_URL or f'http://{Config.HOST}:{Config.PORT}'}")
    app.run(host=Config.HOST, port=Config.PORT)

if __name__ == '__main__':
    # Start Flask in a separate thread
    flask_thread = threading.Thread(target=run_flask, daemon=True)
    flask_thread.start()

    # Run Discord Bot
    try:
        bot.run(Config.DISCORD_TOKEN)
    except Exception as e:
        logger.critical(f"Failed to start Discord bot: {e}")
