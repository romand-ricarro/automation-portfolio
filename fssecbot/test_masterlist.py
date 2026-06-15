import gspread
from oauth2client.service_account import ServiceAccountCredentials
import logging
from config import Config

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def main():
    try:
        # Define the scope
        scope = [
            "https://spreadsheets.google.com/feeds",
            "https://www.googleapis.com/auth/drive"
        ]
        
        # Authenticate using the service account credentials
        creds = ServiceAccountCredentials.from_json_keyfile_name(Config.GOOGLE_CREDS_JSON, scope)
        client = gspread.authorize(creds)
        logger.info("Successfully connected to Google Sheets client.")
        
        # Open the Google Sheet by its ID
        sheet = client.open_by_key(Config.MASTERLIST_SHEET_ID)
        logger.info(f"Opened Google Sheet with ID: {Config.MASTERLIST_SHEET_ID}")
        
        # Access the "Updated MasterList" worksheet
        worksheet = sheet.worksheet("Updated MasterList")
        records = worksheet.get_all_records()
        logger.info(f"Fetched {len(records)} records from Updated MasterList.")
        
        # Extract only 'team_member' and 'discord_user_id' fields
        filtered_records = []
        for record in records:
            team_member = record.get('team_member')
            discord_user_id = record.get('discord_user_id')
            if team_member and discord_user_id:
                filtered_records.append({
                    'team_member': team_member,
                    'discord_user_id': discord_user_id
                })
        
        logger.info(f"Filtered down to {len(filtered_records)} records with 'team_member' and 'discord_user_id'.")
        
        # Display the filtered records
        for idx, record in enumerate(filtered_records, start=1):
            logger.info(f"Record {idx}: Team Member: {record['team_member']}, Discord ID: {record['discord_user_id']}")
    
    except Exception as e:
        logger.error(f"An error occurred: {e}")

if __name__ == "__main__":
    main()
