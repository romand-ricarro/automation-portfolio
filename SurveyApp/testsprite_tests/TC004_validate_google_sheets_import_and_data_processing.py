import requests
import time

BASE_URL = "http://localhost:5174"
IMPORT_ENDPOINT = f"{BASE_URL}/api/sessions/import-google-sheet"
SESSIONS_ENDPOINT = f"{BASE_URL}/api/sessions"

# Timeout for requests in seconds
TIMEOUT = 30

# Fake JWT token for authentication (replace with valid token in real scenario)
JWT_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.fake-token-for-test-purposes"

HEADERS = {
    "Authorization": f"Bearer {JWT_TOKEN}",
    "Content-Type": "application/json",
    "Accept": "application/json",
}


def test_validate_google_sheets_import_and_data_processing():
    # 1) Prepare Google Sheet ID payload for import - For testing, use an example valid sheet ID or a test sheet ID
    #    Because no specific sheet ID provided, we assume a test sheet ID "test-google-sheet-id-123"
    payload = {
        "spreadsheet_id": "test-google-sheet-id-123"
    }

    imported_session_ids = []

    try:
        # 2) Trigger import from Google Sheets
        response = requests.post(
            IMPORT_ENDPOINT,
            headers=HEADERS,
            json=payload,
            timeout=TIMEOUT,
        )
        assert response.status_code == 200, f"Import API status code {response.status_code}, body: {response.text}"
        import_result = response.json()
        # Expecting a structure that confirms import success and lists affected session IDs
        assert "importedSessionIds" in import_result, "Response missing 'importedSessionIds'"
        assert isinstance(import_result["importedSessionIds"], list), "'importedSessionIds' is not a list"
        imported_session_ids = import_result["importedSessionIds"]
        assert len(imported_session_ids) > 0, "No session IDs imported from Google Sheets"

        # 3) For each session ID imported, verify data grouping and averaged ratings
        for session_id in imported_session_ids:
            session_url = f"{SESSIONS_ENDPOINT}/{session_id}"
            session_resp = requests.get(
                session_url,
                headers=HEADERS,
                timeout=TIMEOUT,
            )
            assert session_resp.status_code == 200, f"Session retrieval failed for ID {session_id} with status {session_resp.status_code}"
            session_data = session_resp.json()

            # Validate that the session data is grouped by session ID (session_id matches)
            assert session_data.get("id") == session_id, f"Session ID mismatch: expected {session_id}, got {session_data.get('id')}"

            # Check survey responses grouping - expecting survey responses grouped by session inside session_data
            survey_responses = session_data.get("surveyResponses")
            assert survey_responses is not None, f"No surveyResponses found for session {session_id}"
            assert isinstance(survey_responses, list), "surveyResponses is not a list"

            # Validate rating averages - assuming session_data contains averaged ratings fields
            # Expected rating fields (example naming based on PRD): overallQuality, repeatability, etc.
            rating_fields = [
                "overallQuality",
                "repeatability",
                "relevance",
                "contentQuality",
                "deliveryQuality",
                "engagement",
                "materialsQuality",
                "knowledgeTransfer",
                "recommendationLikelihood",
            ]

            # Ensure averaged ratings are floats and within expected range (0-5)
            for field in rating_fields:
                assert field in session_data, f"Rating field '{field}' missing in session data"
                val = session_data[field]
                assert isinstance(val, (float, int)), f"Rating field '{field}' is not a number"
                assert 0 <= val <= 5, f"Rating field '{field}' value {val} out of expected range 0-5"

            # Check that survey responses are grouped by the session ID inside each response
            for response_item in survey_responses:
                resp_session_id = response_item.get("sessionId")
                assert resp_session_id == session_id, f"Survey response sessionId {resp_session_id} does not match session {session_id}"

    finally:
        # Cleanup: Delete all imported sessions to keep environment clean
        for session_id in imported_session_ids:
            try:
                del_resp = requests.delete(
                    f"{SESSIONS_ENDPOINT}/{session_id}",
                    headers=HEADERS,
                    timeout=TIMEOUT,
                )
                # Accept 200 or 204 success status codes, or 404 if already deleted
                assert del_resp.status_code in (200, 204, 404), f"Failed to delete session {session_id}, status code {del_resp.status_code}"
            except Exception:
                # Ignore cleanup exceptions
                pass


test_validate_google_sheets_import_and_data_processing()
