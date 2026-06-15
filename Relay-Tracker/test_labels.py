import os
import sys
import json
from dotenv import load_dotenv

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

load_dotenv(os.path.join(os.getcwd(), 'backend', '.env'))

from backend.api.services.jira_service import create_issue

def test_creation():
    try:
        print("Creating test issue via Relay service...")
        result = create_issue(
            summary="Relay Label Test " + os.urandom(2).hex(),
            details="Testing if labels are correctly applied by the service.",
            issue_type="Bug",
            priority="Low",
            user_email="tools@foodstyles.com",
            browser="Chrome",
            os_info="macOS"
        )
        print(f"Created issue: {result['key']}")
        
        # Verify labels
        from backend.api.services.jira_service import get_jira_client
        jira = get_jira_client()
        issue = jira.issue(result['key'])
        labels = issue.get('fields', {}).get('labels', [])
        print(f"Verified Labels: {labels}")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_creation()
