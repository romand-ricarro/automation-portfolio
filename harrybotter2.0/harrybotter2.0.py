import os
import json
import asyncio
import datetime
import time
from typing import Optional, Dict, Any, List

import discord
from discord import ui, app_commands
from discord.ext import commands, tasks
from dotenv import load_dotenv
import pytz

# Google Sheets imports
import gspread
from google.oauth2.service_account import Credentials
from gspread.exceptions import APIError
from http.client import RemoteDisconnected
from requests.exceptions import RequestException

from version import __version__

# ----- Load Environment -----
load_dotenv()
DISCORD_TOKEN = os.getenv('DISCORD_TOKEN')
CHANNEL_ID = int(os.getenv('CHANNEL_ID', 0))  # #harry-botter channel
TICKET_CHANNEL_ID = int(os.getenv('TICKET_CHANNEL_ID', 0))  # #ticket channel
GUILD_ID = int(os.getenv("GUILD_ID", 0))
SPREADSHEET_ID = os.getenv("SPREADSHEET_ID")
WORKSHEET_NAME = os.getenv("WORKSHEET_NAME", "HarryBotter")
WORKSHEET_GID = os.getenv("WORKSHEET_GID")
SERVICE_ACCOUNT_FILE = os.getenv("SERVICE_ACCOUNT_FILE", "credentials/credentials.json")
TECH_TOOL_ROLE_ID = int(os.getenv("TECH_TOOL_ROLE_ID", 0))

# ----- JSON Configs -----
current_dir = os.path.dirname(__file__)

# Load messages
with open(os.path.join(current_dir, 'messages.json'), 'r', encoding='utf-8') as f:
    messages = json.load(f)

# Load staff members list from JSON config
with open(os.path.join(current_dir, 'members.json'), 'r', encoding='utf-8') as f:
    staff_data = json.load(f)
    STAFF_MEMBERS = staff_data["members"]

# Load user mappings (Discord ID to display name)
USER_MAPPINGS = {}
mappings_path = os.path.join(current_dir, 'mappings.json')
if os.path.exists(mappings_path):
    with open(mappings_path, 'r', encoding='utf-8') as f:
        USER_MAPPINGS = json.load(f)

# ----- Bot Setup -----
intents = discord.Intents.default()
intents.message_content = True
intents.reactions = True
intents.members = True

bot = commands.Bot(command_prefix="!", intents=intents)

# Dict to store active tickets to prevent duplicates
active_tickets = {}
# Dict to store user cooldowns
user_cooldowns = {}

# ----- Helper Functions -----
def get_uk_time():
    """Get current time in UK timezone (GMT/BST)"""
    uk_tz = pytz.timezone('Europe/London')
    return datetime.datetime.now(uk_tz)

def format_uk_timestamp(dt=None):
    """Format a datetime to UK format: YYYY-MM-DD HH:MM:SS"""
    if dt is None:
        dt = get_uk_time()
    return dt.strftime("%Y-%m-%d %H:%M:%S")

def get_priority_color(priority: str) -> int:
    """Return a color code based on priority level"""
    colors = {
        "Urgent": 0xFF0000,  # Red
        "High": 0xFF8C00,    # Orange
        "Medium": 0xFFFF00,  # Yellow
        "Low": 0x00FF00      # Green
    }
    return colors.get(priority, 0x808080)  # Default to gray if not found

def get_display_name(discord_id: str) -> str:
    """Get the mapped display name for a Discord ID"""
    return USER_MAPPINGS.get(discord_id, None)

def is_on_cooldown(user_id: int) -> bool:
    """Check if a user is on cooldown"""
    if user_id in user_cooldowns:
        if time.time() < user_cooldowns[user_id]:
            return True
    return False

def get_cooldown_remaining(user_id: int) -> tuple:
    """Get remaining cooldown time in minutes and seconds"""
    if user_id in user_cooldowns:
        remaining = user_cooldowns[user_id] - time.time()
        if remaining > 0:
            minutes, seconds = divmod(remaining, 60)
            return int(minutes), int(seconds)
    return 0, 0

# ----- Google Sheets Integration -----
def get_sheet(max_retries=3, retry_delay=2):
    """Connect to Google Sheets and return the worksheet"""
    retries = 0
    last_exception = None
    while retries < max_retries:
        try:
            scopes = ["https://www.googleapis.com/auth/spreadsheets"]
            creds = Credentials.from_service_account_file(SERVICE_ACCOUNT_FILE, scopes=scopes)
            client = gspread.authorize(creds)
            return client.open_by_key(SPREADSHEET_ID).worksheet(WORKSHEET_NAME)
        except (ConnectionError, RemoteDisconnected, RequestException, APIError) as e:
            last_exception = e
            retries += 1
            print(f"[ERROR] Connection error (attempt {retries}/{max_retries}): {e}")
            if retries < max_retries:
                time.sleep(retry_delay)
                retry_delay *= 2
    raise last_exception

