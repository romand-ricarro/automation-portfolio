import requests
import uuid

BASE_URL = "http://localhost:5174"
TIMEOUT = 30

# Placeholder for a valid JWT token with at least facilitator role to access session data.
# In a real environment, obtain this token via the authentication flow.
JWT_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.example.validfacilitator.token"

HEADERS = {
    "Authorization": f"Bearer {JWT_TOKEN}",
    "Content-Type": "application/json",
}


def create_session():
    """Create a new session resource for testing."""
    url = f"{BASE_URL}/api/sessions"
    session_data = {
        "title": "Test Session for Ratings " + str(uuid.uuid4()),
        "description": "Session created for testing all nine rating metrics.",
        "date": "2025-01-01",
        # Provide initial ratings for all nine metrics as per the product overview.
        "ratings": {
            "overall_quality": 4.2,
            "repeatability": 3.8,
            "content_relevance": 4.0,
            "trainer_knowledge": 4.5,
            "training_materials": 4.1,
            "engagement": 4.3,
            "pace": 4.0,
            "clarity": 4.4,
            "practical_application": 3.9
        }
    }
    response = requests.post(url, json=session_data, headers=HEADERS, timeout=TIMEOUT)
    response.raise_for_status()
    return response.json()["id"]


def delete_session(session_id):
    """Delete the session resource after testing."""
    url = f"{BASE_URL}/api/sessions/{session_id}"
    response = requests.delete(url, headers=HEADERS, timeout=TIMEOUT)
    response.raise_for_status()


def test_validate_session_ratings_calculation_and_display():
    session_id = None
    try:
        # Create session if no session_id provided
        session_id = create_session()

        # Fetch session ratings data from the API
        url = f"{BASE_URL}/api/sessions/{session_id}/ratings"
        response = requests.get(url, headers=HEADERS, timeout=TIMEOUT)

        assert response.status_code == 200, f"Expected HTTP 200 OK, got {response.status_code}"
        ratings = response.json()

        # Define expected rating metric keys from PRD (9 metrics)
        expected_metrics = {
            "overall_quality",
            "repeatability",
            "content_relevance",
            "trainer_knowledge",
            "training_materials",
            "engagement",
            "pace",
            "clarity",
            "practical_application"
        }

        # Validate all nine metrics are present
        assert isinstance(ratings, dict), "Ratings response must be a JSON object"
        received_metrics = set(ratings.keys())
        missing_metrics = expected_metrics - received_metrics
        extra_metrics = received_metrics - expected_metrics
        assert not missing_metrics, f"Missing rating metrics in response: {missing_metrics}"
        assert not extra_metrics, f"Unexpected rating metrics in response: {extra_metrics}"

        # Validate each rating is a number and within a realistic range (e.g., 0 to 5)
        for metric in expected_metrics:
            value = ratings[metric]
            assert isinstance(value, (int, float)), f"Rating {metric} must be a number"
            assert 0 <= value <= 5, f"Rating {metric}={value} out of expected range 0-5"

        # Optionally: Validate that the ratings returned match what was sent for the created session
        # (This assumes the backend calculates and returns stored values without rounding errors beyond .1)
        expected_values = {
            "overall_quality": 4.2,
            "repeatability": 3.8,
            "content_relevance": 4.0,
            "trainer_knowledge": 4.5,
            "training_materials": 4.1,
            "engagement": 4.3,
            "pace": 4.0,
            "clarity": 4.4,
            "practical_application": 3.9
        }
        for metric, expected_val in expected_values.items():
            actual_val = ratings[metric]
            assert abs(actual_val - expected_val) < 0.15, f"Rating {metric} value {actual_val} not close to expected {expected_val}"

    finally:
        if session_id:
            try:
                delete_session(session_id)
            except Exception:
                # Log deletion failure or ignore to not mask test result
                pass


test_validate_session_ratings_calculation_and_display()