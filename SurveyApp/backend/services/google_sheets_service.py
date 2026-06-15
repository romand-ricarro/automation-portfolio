import os
import json
import base64
import gspread

SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly']

def get_gspread_client():
    """
    Authenticates with Google Sheets API using service account credentials.
    Supports three methods (checked in order):
    1. GOOGLE_SHEETS_CREDENTIALS_FILE - path to a JSON credentials file (local dev)
    2. GOOGLE_SHEETS_CREDENTIALS_BASE64 - base64-encoded JSON (recommended for Vercel)
    3. GOOGLE_SHEETS_CREDENTIALS - JSON string in environment variable
    """
    creds_file = os.environ.get('GOOGLE_SHEETS_CREDENTIALS_FILE')
    creds_base64 = os.environ.get('GOOGLE_SHEETS_CREDENTIALS_BASE64')
    creds_json = os.environ.get('GOOGLE_SHEETS_CREDENTIALS')

    try:
        # Method 1: Load from file (preferred for local development)
        if creds_file:
            if os.path.exists(creds_file):
                print(f"DEBUG GSHEETS: Loading credentials from file: {creds_file}")
                gc = gspread.service_account(filename=creds_file)
                print("DEBUG GSHEETS: Authentication successful (from file)")
                return gc
            else:
                print(f"DEBUG GSHEETS: Credentials file not found: {creds_file}")

        # Method 2: Load from base64-encoded environment variable (best for Vercel)
        if creds_base64:
            print("DEBUG GSHEETS: Loading credentials from base64 environment variable")
            try:
                creds_json_decoded = base64.b64decode(creds_base64).decode('utf-8')
                creds_dict = json.loads(creds_json_decoded)
                print(f"DEBUG GSHEETS: Attempting auth with service account: {creds_dict.get('client_email', 'unknown')}")
                gc = gspread.service_account_from_dict(creds_dict)
                print("DEBUG GSHEETS: Authentication successful (from base64)")
                return gc
            except Exception as e:
                print(f"DEBUG GSHEETS: Base64 decode failed - {str(e)}")

        # Method 3: Load from JSON string environment variable
        if creds_json:
            print("DEBUG GSHEETS: Loading credentials from JSON environment variable")
            creds_dict = json.loads(creds_json)

            # Fix common issue: escaped newlines in private_key
            if 'private_key' in creds_dict:
                creds_dict['private_key'] = creds_dict['private_key'].replace('\\n', '\n')

            print(f"DEBUG GSHEETS: Attempting auth with service account: {creds_dict.get('client_email', 'unknown')}")
            gc = gspread.service_account_from_dict(creds_dict)
            print("DEBUG GSHEETS: Authentication successful (from JSON env var)")
            return gc

        raise ValueError(
            "Google Sheets credentials not configured. "
            "Set one of: GOOGLE_SHEETS_CREDENTIALS_FILE (path), "
            "GOOGLE_SHEETS_CREDENTIALS_BASE64 (base64), or "
            "GOOGLE_SHEETS_CREDENTIALS (JSON string)."
        )

    except json.JSONDecodeError as e:
        print(f"DEBUG GSHEETS: JSON parsing failed - {str(e)}")
        raise Exception(f"Failed to parse Google Sheets credentials as JSON: {str(e)}")
    except Exception as e:
        print(f"DEBUG GSHEETS: Authentication failed - {str(e)}")
        raise Exception(f"Failed to authenticate with Google Sheets: {str(e)}")

def fetch_survey_responses(spreadsheet_id):
    """
    Fetches all records from the spreadsheet.
    Returns a list of dictionaries mapping the 18 columns.
    """
    client = get_gspread_client()
    try:
        sh = client.open_by_key(spreadsheet_id)
        # Assuming the first sheet contains the responses
        worksheet = sh.sheet1
        
        # Get all values
        rows = worksheet.get_all_values()
        
        if not rows:
            return []
            
        # Headers are in rows[0], data starts from rows[1]
        # We need to map these to our internal keys based on column index
        # 1. Timestamp (0)
        # 2. Email Address (1)
        # ...
        
        results = []
        for i, row in enumerate(rows[1:], start=2): # 1-indexed for user visibility, but skipping header (row 1)
            # Ensure row has enough columns (pad with empty string if needed)
            if len(row) < 18:
                row += [''] * (18 - len(row))
                
            entry = {
                'timestamp': row[0],
                'email': row[1],
                'session_date': row[2],
                'session_id': row[3],
                'facilitator_name': row[4],
                'response_id': i, # tracking row number in case needed
                
                # Open-ended questions (for AI analysis)
                'learned': row[5],
                'apply': row[6],
                'need_to_learn': row[7],
                'comments': row[17], # column 18 is at index 17
                
                # Ratings
                'facilitator_understanding': row[8],
                'learning_mechanics': row[9],
                'qa_support': row[10],
                'problem_articulation': row[11],
                'session_pace': row[12],
                'tools_helpfulness': row[13],
                'repeatability': row[14], # KEY METRIC
                'learning_objectives': row[15],
                'overall_quality': row[16]
            }
            results.append(entry)
            
        return results
        
    except Exception as e:
        raise Exception(f"Error fetching spreadsheet data: {str(e)}")