async def submit_to_google_sheets(ticket_data: Dict[str, Any]) -> Dict[str, Any]:
    """Submit ticket data to Google Sheets using a targeted approach that preserves formulas"""
    try:
        # Check credentials
        if not os.path.exists(SERVICE_ACCOUNT_FILE):
            error_msg = f"Credentials file not found at {SERVICE_ACCOUNT_FILE}"
            print(f"[ERROR] {error_msg}")
            return {"ok": False, "error": error_msg}

        sheet = get_sheet()
        
        # Get current row count
        max_retries = 3
        retry_delay = 2
        current_rows = None
        for attempt in range(max_retries):
            try:
                current_rows = len(sheet.get_all_values())
                break
            except (ConnectionError, RemoteDisconnected, RequestException, APIError) as e:
                if attempt < max_retries - 1:
                    print(f"[ERROR] Connection error on attempt {attempt+1}/{max_retries}: {str(e)}")
                    time.sleep(retry_delay)
                    retry_delay *= 2
                    sheet = get_sheet()  # Re-auth
                else:
                    return {
                        "ok": False,
                        "error": f"Failed to access sheet after {max_retries} attempts: {str(e)}"
                    }

        # Get UK timezone timestamp
        timestamp = format_uk_timestamp()
        row_index = current_rows + 1
        
        # Use the display name from mappings if available
        discord_id = ticket_data["discord_id"]
        display_name = ticket_data.get("display_name")
        if not display_name:
            display_name = USER_MAPPINGS.get(discord_id, ticket_data["requested_by"])
            ticket_data["display_name"] = display_name
        
        # Assignee-related fields
        assignee = ticket_data["assignee"]
        assigned_timestamp = timestamp if assignee != "None" else ""
        
        # Format required date if provided
        required_date = ticket_data.get("required_date", "")
        
        # Define specific columns we want to update and their values
        column_values = {
            "B": timestamp,                       # B: timestampSubmitted
            "C": ticket_data["name"],             # C: taskName
            "D": ticket_data["description"],      # D: taskDescription
            "E": display_name,                    # E: requestedBy
            "F": ticket_data["link"],             # F: link
            "G": ticket_data["priority"],         # G: priority
            "H": ticket_data["ticket_type"],      # H: ticketType
            "I": "Open",                          # I: status
            "J": required_date,                   # J: requiredDate
            "K": assignee if assignee != "None" else "",  # K: assignee
            "R": assigned_timestamp,              # R: timestamp if assignee not None
            "AG": discord_id                      # AG: discordId
        }
        
        # Create a batch update request
        batch_data = []
        for col, value in column_values.items():
            batch_data.append({
                'range': f"{col}{row_index}",
                'values': [[value]]
            })
            
        # Execute the batch update
        for attempt in range(max_retries):
            try:
                sheet.batch_update(batch_data)
                break
            except (ConnectionError, RemoteDisconnected, RequestException, APIError) as e:
                if attempt < max_retries - 1:
                    print(f"[ERROR] Connection error on attempt {attempt+1}/{max_retries}: {str(e)}")
                    time.sleep(retry_delay)
                    retry_delay *= 2
                    sheet = get_sheet()
                else:
                    return {
                        "ok": False,
                        "error": f"Failed to update row after {max_retries} attempts: {str(e)}"
                    }

        # Get the ticket number from column A
        ticket_number = None
        try:
            # Wait a moment for the sheet to update
            await asyncio.sleep(1)
            # Get the value from column A for the row we just added
            ticket_number = sheet.cell(row_index, 1).value
            print(f"[INFO] Retrieved ticket number from column A: {ticket_number}")
        except Exception as e:
            print(f"[WARNING] Could not retrieve ticket number: {str(e)}")
            # Use a fallback if we couldn't get the actual ticket number
            ticket_number = f"#{row_index}"

        # Store the ticket number for later use in notifications
        ticket_data["ticket_number"] = ticket_number
            
        # Try to get the ticket link from column AH
        ticket_link = None
        try:
            # Wait a moment for the sheet to update - formulas might need time to calculate
            await asyncio.sleep(2)
            # Get the value from column AH for the row we just added
            # Column AH is the 34th column (index 33)
            ticket_link = sheet.cell(row_index, 34).value
            print(f"[INFO] Retrieved ticket link from column AH: {ticket_link}")
            if ticket_link:
                ticket_data["ticket_link"] = ticket_link
        except Exception as e:
            print(f"[WARNING] Could not retrieve ticket link: {str(e)}")
            
        # Construct a direct link to that row as a fallback
        task_url = f"https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit"
        if WORKSHEET_GID:
            task_url += f"#gid={WORKSHEET_GID}&range=A{row_index}"
        else:
            task_url += f"#{WORKSHEET_NAME}&range=A{row_index}"

        # Set user cooldown (1 minute)
        user_id = int(discord_id)
        user_cooldowns[user_id] = time.time() + 60

        return {
            "ok": True,
            "task_url": task_url,
            "row_index": row_index,
            "ticket_number": ticket_number
        }

    except APIError as api_err:
        error_message = str(api_err)
        if hasattr(api_err, 'response') and api_err.response:
            try:
                error_json = api_err.response.json()
                error_message = error_json.get('error', {}).get('message', str(api_err))
            except:
                error_message = f"API Error: {str(api_err)}"
        return {
            "ok": False,
            "error": error_message
        }
    except Exception as e:
        print(f"[ERROR] Unexpected error in submit_to_google_sheets: {str(e)}")
        return {
            "ok": False,
            "error": f"Unexpected error: {str(e)}"
        }

