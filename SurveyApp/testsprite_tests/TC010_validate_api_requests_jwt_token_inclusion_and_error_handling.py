import requests
from requests.exceptions import RequestException, Timeout

BASE_URL = "http://localhost:5174"
TIMEOUT = 30

# Simulated JWT token for testing; in real tests, obtain a valid token via login/authentication flow
JWT_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.fakePayload.fakeSignature"


def test_validate_api_requests_jwt_token_inclusion_and_error_handling():
    headers_with_token = {
        "Authorization": f"Bearer {JWT_TOKEN}",
        "Content-Type": "application/json",
    }

    headers_without_token = {
        "Content-Type": "application/json",
    }

    endpoints_to_test = [
        {"method": "GET", "url": f"{BASE_URL}/api/dashboard"},
        {"method": "GET", "url": f"{BASE_URL}/api/sessions"},
        {"method": "POST", "url": f"{BASE_URL}/api/action-items", "json": {"title": "Test Action", "priority": "medium", "status": "open"}},
        {"method": "GET", "url": f"{BASE_URL}/api/reports"},
        {"method": "POST", "url": f"{BASE_URL}/api/sessions/import", "json": {"spreadsheetId": "dummy_sheet_id"}},
        # Add other representative endpoints if any
    ]

    # Test requests including JWT token (expecting success or valid error codes if payload invalid)
    for ep in endpoints_to_test:
        method = ep["method"].lower()
        url = ep["url"]
        json_payload = ep.get("json", None)

        try:
            if method == "get":
                response = requests.get(url, headers=headers_with_token, timeout=TIMEOUT)
            elif method == "post":
                response = requests.post(url, headers=headers_with_token, json=json_payload, timeout=TIMEOUT)
            else:
                continue  # Skip unsupported methods for this test

            assert response.request.headers.get("Authorization") is not None, f"Authorization header missing in request to {url}"
            # We expect 2xx or 4xx (e.g., 400 Bad Request on invalid payload) but not 401 Unauthorized
            # because the token is present (even if invalid for some endpoints)
            assert response.status_code != 401, f"Got 401 Unauthorized for request with JWT token to {url}"

        except (RequestException, Timeout) as e:
            assert False, f"Request to {url} with JWT token failed unexpectedly: {e}"

    # Test requests without JWT token
    # For /api/dashboard, the server may allow anonymous access (200 OK), so don't assert 401/403
    # For others, we assert 401 or 403
    auth_required_urls = {
        f"{BASE_URL}/api/action-items",
        f"{BASE_URL}/api/reports",
        f"{BASE_URL}/api/sessions/import",
    }

    for ep in endpoints_to_test:
        method = ep["method"].lower()
        url = ep["url"]
        json_payload = ep.get("json", None)

        try:
            if method == "get":
                response = requests.get(url, headers=headers_without_token, timeout=TIMEOUT)
            elif method == "post":
                response = requests.post(url, headers=headers_without_token, json=json_payload, timeout=TIMEOUT)
            else:
                continue  # Skip unsupported methods for this test

            # Confirm no authorization header
            assert "Authorization" not in response.request.headers, f"Authorization header unexpectedly present in request to {url}"

            if url in auth_required_urls:
                # Expecting 401 Unauthorized or 403 Forbidden for missing token
                assert response.status_code in (401, 403), (
                    f"Expected authorization error status (401 or 403) for request without JWT token to {url}, got {response.status_code}"
                )

                # Response body should contain an error message about authorization
                if response.headers.get("Content-Type", "").startswith("application/json"):
                    json_body = response.json()
                    error_msgs = [
                        "unauthorized",
                        "forbidden",
                        "authorization",
                        "token",
                        "jwt",
                        "access denied",
                    ]
                    content = str(json_body).lower()
                    assert any(msg in content for msg in error_msgs), f"Expected authorization error message in response from {url}"
            else:
                # For endpoints that may allow anonymous access, just allow any status code
                pass

        except (RequestException, Timeout) as e:
            assert False, f"Request to {url} without JWT token failed unexpectedly: {e}"


test_validate_api_requests_jwt_token_inclusion_and_error_handling()
