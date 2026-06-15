# config.py
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Config:
    # Discord Configuration
    DISCORD_TOKEN = os.getenv('DISCORD_TOKEN')

    # Google Sheets Configuration
    GOOGLE_CREDS_JSON = os.getenv('GOOGLE_CREDS_JSON')
    BULLETIN_SHEET_ID = os.getenv('BULLETIN_SHEET_ID')
    MASTERLIST_SHEET_ID = os.getenv('MASTERLIST_SHEET_ID')

    # Flask Server Configuration
    HOST = os.getenv('HOST', '0.0.0.0')
    PORT = int(os.getenv('PORT', 5001))

    # Logging Configuration
    LOG_FILE = os.getenv('LOG_FILE', 'bot.log')
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO').upper()

    # Secret Token for Authentication
    SECRET_TOKEN = os.getenv('SECRET_TOKEN', 'default_secret')

    # Flask URL for Google Apps Script
    FLASK_URL = os.getenv('FLASK_URL', '')