async def send_ticket_notification(interaction: discord.Interaction, ticket_data: Dict[str, Any]):
    """Send notification to the ticket channel about a new ticket"""
    ticket_channel = bot.get_channel(TICKET_CHANNEL_ID)
    if not ticket_channel:
        print(f"[ERROR] Could not find ticket channel with ID {TICKET_CHANNEL_ID}")
        return
    
    assignee = ticket_data["assignee"]
    discord_id = ticket_data["discord_id"]
    
    # Determine who to mention based on assignee
    if assignee == "None":
        # Get the TechTool role mention only if no assignee
        tech_tool_role = discord.utils.get(interaction.guild.roles, id=TECH_TOOL_ROLE_ID)
        if tech_tool_role:
            mention = tech_tool_role.mention
        else:
            mention = f"<@&{TECH_TOOL_ROLE_ID}>"
    else:
        # Try to find the user ID from the staff members list
        mention = ""
        for member in STAFF_MEMBERS:
            if member["name"] == assignee and "user_id" in member:
                mention = f"<@{member['user_id']}>"
                break
    
    # Get the ticket number from the data or generate one as a fallback
    ticket_number = ticket_data.get("ticket_number", f"#{get_uk_time().strftime('%Y%m%d%H%M')}")
    
    # Use the ticket link from column AH if available, otherwise use the Google Sheet link
    ticket_link = ticket_data.get("ticket_link")
    if ticket_link:
        task_url = ticket_link
    else:
        task_url = ticket_data.get("task_url", f"https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit")
    
    # Get display name (already set when submitting to sheets)
    display_name = ticket_data["display_name"]
    
    # Format message according to requirements
    ticket_type = ticket_data['ticket_type'].lower()
    ticket_name = ticket_data['name']
    description = ticket_data['description']
    priority = ticket_data['priority']
    
    # Magical emoji based on ticket type
    emoji = "🐞" if ticket_type == "bug" else "✨"
    
    # Priority emoji map
    priority_emojis = {
        "Urgent": "⚡",
        "High": "🔥",
        "Medium": "✨",
        "Low": "🌱"
    }
    priority_emoji = priority_emojis.get(priority, "✨")
    
    # Create a header that includes a mention only if needed
    header = f"⚡ **ATTENTION WIZARDS" 
    if mention:
        header += f" {mention}"
    header += "!** ⚡"
    
    notification_message = (
        f"{header}\n\n"
        f"A new magical {ticket_type} scroll has appeared from {display_name}! {emoji}\n"
        f"**Scroll Number** : [{ticket_number}]({task_url})\n"
        f"**Spell Name** : {ticket_name}\n"
        f"**Magical Details** : {description}\n"
        f"**Power Level** : {priority_emoji} {priority}"
    )
    
    # Send the new format message
    await ticket_channel.send(notification_message)
    
    # Also create the traditional embed for additional details (optional)
    embed = discord.Embed(
        title=f"Additional Magical Details for Scroll #{ticket_number}",
        color=get_priority_color(priority),
        timestamp=get_uk_time(),
        url=task_url  # This is the URL for the embed title - ensures it uses the ticket_link if available
    )
    
    embed.add_field(name="Assigned Wizard", value=assignee, inline=True)
    embed.add_field(name="Requested By", value=display_name, inline=True)
    
    if ticket_data['link']:
        # If there's a link field, format it as "LINK" (as shown in your image)
        embed.add_field(name="Magical Reference", value=f"[{ticket_number}]({ticket_link})", inline=True)
    
    if ticket_data['required_date']:
        embed.add_field(name="Complete By", value=ticket_data['required_date'], inline=True)
    
    embed.set_footer(text=f"Conjured by Harry Botter's Ticketus Createus spell")
    
    # Only send the embed if there are additional details to share
    if ticket_data['link'] or ticket_data['required_date'] or assignee != "None":
        await ticket_channel.send(embed=embed)

