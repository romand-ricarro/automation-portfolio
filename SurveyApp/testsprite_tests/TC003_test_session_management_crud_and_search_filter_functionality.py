import requests
import uuid

BASE_URL = "http://localhost:5174"
TIMEOUT = 30

# Pretend function to retrieve a valid JWT token before tests
def get_jwt_token():
    # This should be replaced with a real authentication function
    # For this test code, we provide a placeholder token string
    return "Bearer your_valid_jwt_token_here"

def test_session_management_crud_and_search_filter_functionality():
    headers = {
        "Authorization": get_jwt_token(),
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    created_session_id = None
    try:
        # 1. Create a new session - POST /sessions
        new_session_payload = {
            "title": f"Test Session {uuid.uuid4()}",
            "description": "Session created for test_session_management_crud_and_search_filter_functionality",
            "metadata": {
                "location": "Test Room 1",
                "trainer": "John Doe",
                "date": "2025-12-22"
            },
            "ratings": {
                "overall_quality": 4.5,
                "repeatability": 4.0,
                "engagement": 3.8,
                "content_relevance": 4.2,
                "presentation_skills": 4.6,
                "material_quality": 4.3,
                "pace": 4.1,
                "facilitator_knowledge": 4.7,
                "interaction": 4.0
            }
        }

        resp_create = requests.post(
            f"{BASE_URL}/sessions",
            json=new_session_payload,
            headers=headers,
            timeout=TIMEOUT
        )
        assert resp_create.status_code == 201, f"Create session failed: {resp_create.text}"
        created_session = resp_create.json()
        created_session_id = created_session.get("id")
        assert created_session_id is not None, "Created session ID missing"
        assert created_session.get("title") == new_session_payload["title"]
        assert created_session.get("metadata") == new_session_payload["metadata"]
        assert created_session.get("ratings") == new_session_payload["ratings"]

        # 2. List sessions - GET /sessions
        resp_list = requests.get(
            f"{BASE_URL}/sessions",
            headers=headers,
            timeout=TIMEOUT
        )
        assert resp_list.status_code == 200, f"List sessions failed: {resp_list.text}"
        sessions_list = resp_list.json()
        assert isinstance(sessions_list, list), "Sessions list response is not a list"
        assert any(s["id"] == created_session_id for s in sessions_list), "Created session not found in list"

        # 3. Search and filter sessions - GET /sessions?search=Test&location=Test Room 1
        search_params = {
            "search": "Test Session",
            "location": "Test Room 1"
        }
        resp_search = requests.get(
            f"{BASE_URL}/sessions",
            headers=headers,
            params=search_params,
            timeout=TIMEOUT
        )
        assert resp_search.status_code == 200, f"Search/filter sessions failed: {resp_search.text}"
        search_results = resp_search.json()
        assert isinstance(search_results, list), "Search response is not a list"
        # Check at least one session matches criteria and includes the created session
        assert any(s["id"] == created_session_id for s in search_results), "Created session not found in search results"

        # 4. View session detail - GET /sessions/{id}
        resp_view = requests.get(
            f"{BASE_URL}/sessions/{created_session_id}",
            headers=headers,
            timeout=TIMEOUT
        )
        assert resp_view.status_code == 200, f"View session detail failed: {resp_view.text}"
        session_detail = resp_view.json()
        assert session_detail["id"] == created_session_id
        assert session_detail["title"] == new_session_payload["title"]
        assert session_detail["metadata"] == new_session_payload["metadata"]
        assert session_detail["ratings"] == new_session_payload["ratings"]
        assert "ai_analysis" in session_detail

        # 5. Edit the session - PUT /sessions/{id}
        updated_metadata = session_detail["metadata"].copy()
        updated_metadata["location"] = "Updated Test Room 2"
        updated_ratings = session_detail["ratings"].copy()
        updated_ratings["overall_quality"] = 4.8
        update_payload = {
            "title": session_detail["title"] + " Updated",
            "description": session_detail.get("description"),
            "metadata": updated_metadata,
            "ratings": updated_ratings
        }

        resp_update = requests.put(
            f"{BASE_URL}/sessions/{created_session_id}",
            json=update_payload,
            headers=headers,
            timeout=TIMEOUT
        )
        assert resp_update.status_code == 200, f"Update session failed: {resp_update.text}"
        updated_session = resp_update.json()
        assert updated_session["metadata"]["location"] == "Updated Test Room 2"
        assert updated_session["ratings"]["overall_quality"] == 4.8
        assert updated_session["title"].endswith("Updated")

        # 6. Confirm update persisted by fetching again
        resp_confirm = requests.get(
            f"{BASE_URL}/sessions/{created_session_id}",
            headers=headers,
            timeout=TIMEOUT
        )
        assert resp_confirm.status_code == 200, f"Confirm updated session failed: {resp_confirm.text}"
        confirmed_session = resp_confirm.json()
        assert confirmed_session["metadata"]["location"] == "Updated Test Room 2"
        assert confirmed_session["ratings"]["overall_quality"] == 4.8

    finally:
        # Cleanup - Delete the created session if exists
        if created_session_id:
            resp_delete = requests.delete(
                f"{BASE_URL}/sessions/{created_session_id}",
                headers=headers,
                timeout=TIMEOUT
            )
            # Deletion might respond with 204 No Content or 200 OK
            assert resp_delete.status_code in (200, 204), f"Failed to delete session {created_session_id}: {resp_delete.text}"

test_session_management_crud_and_search_filter_functionality()
