# fetch_announcements.py
from google_sheets_client import get_gspread_client
import os

def fetch_announcements():
    client = get_gspread_client()
    sheet = client.open_by_key(os.getenv("ANNOUNCEMENT_SHEET_ID")).sheet1  # Assuming first sheet
    records = sheet.get_all_records()
    return records  # List of dictionaries
