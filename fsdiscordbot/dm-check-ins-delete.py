import os
import discord
import asyncio

intents = discord.Intents.default()
intents.messages = True
intents.message_content = True
client = discord.Client(intents=intents)

@client.event
async def on_ready():
    print(f'Logged in as {client.user}!')
    target_user_id = '519509136887513108'  # Ensure this is the correct user ID
    try:
        user = await client.fetch_user(target_user_id)
        dm_channel = await user.create_dm()
        if dm_channel:
            print(f"Accessing DMs with {user.name}")
            async for message in dm_channel.history(limit=100):  # Adjust the limit as needed
                if message.author == client.user:
                    print(f"Attempting to delete: {message.content[:50]}...")  # Preview part of the message content
                    await message.delete()
                    print("Message deleted successfully.")
                    await asyncio.sleep(1.0)  # Sleep to avoid rate limits
                else:
                    print("Message not sent by bot, skipping...")
        else:
            print("Failed to access DM channel with the specified user.")
    except discord.HTTPException as e:
        print(f"HTTPException: {e}")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")

client.run(os.environ['DISCORD_BOT_TOKEN'])  # Set DISCORD_BOT_TOKEN in your .env