import requests

BASE_URL = "http://localhost:5174"
TIMEOUT = 30

# Dummy JWT token with facilitator/admin privileges assumed for AI analysis access
# Replace with valid token if available
JWT_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.fake_token_for_testing"

HEADERS = {
    "Authorization": f"Bearer {JWT_TOKEN}",
    "Content-Type": "application/json"
}

def test_verify_ai_analysis_of_open_ended_survey_questions():
    """
    Test the AI analysis endpoint that uses OpenAI GPT-4o to analyze open-ended survey questions
    and generate thematic analyses and common issues tables.
    """
    session = requests.Session()
    session.headers.update(HEADERS)

    # Step 1: Create a new session to analyze open-ended questions
    new_session_payload = {
        "title": "AI Analysis Test Session",
        "description": "Session created for testing AI analysis of open-ended survey questions.",
        "metadata": {
            "trainer": "Test Trainer",
            "date": "2025-12-22T00:00:00Z"
        }
    }

    session_id = None
    try:
        # Create session
        resp_create = session.post(f"{BASE_URL}/api/sessions", json=new_session_payload, timeout=TIMEOUT)
        assert resp_create.status_code == 201, f"Session creation failed: {resp_create.text}"
        session_data = resp_create.json()
        assert "id" in session_data, "Created session response missing 'id'"
        session_id = session_data["id"]

        # Step 2: Submit open-ended survey questions to AI analysis endpoint
        # Assume the endpoint is POST /api/sessions/{session_id}/ai_analysis
        # Payload includes list of open-ended questions and related responses

        ai_analysis_payload = {
            "questions": [
                {
                    "question_id": "q1",
                    "question_text": "What did you find most valuable about the training?",
                    "responses": [
                        "The hands-on exercises helped solidify the concepts.",
                        "I appreciated the real-world examples provided.",
                        "The trainer was very knowledgeable and engaging."
                    ]
                },
                {
                    "question_id": "q2",
                    "question_text": "What could be improved for future sessions?",
                    "responses": [
                        "More time needed for Q&A.",
                        "The pace was a bit fast at times.",
                        "Include more breaks during the session."
                    ]
                }
            ]
        }

        resp_ai = session.post(
            f"{BASE_URL}/api/sessions/{session_id}/ai_analysis",
            json=ai_analysis_payload,
            timeout=TIMEOUT,
        )
        assert resp_ai.status_code == 200, f"AI analysis request failed: {resp_ai.text}"

        ai_result = resp_ai.json()

        # Validate key elements in AI response
        # Expecting thematic analyses and common issues tables in the response
        assert "thematic_analyses" in ai_result, "Response missing 'thematic_analyses'"
        assert isinstance(ai_result["thematic_analyses"], list), "'thematic_analyses' should be a list"
        assert len(ai_result["thematic_analyses"]) > 0, "Thematic analyses list is empty"

        assert "common_issues" in ai_result, "Response missing 'common_issues'"
        assert isinstance(ai_result["common_issues"], list), "'common_issues' should be a list"
        assert len(ai_result["common_issues"]) > 0, "Common issues list is empty"

        # Further checks on structure of thematic analyses items
        for theme in ai_result["thematic_analyses"]:
            assert "theme" in theme, "Each thematic analysis missing 'theme'"
            assert "summary" in theme, "Each thematic analysis missing 'summary'"
            assert isinstance(theme["theme"], str) and theme["theme"].strip() != "", "'theme' must be a non-empty string"
            assert isinstance(theme["summary"], str) and theme["summary"].strip() != "", "'summary' must be a non-empty string"

        # Further checks on structure of common issues items
        for issue in ai_result["common_issues"]:
            assert "issue" in issue, "Each common issue missing 'issue'"
            assert "frequency" in issue, "Each common issue missing 'frequency'"
            assert isinstance(issue["issue"], str) and issue["issue"].strip() != "", "'issue' must be a non-empty string"
            assert isinstance(issue["frequency"], int) and issue["frequency"] > 0, "'frequency' must be positive integer"

    finally:
        # Clean up by deleting the created session
        if session_id is not None:
            try:
                resp_delete = session.delete(f"{BASE_URL}/api/sessions/{session_id}", timeout=TIMEOUT)
                # Accept 200 or 204 for successful deletion
                assert resp_delete.status_code in (200, 204), f"Failed to delete test session: {resp_delete.text}"
            except Exception:
                pass

test_verify_ai_analysis_of_open_ended_survey_questions()