# ---- UI Components ----
class TicketTypeSelect(ui.Select):
    """Dropdown for selecting ticket type"""
    def __init__(self):
        options = [
            discord.SelectOption(label="Bug", description="Report an unwanted magical creature", emoji="🐛"),
            discord.SelectOption(label="Request", description="Request a new enchantment or spell", emoji="✨")
        ]
        super().__init__(placeholder="Select Ticket Type", min_values=1, max_values=1, options=options, custom_id="ticket_type")

    async def callback(self, interaction: discord.Interaction):
        # Store the selected value
        user_id = interaction.user.id
        if user_id not in active_tickets:
            active_tickets[user_id] = {}
        active_tickets[user_id]["ticket_type"] = self.values[0]
        
        # Move to the next step - priority selection
        await interaction.response.edit_message(
            content=f"*The Sorting Hat has placed your ticket in the {self.values[0]} category!* 🧙‍♂️\n\nNow, select the magical urgency level:",
            view=PriorityView(ticket_type=self.values[0])
        )


class PrioritySelect(ui.Select):
    """Dropdown for selecting priority level"""
    def __init__(self):
        options = [
            discord.SelectOption(
                label="Urgent", 
                description="Darker than You-Know-Who / Emergency!", 
                emoji="🔴"
            ),
            discord.SelectOption(
                label="High", 
                description="Ministry of Magic Priority / Needs immediate attention", 
                emoji="🟠"
            ),
            discord.SelectOption(
                label="Medium", 
                description="Standard Priority / Professor's Assignment", 
                emoji="🟡"
            ),
            discord.SelectOption(
                label="Low", 
                description="When the Nifflers allow / Backlog", 
                emoji="🟢"
            )
        ]
        super().__init__(placeholder="Select Magical Urgency", min_values=1, max_values=1, options=options, custom_id="priority")

    async def callback(self, interaction: discord.Interaction):
        # Store the selected value
        user_id = interaction.user.id
        active_tickets[user_id]["priority"] = self.values[0]
        
        # Move to the next step - assignee selection
        await interaction.response.edit_message(
            content=f"*The Ministry of Magic has classified this as a **{self.values[0]}** priority!* ⚡\n\nNow, choose your preferred wizard or witch to handle this magical task:",
            view=AssigneeView()
        )


class AssigneeSelect(ui.Select):
    """Dropdown for selecting assignee"""
    def __init__(self):
        options = [discord.SelectOption(label="None", description="Let the spell choose a wizard", emoji="🪄")]
        
        # Add staff members from config
        for member in STAFF_MEMBERS:
            options.append(discord.SelectOption(
                label=member["name"],
                description=member.get("description", ""),
                emoji=member.get("emoji", "🧙‍♂️")
            ))
            
        super().__init__(placeholder="Select Your Magical Helper", min_values=1, max_values=1, options=options, custom_id="assignee")

    async def callback(self, interaction: discord.Interaction):
        # Store the selected value
        user_id = interaction.user.id
        active_tickets[user_id]["assignee"] = self.values[0]
        
        # Open the modal for ticket details
        ticket_type = active_tickets[user_id]["ticket_type"]
        modal = TicketDetailsModal(ticket_type)
        await interaction.response.send_modal(modal)


