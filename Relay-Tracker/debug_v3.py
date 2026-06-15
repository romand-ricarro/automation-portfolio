import os
import sys
import json
from dotenv import load_dotenv

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

load_dotenv(os.path.join(os.getcwd(), 'backend', '.env'))

from backend.api.services.jira_service import get_jira_client, get_project_key

def debug_v3_search():
    jira = get_jira_client()
    project = get_project_key()
    
    # Test the custom fetcher logic
    path = "rest/api/3/search/jql"
    jql = f"project = '{project}' AND (labels = 'relay-app' OR description ~ 'Relay App')"
    
    print(f"Testing v3 JQL: {jql}")
    
    params = {
        "jql": jql,
        "maxResults": 5,
        "fields": "key,summary,labels",
    }
    
    try:
        response = jira.request(method="GET", path=path, params=params)
        print(f"Status Code: {response.status_code}")
        
        data = response.json()
        issues = data.get("issues", [])
        print(f"Issues Found: {len(issues)}")
        
        for issue in issues:
            fields = issue.get("fields", {})
            print(f"  - {issue['key']}: {fields.get('summary')} (Labels: {fields.get('labels')})")
            
        if not issues:
            # Try a broader search to see what issues ARE there
            print("\nTrying broad search (project only)...")
            params["jql"] = f"project = '{project}'"
            response = jira.request(method="GET", path=path, params=params)
            data = response.json()
            issues = data.get("issues", [])
            print(f"Total project issues found (v3): {len(issues)}")
            for issue in issues:
                fields = issue.get("fields", {})
                print(f"  - {issue['key']}: {fields.get('summary')} (Labels: {fields.get('labels')})")
                
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    debug_v3_search()
