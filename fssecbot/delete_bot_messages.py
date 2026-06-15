import discord
import logging
from config_del import Config

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Define the bot
intents = discord.Intents.default()
intents.messages = True
intents.guilds = False  # Not required for DMs
intents.dm_messages = True  # Ensure the bot can read DMs

bot = discord.Client(intents=intents)


@bot.event
async def on_ready():
    logger.info(f"Logged in as {bot.user.name} - {bot.user.id}")
    logger.info("Starting to delete messages from the bot.")

    # Fetch the user's DM channel with the bot
    user_id = Config.USER_ID  # Replace with your Discord User ID
    user = await bot.fetch_user(user_id)

    if not user:
        logger.error(f"Could not find user with ID {user_id}.")
        await bot.close()
        return

    dm_channel = await user.create_dm()
    async for message in dm_channel.history(limit=None):  # Fetch all messages
        if message.author.id == bot.user.id:  # Check if the bot sent the message
            try:
                await message.delete()
                logger.info(f"Deleted message: {message.content}")
            except Exception as e:
                logger.error(f"Failed to delete message: {message.content}. Error: {e}")

    logger.info("Finished deleting messages.")
    await bot.close()


if __name__ == "__main__":
    bot.run(Config.DISCORD_TOKEN)