class TicketDetailsModal(ui.Modal):
    """Modal for entering ticket details"""
    def __init__(self, ticket_type):
        self.ticket_type = ticket_type
        title = "New Magical Mishap" if ticket_type == "Bug" else "New Enchantment Request"
        super().__init__(title=title)
        
        # Add the required components
        self.add_item(ui.TextInput(
            label="Spell Name (Ticket Title)",
            placeholder="Enter a name for your magical request",
            max_length=100,
            required=True,
            custom_id="ticket_name"
        ))
        
        self.add_item(ui.TextInput(
            label="Spell Details (Description)",
            placeholder="Describe your magical needs in detail...",
            style=discord.TextStyle.paragraph,
            max_length=500,
            required=True,
            custom_id="ticket_description"
        ))
        
        # Dynamic label based on ticket type
        link_label = "Magical Incident Location (BEB Link)" if ticket_type == "Bug" else "Relevant Spellbook Page (Link)"
        self.add_item(ui.TextInput(
            label=link_label,
            placeholder="https://...",
            required=False,
            custom_id="link"
        ))
        
        self.add_item(ui.TextInput(
            label="Required by Date (DD/MM/YYYY)",
            placeholder="When should this spell be cast by? (Leave blank if flexible)",
            required=False,
            custom_id="required_date"
        ))

    async def on_submit(self, interaction: discord.Interaction):
        # Immediately acknowledge the interaction
        await interaction.response.defer(ephemeral=True)
        
        user_id = interaction.user.id
        discord_id = str(user_id)
        
        if user_id not in active_tickets:
            await interaction.followup.send(messages["session_timeout"], ephemeral=True)
            return
        
        # Get existing ticket data
        ticket_data = active_tickets[user_id]
        
        # Add form data
        ticket_data["name"] = self.children[0].value
        ticket_data["description"] = self.children[1].value
        ticket_data["link"] = self.children[2].value
        ticket_data["required_date"] = self.children[3].value
        ticket_data["requested_by"] = interaction.user.name
        ticket_data["discord_id"] = discord_id
        
        # Get mapped display name
        display_name = USER_MAPPINGS.get(discord_id, interaction.user.name)
        ticket_data["display_name"] = display_name
        
        print(f"[DEBUG] User {discord_id} mapped to display name: {display_name}")
        
        # Submit to Google Sheets
        try:
            result = await submit_to_google_sheets(ticket_data)
            
            if result.get("ok"):
                # Get the task URL, prioritizing the ticket_link if available
                if ticket_data.get("ticket_link"):
                    task_url = ticket_data["ticket_link"]
                else:
                    task_url = result.get('task_url', 'N/A')
                
                ticket_data["task_url"] = task_url
                
                # Format the success message with a hyperlink
                success_message = messages["task_creation_success"].format(task_url=task_url)
                if "{task_url}" in success_message:
                    success_message = success_message.replace(
                        "{task_url}", 
                        f"[track its progress here]({task_url})"
                    )
                
                # Send success message
                await interaction.followup.send(success_message, ephemeral=True)
                
                # Send thank you message after a short delay
                await asyncio.sleep(1)
                await interaction.followup.send(
                    messages["thank_you"],
                    ephemeral=True
                )
                
                # Send notification to the ticket channel
                await send_ticket_notification(interaction, ticket_data)
            else:
                await interaction.followup.send(
                    f"{messages['sheet_error']}\n\nError details: {result.get('error', 'Unknown magical mishap')}",
                    ephemeral=True
                )
        except Exception as e:
            await interaction.followup.send(
                f"{messages['sheet_error']}\n\nError details: {str(e)}",
                ephemeral=True
            )
        
        # Clean up
        del active_tickets[user_id]


# ----- UI Views -----
class TicketTypeView(ui.View):
    """View for ticket type selection"""
    def __init__(self):
        super().__init__(timeout=None)
        self.add_item(TicketTypeSelect())
        
    # Add a stop button
    @ui.button(label="Cancel", style=discord.ButtonStyle.danger, custom_id="cancel_ticket")
    async def cancel_button(self, interaction: discord.Interaction, button: ui.Button):
        user_id = interaction.user.id
        if user_id in active_tickets:
            del active_tickets[user_id]
        await interaction.response.edit_message(
            content=messages["stop_message"],
            view=None  # Remove all buttons
        )


class PriorityView(ui.View):
    """View for priority selection"""
    def __init__(self, ticket_type):
        super().__init__(timeout=None)
        self.ticket_type = ticket_type
        self.add_item(PrioritySelect())
        
    @ui.button(label="← Back to Sorting Hat", style=discord.ButtonStyle.secondary, custom_id="back_to_type")
    async def back_button(self, interaction: discord.Interaction, button: ui.Button):
        await interaction.response.edit_message(
            content="Which magical category does your request belong to?",
            view=TicketTypeView()
        )
        
    @ui.button(label="Cancel", style=discord.ButtonStyle.danger, custom_id="cancel_priority")
    async def cancel_button(self, interaction: discord.Interaction, button: ui.Button):
        user_id = interaction.user.id
        if user_id in active_tickets:
            del active_tickets[user_id]
        await interaction.response.edit_message(
            content=messages["stop_message"],
            view=None  # Remove all buttons
        )


class AssigneeView(ui.View):
    """View for assignee selection"""
    def __init__(self):
        super().__init__(timeout=None)
        self.add_item(AssigneeSelect())
        
    @ui.button(label="← Back to Magical Priority", style=discord.ButtonStyle.secondary, custom_id="back_to_priority")
    async def back_button(self, interaction: discord.Interaction, button: ui.Button):
        user_id = interaction.user.id
        ticket_type = active_tickets[user_id]["ticket_type"]
        
        await interaction.response.edit_message(
            content=f"*Let's reconsider the urgency of this {ticket_type} spell...* 🔮\nSelect the magical urgency level:",
            view=PriorityView(ticket_type=ticket_type)
        )
        
    @ui.button(label="Cancel", style=discord.ButtonStyle.danger, custom_id="cancel_assignee")
    async def cancel_button(self, interaction: discord.Interaction, button: ui.Button):
        user_id = interaction.user.id
        if user_id in active_tickets:
            del active_tickets[user_id]
        await interaction.response.edit_message(
            content=messages["stop_message"],
            view=None  # Remove all buttons
        )


