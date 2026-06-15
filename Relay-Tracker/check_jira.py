import os
import sys
from dotenv import load_dotenv

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

load_dotenv(os.path.join(os.getcwd(), 'backend', '.env'))

from backend.api.services.jira_service import get_jira_client, get_project_key

def check_jira():
    jira = get_jira_client()
    project = get_project_key()
    
    jql = f"project = '{project}'"
    print(f"Checking JQL: {jql}")
    
    try:
        # Use simple search to verify connection
        issues = jira.jql(jql, limit=1)
        print(f"Connection OK. Total issues in project {project}: {issues.get('total')}")
        
        # Check Relay issues
        relay_jql = f"project = '{project}' AND (labels = 'relay-app' OR description ~ 'Relay App')"
        relay_issues = jira.jql(relay_jql, limit=1)
        print(f"Relay JQL: {relay_jql}")
        print(f"Total Relay issues: {relay_issues.get('total')}")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_jira()
