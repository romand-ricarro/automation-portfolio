# send_announcements.py
from discord_ids import get_discord_ids
from logger import setup_logger

logger = setup_logger()

async def send_announcements(bot, title, message, priority='Normal'):
    """
    Sends an announcement DM to all Discord users.
    
    Args:
        bot (discord.Client): The Discord bot client.
        title (str): The title of the announcement.
        message (str): The message content.
        priority (str): Priority level of the announcement.
    """
    discord_users = get_discord_ids()
    if not discord_users:
        logger.warning("No Discord IDs found to send announcements.")
        return

    announcement_content = f"**{priority} Priority Announcement**\n**{title}**\n{message}"

    for user in discord_users:
        try:
            discord_user = await bot.fetch_user(int(user['id']))
            if discord_user:
                await discord_user.send(announcement_content)
                logger.info(f"Sent announcement to {user['name']} ({user['id']})")
        except Exception as e:
            logger.error(f"Failed to send announcement to {user['name']} ({user['id']}): {e}")