class MainView(ui.View):
    """Main view with Create Ticket button"""
    def __init__(self):
        super().__init__(timeout=None)
    
    @ui.button(label="Cast Ticket Spell", style=discord.ButtonStyle.primary, emoji="🪄", custom_id="create_ticket")
    async def create_ticket(self, interaction: discord.Interaction, button: ui.Button):
        # Check for active session
        user_id = interaction.user.id
        if user_id in active_tickets:
            await interaction.response.send_message(
                messages["active_session"],
                ephemeral=True
            )
            return
            
        # Check for cooldown
        if is_on_cooldown(user_id):
            minutes, seconds = get_cooldown_remaining(user_id)
            await interaction.response.send_message(
                messages["cooldown_message"].format(minutes=minutes, seconds=seconds),
                ephemeral=True
            )
            return
            
        await interaction.response.send_message(
            "Welcome to the magical world of ticketing! 🧙‍♂️✨\nWhich magical category does your request belong to?",
            view=TicketTypeView(),
            ephemeral=True
        )


# ----- Bot Events -----
@bot.event
async def on_ready():
    """Bot is ready and connected to Discord"""
    print(f"[READY] Logged in as {bot.user} (ID: {bot.user.id})")
    
    # Start the background task to check for status changes
    check_ticket_statuses.start()
    
    # Post initial embed with button in the harry-botter channel
    channel = bot.get_channel(CHANNEL_ID)
    if channel:
        try:
            # Check if we already have a message with our button
            async for message in channel.history(limit=50):
                if message.author == bot.user and any(component.custom_id == "create_ticket" for component in message.components if hasattr(component, "children") for component in component.children if hasattr(component, "custom_id")):
                    print("[INFO] Found existing button message, skipping creation")
                    return
            
            embed = discord.Embed(
                title="🧙‍♂️ Hi, I'm Harry Botter – Wizard of Tech Support!",
                description="Need help with a troublesome bug or want to request a new feature? Cast your ticket spell and our magical team will assist you faster than you can say 'Expecto Patronum'!",
                color=0x9c59b6
            )
            embed.add_field(
                name="How To Use Magic", 
                value="🪄 Click the magical button below\n✨ Follow the enchanted steps\n🔮 Our wizards will attend to your request", 
                inline=False
            )
            embed.set_footer(text="Developed with love and a sprinkle of magical code dust")
            
            await channel.send(
                "✨ *Welcome to the Chamber of Tech Support* ✨\nWhere your issues vanish with a wave of our wand! 🪄",
                embed=embed,
                view=MainView()
            )
            print("[INFO] Created new button message")
        except discord.HTTPException as e:
            print(f"[ERROR] Failed to send embed: {e}")
    else:
        print("[WARNING] Bot could not find the specified CHANNEL_ID.")

