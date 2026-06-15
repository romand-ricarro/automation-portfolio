import requests

BASE_URL = "http://localhost:5174"
DASHBOARD_ENDPOINT = f"{BASE_URL}/api/dashboard"
TIMEOUT = 30

# Substitute with a valid JWT token for authentication
JWT_TOKEN = "your_valid_jwt_token_here"

HEADERS = {
    "Authorization": f"Bearer {JWT_TOKEN}",
    "Accept": "application/json"
}

def test_validate_dashboard_statistics_and_recent_sessions_display():
    try:
        response = requests.get(DASHBOARD_ENDPOINT, headers=HEADERS, timeout=TIMEOUT)
        assert response.status_code == 200, f"Expected status code 200 but got {response.status_code}"
        data = response.json()

        # Verify presence and types of required fields
        assert "total_sessions" in data, "'total_sessions' field missing in response"
        assert isinstance(data["total_sessions"], int), "'total_sessions' should be an integer"
        assert data["total_sessions"] >= 0, "'total_sessions' should be non-negative"

        assert "total_action_items" in data, "'total_action_items' field missing in response"
        assert isinstance(data["total_action_items"], int), "'total_action_items' should be an integer"
        assert data["total_action_items"] >= 0, "'total_action_items' should be non-negative"

        assert "average_repeatability" in data, "'average_repeatability' field missing in response"
        avg_repeat = data["average_repeatability"]
        assert isinstance(avg_repeat, (float, int)), "'average_repeatability' should be a number"
        assert 0.0 <= avg_repeat <= 10.0, "'average_repeatability' should be between 0 and 10"

        assert "recent_sessions" in data, "'recent_sessions' field missing in response"
        recent_sessions = data["recent_sessions"]
        assert isinstance(recent_sessions, list), "'recent_sessions' should be a list"
        # Each recent session should have minimal expected fields: id, name, date, ratings (optional)
        for session in recent_sessions:
            assert isinstance(session, dict), "Each recent session should be a dict"
            assert "id" in session, "Session missing 'id'"
            assert isinstance(session["id"], (int, str)), "'id' should be int or str"
            assert "name" in session, "Session missing 'name'"
            assert isinstance(session["name"], str), "'name' should be a string"
            assert "date" in session, "Session missing 'date'"
            assert isinstance(session["date"], str), "'date' should be a string in ISO format or similar"

        # Optional: Validate no unexpected keys in top-level response (not required)
        expected_keys = {"total_sessions", "total_action_items", "average_repeatability", "recent_sessions"}
        assert expected_keys.issubset(data.keys()), "Response missing expected dashboard keys"

    except requests.exceptions.RequestException as e:
        assert False, f"Request failed with exception: {e}"

test_validate_dashboard_statistics_and_recent_sessions_display()