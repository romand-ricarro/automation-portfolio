# reaction_handler.py
from google_sheets_client import get_gspread_client
import os

def get_column_letter(col_number):
    """Convert a column number to a letter (e.g., 1 -> A)."""
    string = ""
    while col_number > 0:
        col_number, remainder = divmod(col_number - 1, 26)
        string = chr(65 + remainder) + string
    return string

async def handle_reaction(reaction, user):
    if user.bot:
        return  # Ignore bot reactions

    emoji = reaction.emoji
    if emoji not in ['✅', '🚫']:
        return  # Ignore other emojis

    # Assuming the user is reacting in DMs
    channel = reaction.message.channel
    if channel.type != channel.type == channel.DM:
        return  # Only handle DMs

    user_id = user.id

    # Open the training sheet
    client = get_gspread_client()
    sheet = client.open_by_key(os.getenv("TRAINING_SHEET_ID")).sheet1  # Adjust if necessary

    records = sheet.get_all_records()
    headers = sheet.row_values(1)

    # Find the row corresponding to the user
    row_number = None
    for idx, record in enumerate(records, start=2):  # Start at 2 to account for header
        if str(record.get('DiscordID', '')).strip() == str(user_id):
            row_number = idx
            break

    if row_number is None:
        print(f"User ID {user_id} not found in Training Sheet.")
        return

    # Determine the new status based on the reaction
    if emoji == '✅':
        new_status = 'Accept'
    elif emoji == '🚫':
        new_status = 'Reject'
    else:
        return

    # Update the 'Accept Training' column (assuming this column exists)
    try:
        status_col = headers.index('Accept Training') + 1  # gspread is 1-indexed
    except ValueError:
        print("Column 'Accept Training' not found.")
        return

    cell = f"{get_column_letter(status_col)}{row_number}"
    sheet.update_acell(cell, new_status)
    print(f"Updated user {user_id} status to {new_status}")
