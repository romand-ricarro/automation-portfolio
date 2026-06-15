import discord
from discord.ext import commands
import gspread
from google.oauth2 import service_account
import datetime
import pytz
import asyncio
from dotenv import load_dotenv
import os
import json
import logging
from logging.handlers import RotatingFileHandler

# Setup logging
log_formatter = logging.Formatter('%(asctime)s %(levelname)s %(message)s')
log_file = '/var/log/discord_bot.log'

file_handler = RotatingFileHandler(log_file, maxBytes=1000000, backupCount=3)
file_handler.setFormatter(log_formatter)
file_handler.setLevel(logging.INFO)

console_handler = logging.StreamHandler()
console_handler.setFormatter(log_formatter)
console_handler.setLevel(logging.INFO)

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)
logger.addHandler(file_handler)
logger.addHandler(console_handler)

load_dotenv()  # This loads the variables from .env into the environment

# Setup Google credentials from environment variables
service_account_info_str = os.getenv('GOOGLE_APPLICATION_CREDENTIALS_JSON')
# Remove the logging of the JSON string
# logger.info(f'Service account info string from environment: {service_account_info_str}')  # Remove this line

if service_account_info_str is None:
    raise ValueError("Failed to get 'GOOGLE_APPLICATION_CREDENTIALS_JSON' from environment variables")

try:
    service_account_info = json.loads(service_account_info_str)
except json.JSONDecodeError as e:
    logger.error(f'JSON decode error: {e}')
    raise

# Google Sheets setup using the credentials
scope = [
    'https://www.googleapis.com/auth/spreadsheets',
    "https://www.googleapis.com/auth/drive"
]

# Load credentials and create client with the defined scopes
creds = service_account.Credentials.from_service_account_info(service_account_info, scopes=scope)
client = gspread.authorize(creds)

spreadsheet = client.open("Automatic Check-ins - MLA")  # Open the spreadsheet by its title
sheet = spreadsheet.sheet1  # Access a specific worksheet

# Define intents for the Discord bot
intents = discord.Intents.default()
intents.messages = True
intents.reactions = True
intents.guilds = True

# Initialize bot with intents
bot = commands.Bot(command_prefix='!', intents=intents)

# Set to keep track of users who have been sent the form
users_who_received_form = set()

# Variable to store the ID of the message to react to
check_in_message_id = None

@bot.event
async def on_ready():
    try:
        print(f'Logged in as {bot.user.name}')
        logger.info(f'Logged in as {bot.user.name}')
        uk_timezone = pytz.timezone('Europe/London')
        current_datetime = datetime.datetime.now(uk_timezone)
        print(f'Current datetime in UK timezone: {current_datetime}')  # Print to console
        logger.info(f'Current datetime in UK timezone: {current_datetime}')  # Log to logger
        print(f'Current date: {current_datetime.date()}')
        print(f'Current ISO calendar: {current_datetime.isocalendar()}')
        current_week_number = current_datetime.isocalendar()[1]  # ISO calendar week number
        logger.info(f'Current week number: {current_week_number}')
        channel = bot.get_channel(1237686755654631447)  # Replace with the ID of your channel
        global check_in_message_id  # Declare the global variable
        await channel.send(f"Happy Monday @everyone! This is the link for the Check-ins for **week {current_week_number}**")
        embed = discord.Embed(
            title="Check-in Here!",
            description="Please click the green checkbox below to check-in.",
            color=discord.Color.green()
        )
        message = await channel.send(embed=embed)
        check_in_message_id = message.id  # Store the message ID
        await message.add_reaction('✅')  # Add a checkmark reaction
    except Exception as e:
        logger.error(f"Error in on_ready: {e}")

@bot.event
async def on_raw_reaction_add(payload):
    global check_in_message_id
    try:
        # Ignore bot's own reactions
        if payload.user_id == bot.user.id:
            return
        
        # Check the reaction is on the correct message
        if payload.message_id == check_in_message_id:
            channel = bot.get_channel(payload.channel_id)
            user = await bot.fetch_user(payload.user_id)  # Changed to fetch_user with await
            if user.id not in users_who_received_form:
                users_who_received_form.add(user.id)
                await send_form(user)
    except Exception as e:
        logger.error(f"Error in on_raw_reaction_add: {e}")

async def send_form(user):
    try:
        # DM the user with the form questions
        dm_channel = await user.create_dm()
        # Get the current week number based on UK Timezone
        uk_timezone = pytz.timezone('Europe/London')
        current_datetime = datetime.datetime.now(uk_timezone)
        print(f'Current datetime in UK timezone (send_form): {current_datetime}')  # Print to console
        logger.info(f'Current datetime in UK timezone (send_form): {current_datetime}')  # Log to logger
        print(f'Current date (send_form): {current_datetime.date()}')
        print(f'Current ISO calendar (send_form): {current_datetime.isocalendar()}')
        current_week_number = current_datetime.isocalendar()[1]  # ISO calendar week number
        logger.info(f'Current week number (send_form): {current_week_number}')
        # Send introductory message
        intro_message = f"Welcome to the weekly check-ins. This is your check-in for **week {current_week_number}**."
        await dm_channel.send(intro_message)
        # Questions to ask
        questions = ["Name", "Emoji Snapshot 📸: This week, my mood in emojis is...",
                     "Target Triumphs 🎯: This week, my goal is...",
                     "Epic Encounters ⚔️: The biggest challenge I'm tackling this week is...",
                     "Victory Highlights 🏆: My key achievements this week include..."]
        answers = []

        for question in questions:
            await dm_channel.send(question)
            def check(m):
                return m.author == user and isinstance(m.channel, discord.DMChannel)
            msg = await bot.wait_for('message', check=check)
            answers.append(msg.content)

        # Append the current week number to answers before recording them
        answers.append(current_week_number)
        # Append answers to Google Sheet
        sheet.append_row(answers)
        # Send confirmation message to the user
        await dm_channel.send("Your responses have been recorded, please check the **weekly-checkins** channel. Thank you!")
        # Send the collected data to the specific output channel
        formatted_response = "\n".join(f"{q}: **{a}**" for q, a in zip(questions, answers))
        output_channel = bot.get_channel(1237686342410965063)  # Replace with your output channel ID
        await output_channel.send(f"{user.mention}\n{formatted_response}\n\n**Please show emojis of support! 🎉 🥳**")
    except Exception as e:
        logger.error(f"Error sending form to {user}: {e}")
        await user.send("There was an error recording your responses. Please try again later.")

token = os.getenv('DISCORD_BOT_TOKEN')
bot.run(token)