@tasks.loop(seconds=60)
async def check_ticket_statuses():
    """Background task to check for ticket status changes"""
    try:
        sheet = get_sheet()
        
        # Get all rows
        all_values = sheet.get_all_values()
        
        # Skip header row
        if len(all_values) <= 1:
            return
        
        # This will store the last status we notified a user about
        status_cache_file = os.path.join(current_dir, 'status_cache.json')
        status_cache = {}
        
        # Load status cache if it exists
        if os.path.exists(status_cache_file):
            try:
                with open(status_cache_file, 'r', encoding='utf-8') as f:
                    content = f.read().strip()
                    if content:  # Make sure file is not empty
                        status_cache = json.loads(content)
            except (json.JSONDecodeError, Exception) as e:
                print(f"[WARNING] Could not parse status cache file: {e}")
                # Create backup of corrupted file
                try:
                    backup_file = f"{status_cache_file}.bak.{int(time.time())}"
                    if os.path.exists(status_cache_file):
                        os.rename(status_cache_file, backup_file)
                        print(f"[INFO] Backed up corrupted cache to {backup_file}")
                except Exception as backup_error:
                    print(f"[ERROR] Failed to backup cache file: {backup_error}")
        
        # Load notification history to prevent duplicate notifications
        notification_history_file = os.path.join(current_dir, 'notification_history.json')
        notification_history = {}
        
        # Load notification history if it exists
        if os.path.exists(notification_history_file):
            try:
                with open(notification_history_file, 'r', encoding='utf-8') as f:
                    content = f.read().strip()
                    if content:  # Make sure file is not empty
                        notification_history = json.loads(content)
            except Exception as e:
                print(f"[WARNING] Could not parse notification history file: {e}")
        
        # Clean up old entries in notification history (older than 7 days)
        current_time = time.time()
        cutoff_time = current_time - (7 * 24 * 60 * 60)  # 7 days ago
        keys_to_remove = []
        
        for key, timestamp in notification_history.items():
            if timestamp < cutoff_time:
                keys_to_remove.append(key)
                
        for key in keys_to_remove:
            if key in notification_history:
                del notification_history[key]
                print(f"[INFO] Removed old notification from history: {key}")
        
        # For tracking new statuses
        updated_cache = {}
        sent_notifications = set()  # Track notifications sent in this cycle
        
        # Track newly created tickets - don't notify for initial "Open" status
        timestamp_now = get_uk_time()
        
        for row_idx, row in enumerate(all_values[1:], 2):  # Start from row 2 (1-indexed in sheets)
            # Ensure row has enough elements
            row_length = len(row)
            if row_length < 33:  # Need at least column AG (index 32)
                continue
                
            # Get ticket data
            ticket_number = row[0] if row_length > 0 else ""        # Column A (ticket number)
            timestamp_str = row[1] if row_length > 1 else ""        # Column B (timestamp)
            task_name = row[2] if row_length > 2 else ""            # Column C (task_name)
            requested_by = row[4] if row_length > 4 else ""         # Column E (requested_by)
            status = row[8] if row_length > 8 else ""               # Column I (status)
            discord_id = row[32] if row_length > 32 else ""         # Column AG (discord_id)
            # Get ticket link if available (column AH)
            ticket_link = row[33] if row_length > 33 else ""        # Column AH (ticket_link)
            
            # Skip if no discord ID or status
            if not discord_id or not status:
                continue
            
            # Create a unique key for this ticket
            ticket_key = f"{discord_id}_{row_idx}"
            
            # Always store current status for next time
            updated_cache[ticket_key] = status
            
            # Check if we've sent a notification for this exact ticket+status recently
            notification_key = f"{ticket_key}_{status}"
            if notification_key in sent_notifications:
                continue
                
            # Skip notifications for newly created tickets with "Open" status
            if status == "Open":
                # Check if this is a newly created ticket
                try:
                    # Try to parse the timestamp from UK format
                    uk_tz = pytz.timezone('Europe/London')
                    
                    try:
                        ticket_time = datetime.datetime.strptime(timestamp_str, "%Y-%m-%d %H:%M:%S")
                        ticket_time = uk_tz.localize(ticket_time)
                    except ValueError:
                        # Try alternate formats if needed
                        try:
                            ticket_time = datetime.datetime.strptime(timestamp_str, "%Y-%m-%d %H:%M:%S %z")
                        except ValueError:
                            try:
                                ticket_time = datetime.datetime.strptime(timestamp_str, "%d/%m/%Y %H:%M:%S")
                                ticket_time = uk_tz.localize(ticket_time)
                            except ValueError:
                                # If all parsing fails, assume it's a new ticket
                                updated_cache[ticket_key] = status
                                continue
                    
                    time_diff = (timestamp_now - ticket_time).total_seconds()
                    
                    # If ticket was created less than 5 minutes ago, skip notification
                    if time_diff < 300:
                        continue
                except (ValueError, TypeError) as e:
                    # If timestamp parsing fails, log and continue
                    print(f"[WARNING] Could not parse timestamp '{timestamp_str}': {e}")
            
            # Check if status has changed since last check
            previous_status = status_cache.get(ticket_key)
            
            if previous_status:
                # Skip if status hasn't changed
                if previous_status == status:
                    continue
                
                # Skip if both the previous and current status is "Open"
                if previous_status == "Open" and status == "Open":
                    continue
                    
                # Skip if current status is "Completed" and we've already notified about it
                if status == "Completed" and previous_status == "Completed":
                    continue
                    
                # If we've already notified about a "Completed" status, don't notify again
                # even if the sheet somehow shows a different value temporarily
                if previous_status == "Completed":
                    # Update back to completed in our cache, but don't send notification
                    updated_cache[ticket_key] = "Completed"
                    continue
            else:
                # For first-time entries, if status is "Open" or "Completed", just store without notification
                if status == "Open" or status == "Completed":
                    continue
            
            # Create a unique notification key for this specific ticket status
            persistent_notification_key = f"{ticket_number}_{status}"
            
            # Check if we've already sent a notification for this exact status change before
            if persistent_notification_key in notification_history:
                print(f"[INFO] Skipping duplicate notification for ticket {ticket_number} with status '{status}'")
                continue
                
            # Get real name if available
            display_name = USER_MAPPINGS.get(discord_id, requested_by)
            
            # Notify the user about the status change
            try:
                user = await bot.fetch_user(int(discord_id))
                if user:
                    # Include ticket number in the notification
                    ticket_identifier = ticket_number if ticket_number else task_name
                    
                    # Show the status transition in a professional way
                    status_transition = f"{previous_status or 'New'} → {status}"
                    
                    # Create a message with hyperlinked ticket number if we have a ticket link
                    if ticket_link:
                        dm_message = (
                            f"Hi {display_name},\n\n"
                            f"Your scroll #{ticket_identifier} '{task_name}' status has been updated: "
                            f"{status_transition}.\n\n"
                            f"[View ticket details]({ticket_link})"
                        )
                    else:
                        dm_message = (
                            f"Hi {display_name},\n\n"
                            f"Your scroll #{ticket_identifier} '{task_name}' status has been updated: "
                            f"{status_transition}."
                        )
                    
                    await user.send(dm_message)
                    print(f"[INFO] Notified user {discord_id} ({display_name}) about status change to '{status}' for ticket #{ticket_identifier}")
                    
                    # Mark that we've sent this notification
                    sent_notifications.add(notification_key)
                    
                    # Also add to persistent notification history with current timestamp
                    notification_history[persistent_notification_key] = current_time
            except Exception as e:
                print(f"[ERROR] Failed to notify user {discord_id}: {str(e)}")
        
        # Save the updated notification history
        try:
            with open(notification_history_file, 'w', encoding='utf-8') as f:
                json.dump(notification_history, f)
        except Exception as e:
            print(f"[ERROR] Failed to save notification history: {e}")
        
        # Clean up old completed tickets (older than 30 days)
        if len(status_cache) > 100:  # Only bother cleaning if cache is getting large
            thirty_days_ago = time.time() - (30 * 24 * 60 * 60)
            completed_time_file = os.path.join(current_dir, 'completed_tickets.json')
            completed_times = {}
            
            # Load completed times if file exists
            if os.path.exists(completed_time_file):
                try:
                    with open(completed_time_file, 'r', encoding='utf-8') as f:
                        content = f.read().strip()
                        if content:
                            completed_times = json.loads(content)
                except Exception:
                    pass
            
            # Mark current time for newly completed tickets
            for key, status in status_cache.items():
                if status == "Completed" and key not in completed_times:
                    completed_times[key] = time.time()
            
            # Remove old completed tickets from cache
            keys_to_remove = []
            for key, completed_time in completed_times.items():
                if completed_time < thirty_days_ago:
                    keys_to_remove.append(key)
            
            for key in keys_to_remove:
                if key in status_cache:
                    del status_cache[key]
                if key in completed_times:
                    del completed_times[key]
            
            # Save updated completed times
            try:
                with open(completed_time_file, 'w', encoding='utf-8') as f:
                    json.dump(completed_times, f)
            except Exception as e:
                print(f"[ERROR] Failed to save completed times: {e}")
        
        # Save the updated status cache - only after successful processing
        try:
            with open(status_cache_file, 'w', encoding='utf-8') as f:
                json.dump(updated_cache, f)
        except Exception as e:
            print(f"[ERROR] Failed to save status cache: {e}")
            
    except Exception as e:
        print(f"[ERROR] Error checking ticket statuses: {str(e)}")
        import traceback
        traceback.print_exc()

