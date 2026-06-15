import gspread
from oauth2client.service_account import ServiceAccountCredentials
import logging
from config import Config

logger = logging.getLogger(__name__)

class GoogleSheetsClient:
    def __init__(self):
        try:
            # Define the scope
            scope = [
                "https://spreadsheets.google.com/feeds",
                "https://www.googleapis.com/auth/drive"
            ]
            
            # Authenticate using the service account credentials
            creds = ServiceAccountCredentials.from_json_keyfile_name(Config.GOOGLE_CREDS_JSON, scope)
            self.client = gspread.authorize(creds)
            logger.info("Successfully connected to Google Sheets client.")
            
            # Open the Bulletin Board Google Sheet by its ID
            self.bulletin_sheet = self.client.open_by_key(Config.BULLETIN_SHEET_ID)
            logger.info(f"Opened Bulletin Board Google Sheet with ID: {Config.BULLETIN_SHEET_ID}")
            
            # Open the Updated MasterList Google Sheet by its ID
            self.masterlist_sheet = self.client.open_by_key(Config.MASTERLIST_SHEET_ID)
            logger.info(f"Opened Updated MasterList Google Sheet with ID: {Config.MASTERLIST_SHEET_ID}")
        except Exception as e:
            logger.error(f"Failed to initialize GoogleSheetsClient: {e}")
            raise e  # Re-raise the exception after logging

    def get_bulletin_board(self):
        try:
            worksheet = self.bulletin_sheet.worksheet("📌Bulletin Board")
            total_rows = worksheet.row_count
            logger.debug(f"📌Bulletin Board worksheet has {total_rows} rows.")

            if total_rows < 1:
                logger.error(f"📌Bulletin Board worksheet has only {total_rows} rows. Expected at least 1 row for headers.")
                return []
            
            # Use get_all_records() with default head=1
            records = worksheet.get_all_records()
            logger.info(f"Fetched {len(records)} records from 📌Bulletin Board.")
            return records
        except gspread.exceptions.WorksheetNotFound:
            logger.error("📌Bulletin Board worksheet not found.")
            return []
        except Exception as e:
            logger.error(f"Error accessing 📌Bulletin Board: {e}")
            return []

    def get_discord_ids(self):
        try:
            worksheet = self.masterlist_sheet.worksheet("Updated MasterList")
            total_rows = worksheet.row_count
            logger.debug(f"Updated MasterList worksheet has {total_rows} rows.")

            if total_rows < 1:
                logger.error("Updated MasterList worksheet has no rows.")
                return []
            
            # Assuming headers are on Row 1
            records = worksheet.get_all_records()
            logger.info(f"Fetched {len(records)} records from Updated MasterList.")
            
            # Filter to include only 'team_member' and 'discord_user_id'
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
            return filtered_records
        except gspread.exceptions.WorksheetNotFound:
            logger.error("Updated MasterList worksheet not found.")
            return []
        except Exception as e:
            logger.error(f"Error accessing Updated MasterList: {e}")
            return []
