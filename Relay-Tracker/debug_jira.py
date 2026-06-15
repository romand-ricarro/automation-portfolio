import os
import sys
from dotenv import load_dotenv

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

load_dotenv(os.path.join(os.getcwd(), 'backend', '.env'))

from backend.api.services.jira_service import get_jira_client, get_project_key

def debug_issues():
    jira = get_jira_client()
    project = get_project_key()
    
    # Try different JQLs to see what's happening
    jqls = [
        f"project = '{project}'",
        f"project = '{project}' AND labels = 'relay-app'",
        f"project = '{project}' AND (labels = 'relay-app' OR description ~ 'Relay App')"
    ]
    
    for jql in jqls:
        try:
            issues = jira.jql(jql, limit=5)
            # Handle both v2 and v3 response formats if possible, 
            # but usually jira.jql returns the parsed JSON
            total = issues.get('total', 0)
            print(f"JQL: {jql}")
            print(f"Total: {total}")
            for issue in issues.get('issues', []):
                fields = issue.get('fields', {})
                labels = fields.get('labels', [])
                print(f"  - {issue['key']}: {fields.get('summary')} (Labels: {labels})")
            print("-" * 20)
        except Exception as e:
            print(f"Error with JQL '{jql}': {e}")

if __name__ == "__main__":
    debug_issues()