@check_ticket_statuses.before_loop
async def before_check_statuses():
    """Wait until the bot is ready before starting the task"""
    await bot.wait_until_ready()


# Function to test Google Sheets connection
def test_sheets_connection():
    """Test the connection to Google Sheets"""
    try:
        print("[TEST] Setting up credentials...")
        scopes = ["https://www.googleapis.com/auth/spreadsheets"]

        print(f"[TEST] Looking for credentials at: {SERVICE_ACCOUNT_FILE}")
        print(f"[TEST] File exists: {os.path.exists(SERVICE_ACCOUNT_FILE)}")

        if not os.path.exists(SERVICE_ACCOUNT_FILE):
            print(f"[TEST] ERROR: Service account file not found at {SERVICE_ACCOUNT_FILE}")
            return False

        creds = Credentials.from_service_account_file(SERVICE_ACCOUNT_FILE, scopes=scopes)
        print("[TEST] Credentials loaded successfully")

        client = gspread.authorize(creds)
        print("[TEST] Authorization successful")

        if not SPREADSHEET_ID:
            print("[TEST] ERROR: SPREADSHEET_ID not set in environment variables")
            return False

        print(f"[TEST] Attempting to open spreadsheet with ID: {SPREADSHEET_ID}")
        sheet = client.open_by_key(SPREADSHEET_ID)
        print(f"[TEST] Found spreadsheet: {sheet.title}")

        print(f"[TEST] Attempting to access worksheet: {WORKSHEET_NAME}")
        worksheet = sheet.worksheet(WORKSHEET_NAME)
        print(f"[TEST] Accessed worksheet: {worksheet.title}")

        # Just read a single cell for a smoke test
        value = worksheet.acell('A1').value
        print(f"[TEST] Successfully read cell A1: {value}")

        # Show the link that will be used
        print(f"[TEST] Task URL format: https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit#gid={WORKSHEET_GID}")
        return True

    except Exception as e:
        print(f"[TEST] Error: {str(e)}")
        print(f"[TEST] Error type: {type(e)}")
        return False


@bot.command(name="version")
async def show_version(ctx):
    """Show the current bot version"""
    await ctx.send(f"Harry Botter v{__version__} 🪄")

# Run the bot
if __name__ == "__main__":
    print("\n=== Testing Google Sheets Connection ===")
    test_sheets_connection()
    print("======================================\n")
    bot.run(DISCORD_TOKEN)