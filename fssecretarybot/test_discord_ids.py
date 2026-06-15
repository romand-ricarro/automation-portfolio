# test_discord_ids.py
from discord_ids import get_discord_ids

if __name__ == "__main__":
    users = get_discord_ids()
    for user in users:
        print(f"User ID: {user['id']}, Name: {user['name']}")
