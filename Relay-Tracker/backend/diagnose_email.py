import os
import sys
from dotenv import load_dotenv

# 1. Add parent directory to path so we can import api
parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if parent_dir not in sys.path:
    sys.path.append(parent_dir)

# 2. Load .env from the backend directory BEFORE importing services
env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env')
load_dotenv(dotenv_path=env_path)

from api.services.email_service import send_issue_receipt, is_configured

def main():
    if not is_configured():
        print("❌ Error: RESEND_API_KEY not found in environment.")
        return

    recipient = input("Enter a REAL email address to send a test to: ")
    if not recipient:
        print("❌ Error: Recipient email is required.")
        return

    print(f"⌛ Sending test issue receipt to {recipient}...")
    # Send a dummy issue receipt
    r = send_issue_receipt(
        user_email=recipient,
        issue_key="TEST-123",
        summary="This is a test issue from Relay Tracker diagnostic script"
    )
    
    if r:
        print(f"✅ Success! Message ID: {r.get('id')}")
        print(f"Please check the inbox (and spam folder) for {recipient}.")
    else:
        print("❌ Failed. Check the backend logs for specific Resend errors.")

if __name__ == "__main__":
    main()
