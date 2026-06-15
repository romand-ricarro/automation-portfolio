# google_sheets_client.py
import os
import gspread
from oauth2client.service_account import ServiceAccountCredentials
from dotenv import load_dotenv

load_dotenv()

def get_gspread_client():
    credentials_json = os.getenv("GOOGLE_CREDENTIALS_JSON")
    if not credentials_json:
        raise ValueError("GOOGLE_CREDENTIALS_JSON not set in .env")
    
    # Construct the full path to the credentials JSON file
    credentials_json_path = os.path.join(os.path.dirname(__file__), credentials_json)
    
    if not os.path.isfile(credentials_json_path):
        raise FileNotFoundError(f"Google credentials JSON file not found at {credentials_json_path}")
    
    scope = [
        'https://spreadsheets.google.com/feeds',
        'https://www.googleapis.com/auth/drive'
    ]
    
    credentials = ServiceAccountCredentials.from_json_keyfile_name(credentials_json_path, scope)
    client = gspread.authorize(credentials)
    return client
