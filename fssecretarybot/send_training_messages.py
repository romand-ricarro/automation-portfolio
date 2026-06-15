# send_training_messages.py
from fetch_qualified_users import fetch_qualified_users
from discord_ids import get_discord_ids

async def send_training_messages(client):
    qualified_users = fetch_qualified_users()
    discord_ids = get_discord_ids()
    
    for user_data in qualified_users:
        user_id = user_data['DiscordID']  # Adjust key as per your sheet
        try:
            discord_user = await client.fetch_user(user_id)
            message_content = f"Hello {user_data.get('Name', 'User')}, you are qualified for training! " \
                              f"Please react with ✅ to accept or 🚫 to reject the training opportunity."
            sent_message = await discord_user.send(message_content)
            # Add reactions for user to click
            await sent_message.add_reaction('✅')
            await sent_message.add_reaction('🚫')
            # Optionally, store message ID and user mapping in a database for tracking
        except Exception as e:
            print(f"Failed to send training message to {user_id}: {e}")
