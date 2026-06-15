# main.py
import os
import discord
from discord.ext import commands, tasks
from dotenv import load_dotenv
from logger import setup_logger
from discord_ids import get_discord_ids
from send_announcements import send_announcements
from send_training_messages import send_training_messages
from reaction_handler import handle_reaction

import asyncio
from aiohttp import web

load_dotenv()
logger = setup_logger()

# Discord Bot Setup
intents = discord.Intents.default()
intents.members = True
intents.messages = True
intents.reactions = True
intents.message_content = True  # Required for certain message content access

bot = commands.Bot(command_prefix='!', intents=intents)

# HTTP Server Setup
API_KEY = os.getenv("ANNOUNCEMENT_API_KEY")
HOST = os.getenv("HTTP_SERVER_HOST", "0.0.0.0")
PORT = int(os.getenv("HTTP_SERVER_PORT", "8080"))

async def handle_send_announcement(request):
    """
    HTTP handler to receive announcement data and trigger sending DMs.
    Expects a JSON payload with the announcement details.
    """
    # Authenticate the request
    auth_header = request.headers.get('Authorization')
    if auth_header != f"Bearer {API_KEY}":
        logger.warning("Unauthorized access attempt.")
        return web.Response(status=401, text="Unauthorized")

    try:
        data = await request.json()
        title = data.get('title')
        message = data.get('message')
        priority = data.get('priority', 'Normal')  # Optional field

        if not title or not message:
            logger.error("Missing 'title' or 'message' in the request payload.")
            return web.Response(status=400, text="Missing 'title' or 'message'.")

        # Log the received announcement
        logger.info(f"Received announcement: {title} - {message}")

        # Trigger the announcement sending
        asyncio.create_task(send_announcements(bot, title, message, priority))

        return web.Response(status=200, text="Announcement sent successfully.")

    except Exception as e:
        logger.error(f"Error processing announcement request: {e}")
        return web.Response(status=500, text="Internal Server Error")

def init_app():
    app = web.Application()
    app.router.add_post('/send_announcement', handle_send_announcement)
    return app

@bot.event
async def on_ready():
    logger.info(f'Logged in as {bot.user.name} - {bot.user.id}')
    # Start the HTTP server in a separate task
    app = init_app()
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, HOST, PORT)
    await site.start()
    logger.info(f"HTTP server running on {HOST}:{PORT}")
    # Start other scheduled tasks if any
    # announce_announcements.start()
    # send_training_messages_task.start()

@bot.event
async def on_reaction_add(reaction, user):
    # Only handle reactions in DMs
    if reaction.message.channel.type != discord.ChannelType.private:
        return
    
    await handle_reaction(reaction, user)

# Optional: Commands to manually trigger announcements or training messages
@bot.command(name='send_announcements')
@commands.has_permissions(administrator=True)
async def manual_send_announcements(ctx):
    await send_announcements(bot)
    await ctx.send("Announcements have been sent.")

@bot.command(name='send_training')
@commands.has_permissions(administrator=True)
async def manual_send_training(ctx):
    await send_training_messages(bot)
    await ctx.send("Training messages have been sent.")

# Run the bot
bot.run(os.getenv('DISCORD_TOKEN'))
