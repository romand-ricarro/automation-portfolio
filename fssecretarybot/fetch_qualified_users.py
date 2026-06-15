# fetch_qualified_users.py
from google_sheets_client import get_gspread_client
import os

def fetch_qualified_users():
    client = get_gspread_client()
    sheet = client.open_by_key(os.getenv("TRAINING_SHEET_ID")).sheet1  # Assuming first sheet
    records = sheet.get_all_records()
    # Filter users marked as qualified (assuming a column 'Qualified' with value 'Yes')
    qualified_users = [record for record in records if record.get('Qualified', '').lower() == 'yes']
    return qualified_users
