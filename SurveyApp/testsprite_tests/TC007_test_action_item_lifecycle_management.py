import requests
import uuid
from datetime import datetime, timedelta

BASE_URL = "http://localhost:5174/api"
TIMEOUT = 30

# Authentication helper (replace with a valid token for testing)
def get_auth_headers():
    # Placeholder: In real tests, replace this with a method to obtain a valid JWT token
    token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.fake_token_for_testing_purposes_only"
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }

def test_action_item_lifecycle_management():
    headers = get_auth_headers()

    # Step 1: Create a new action item
    create_payload = {
        "title": f"Test Action Item {uuid.uuid4()}",
        "description": "This is a test action item created by automated test.",
        "priority": "High",        # Assuming accepted priorities: Low, Medium, High, Critical
        "status": "Open",          # Assuming accepted statuses: Open, In Progress, Completed, Closed
        "assignee": "user123",     # Assuming some user id or username string
        "deadline": (datetime.utcnow() + timedelta(days=7)).isoformat() + "Z"  # ISO 8601 UTC format
    }

    action_item_id = None

    try:
        response = requests.post(
            f"{BASE_URL}/action_items",
            json=create_payload,
            headers=headers,
            timeout=TIMEOUT,
        )
        assert response.status_code == 201, f"Expected 201 Created but got {response.status_code}"
        created_item = response.json()
        # Validate response fields match the payload
        assert created_item["title"] == create_payload["title"]
        assert created_item["description"] == create_payload["description"]
        assert created_item["priority"] == create_payload["priority"]
        assert created_item["status"] == create_payload["status"]
        assert created_item["assignee"] == create_payload["assignee"]
        assert "deadline" in created_item
        # Validate deadline roughly matches (allowing for minor time differences)
        created_deadline = created_item["deadline"]
        assert created_deadline.startswith(create_payload["deadline"][:19]), "Deadline datetime mismatch"
        action_item_id = created_item["id"]
        assert action_item_id, "Created action item must have an ID"

        # Step 2: Edit the action item - change priority, status, assignee, deadline
        edit_payload = {
            "title": created_item["title"],
            "description": created_item["description"],
            "priority": "Medium",
            "status": "In Progress",
            "assignee": "user456",
            "deadline": (datetime.utcnow() + timedelta(days=14)).isoformat() + "Z",
        }
        response = requests.put(
            f"{BASE_URL}/action_items/{action_item_id}",
            json=edit_payload,
            headers=headers,
            timeout=TIMEOUT,
        )
        assert response.status_code == 200, f"Expected 200 OK on update but got {response.status_code}"
        updated_item = response.json()
        # Validate updates
        assert updated_item["priority"] == edit_payload["priority"]
        assert updated_item["status"] == edit_payload["status"]
        assert updated_item["assignee"] == edit_payload["assignee"]
        assert updated_item["deadline"].startswith(edit_payload["deadline"][:19])

        # Step 3: Retrieve the updated action item and verify
        response = requests.get(
            f"{BASE_URL}/action_items/{action_item_id}",
            headers=headers,
            timeout=TIMEOUT,
        )
        assert response.status_code == 200, f"Expected 200 OK on get but got {response.status_code}"
        item = response.json()
        assert item["id"] == action_item_id
        assert item["priority"] == edit_payload["priority"]
        assert item["status"] == edit_payload["status"]
        assert item["assignee"] == edit_payload["assignee"]
        assert item["deadline"].startswith(edit_payload["deadline"][:19])

        # Step 4: Attempt invalid update - invalid priority, expect error (400 or 422)
        invalid_payload = edit_payload.copy()
        invalid_payload["priority"] = "Urgent"  # Assuming not allowed
        response = requests.put(
            f"{BASE_URL}/action_items/{action_item_id}",
            json=invalid_payload,
            headers=headers,
            timeout=TIMEOUT,
        )
        assert response.status_code in (400, 422), "Expected client error for invalid priority"

        # Step 5: Attempt invalid update - invalid status, expect error
        invalid_payload = edit_payload.copy()
        invalid_payload["status"] = "Done"  # Assuming not allowed status
        response = requests.put(
            f"{BASE_URL}/action_items/{action_item_id}",
            json=invalid_payload,
            headers=headers,
            timeout=TIMEOUT,
        )
        assert response.status_code in (400, 422), "Expected client error for invalid status"

        # Step 6: List action items and verify new item is present with correct priority and status
        response = requests.get(
            f"{BASE_URL}/action_items",
            headers=headers,
            timeout=TIMEOUT,
        )
        assert response.status_code == 200, f"Expected 200 OK on list but got {response.status_code}"
        items_list = response.json()
        assert any(ai["id"] == action_item_id for ai in items_list), "Created action item not in list"

    finally:
        # Step 7: Delete the created action item to clean up
        if action_item_id:
            response = requests.delete(
                f"{BASE_URL}/action_items/{action_item_id}",
                headers=headers,
                timeout=TIMEOUT,
            )
            assert response.status_code in (200, 204), f"Expected 200 or 204 No Content on delete, got {response.status_code}"

test_action_item_lifecycle_management()
