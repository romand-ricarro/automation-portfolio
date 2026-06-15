import requests
import time

BASE_URL = "http://localhost:5174"
TIMEOUT = 30

# Sample user info to simulate different roles in tests (these user emails or identifiers should exist in the test environment)
TEST_USERS = {
    "admin": {
        "email": "admin@test.com",
        "provider_token": "valid_google_oauth_token_admin"
    },
    "facilitator": {
        "email": "facilitator@test.com",
        "provider_token": "valid_google_oauth_token_facilitator"
    },
    "viewer": {
        "email": "viewer@test.com",
        "provider_token": "valid_google_oauth_token_viewer"
    }
}

def get_jwt_token(provider_token):
    """
    Perform Google OAuth login via Supabase endpoint. 
    Assumes the backend has an auth endpoint for OAuth login which exchanges provider_token for JWT token.
    """
    url = f"{BASE_URL}/api/auth/login/google"
    headers = {"Content-Type": "application/json"}
    body = {
        "provider_token": provider_token
    }
    resp = requests.post(url, json=body, headers=headers, timeout=TIMEOUT)
    resp.raise_for_status()
    json_resp = resp.json()
    assert "access_token" in json_resp and isinstance(json_resp["access_token"], str) and json_resp["access_token"], "No valid JWT access_token received"
    # Possibly role also returned, or we can extract from token claims via another endpoint if available
    return json_resp["access_token"]

def test_role_access(jwt_token, expected_role):
    """
    Validate role-based access control enforcement.
    We call a protected resource intended for certain roles and verify access.
    For this test, we assume /api/users/me returns user profile with role info.
    And /api/admin only accessible to admin.
    """
    headers = {
        "Authorization": f"Bearer {jwt_token}"
    }

    # 1. Check /api/users/me returns role info
    me_url = f"{BASE_URL}/api/users/me"
    resp = requests.get(me_url, headers=headers, timeout=TIMEOUT)
    assert resp.status_code == 200, f"/api/users/me failed with status {resp.status_code}"
    user_data = resp.json()
    assert "role" in user_data and user_data["role"] == expected_role, f"Role mismatch: expected {expected_role}, got {user_data.get('role')}"

    # 2. Check role-based access to /api/admin (example: admin only)
    admin_url = f"{BASE_URL}/api/admin"
    resp_admin = requests.get(admin_url, headers=headers, timeout=TIMEOUT)

    if expected_role == "admin":
        # Admin should have access
        assert resp_admin.status_code == 200, f"Admin access denied with status {resp_admin.status_code}"
    else:
        # Non-admins should be forbidden or unauthorized
        assert resp_admin.status_code in (401, 403), f"Non-admin role {expected_role} should be blocked from /api/admin but got {resp_admin.status_code}"

    # 3. Check access to facilitator-only resource /api/reports/facilitator
    facilitator_url = f"{BASE_URL}/api/reports/facilitator"
    resp_facilitator = requests.get(facilitator_url, headers=headers, timeout=TIMEOUT)
    if expected_role in ("admin", "facilitator"):
        assert resp_facilitator.status_code == 200, f"{expected_role} should access facilitator reports, got {resp_facilitator.status_code}"
    else:
        assert resp_facilitator.status_code in (401, 403), f"{expected_role} should NOT access facilitator reports, got {resp_facilitator.status_code}"

    # 4. Check access to viewer resource /api/viewer/data (example)
    viewer_url = f"{BASE_URL}/api/viewer/data"
    resp_viewer = requests.get(viewer_url, headers=headers, timeout=TIMEOUT)
    # viewer, facilitator and admin can access
    if expected_role in ("admin", "facilitator", "viewer"):
        assert resp_viewer.status_code == 200, f"{expected_role} should access viewer data, got {resp_viewer.status_code}"
    else:
        # Unknown roles or unauthenticated should be blocked
        assert resp_viewer.status_code in (401, 403), f"{expected_role} unexpected access to viewer data with status {resp_viewer.status_code}"

def test_verify_google_oauth_authentication_and_role_based_access_control():
    """
    Test Google OAuth login flow via Supabase:
    - Verify JWT tokens are issued correctly for admin, facilitator, viewer roles.
    - Validate role-based access control enforcement for resources.
    """
    for role in ("admin", "facilitator", "viewer"):
        user = TEST_USERS[role]

        # Get JWT token by simulating Google OAuth login
        try:
            jwt_token = get_jwt_token(user["provider_token"])
        except requests.HTTPError as ex:
            assert False, f"Failed to login for role {role}: {ex}"

        assert jwt_token, f"JWT token not returned for role {role}"
        
        # Validate role-based access control using the obtained token
        try:
            test_role_access(jwt_token, role)
        except AssertionError as e:
            assert False, f"Role-based access control test failed for role {role}: {str(e)}"

test_verify_google_oauth_authentication_and_role_based_access_control()
