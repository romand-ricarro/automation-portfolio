# discord_ids.py
import os
from google_sheets_client import get_gspread_client
from dotenv import load_dotenv
from logger import setup_logger  # Ensure logger.py is in the same directory

load_dotenv()
logger = setup_logger()

def get_discord_ids():
    client = get_gspread_client()
    sheet_id = os.getenv("DISCORD_IDS_SHEET_ID")
    target_tab = os.getenv("DISCORD_IDS_TAB_NAME")
    
    if not target_tab:
        logger.error("DISCORD_IDS_TAB_NAME not set in .env")
        return []
    
    try:
        # Open the spreadsheet by key
        spreadsheet = client.open_by_key(sheet_id)
        
        # List all worksheet names for debugging
        worksheets = spreadsheet.worksheets()
        sheet_names = [ws.title for ws in worksheets]
        logger.info(f"Available worksheets: {sheet_names}")
        
        # Select the worksheet by name
        worksheet = spreadsheet.worksheet(target_tab)
        logger.info(f"Selected worksheet: {target_tab}")
        
        # Fetch all records from the specified worksheet
        records = worksheet.get_all_records()
        
        # Process records to extract Discord IDs and Names
        discord_ids = []
        for idx, record in enumerate(records, start=2):  # start=2 assuming headers are in row 1
            try:
                user_id = str(record['discord_user_id']).strip()
                name = record['team_member'].strip()
                
                if not user_id or not name:
                    logger.warning(f"Incomplete record at row {idx}: {record}")
                    continue
                
                discord_ids.append({'id': user_id, 'name': name})
            except KeyError as ke:
                logger.error(f"Missing expected column in record at row {idx}: {record}. Error: {ke}")
            except Exception as e:
                logger.error(f"Error processing record at row {idx}: {record}. Error: {e}")
        
        logger.info(f"Fetched {len(discord_ids)} Discord IDs successfully.")
        return discord_ids
    except gspread.exceptions.WorksheetNotFound:
        logger.error(f"Worksheet '{target_tab}' not found in spreadsheet '{sheet_id}'.")
        return []
    except Exception as e:
        logger.error(f"Error fetching Discord IDs from tab '{target_tab}': {e}")
        return []
