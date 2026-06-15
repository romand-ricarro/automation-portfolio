# test_google_sheets_client.py
from google_sheets_client import get_gspread_client
from discord_ids import get_discord_ids

if __name__ == "__main__":
    try:
        client = get_gspread_client()
        discord_ids = get_discord_ids()
        print("Successfully fetched Discord IDs:")
        for user in discord_ids:
            print(f"User ID: {user['id']}, Name: {user['name']}")
    except Exception as e:
        print(f"Error: {e}")
