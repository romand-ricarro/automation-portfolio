import requests

BASE_URL = "http://localhost:5174"
TIMEOUT = 30

# Simulated JWT token for authenticated user with theme toggle privileges
# In real testing, fetch a valid token via login or fixture
JWT_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.fakeTokenForTestingPurposes"

HEADERS = {
    "Authorization": f"Bearer {JWT_TOKEN}",
    "Content-Type": "application/json",
    "Accept": "application/json",
}

def test_verify_theme_toggle_persistence_and_ui_switching():
    """
    Test theme toggle API or context to ensure user preferences for light/dark modes persist
    and UI switches without visual or functional issues.
    
    Assumptions:
    - The theme preference can be set via a PATCH or PUT to /user/preferences or /user/theme endpoint.
    - The GET on /user/preferences or /user/theme returns current theme preference.
    - Authentication is required, JWT token is provided in Authorization header.
    - The payload uses JSON with { "theme": "light" } or { "theme": "dark" }.
    """

    theme_endpoint = f"{BASE_URL}/user/theme"
    
    def set_theme(theme_value):
        payload = {"theme": theme_value}
        response = requests.put(theme_endpoint, json=payload, headers=HEADERS, timeout=TIMEOUT)
        response.raise_for_status()
        return response.json()

    def get_theme():
        response = requests.get(theme_endpoint, headers=HEADERS, timeout=TIMEOUT)
        response.raise_for_status()
        return response.json()

    try:
        # Step 1: Set theme to 'dark' and verify response
        set_resp_dark = set_theme("dark")
        assert "theme" in set_resp_dark, f"Response missing 'theme' key: {set_resp_dark}"
        assert set_resp_dark["theme"] == "dark", f"Expected theme to be 'dark', got {set_resp_dark['theme']}"

        # Step 2: Get theme and verify persistence of 'dark'
        get_resp_dark = get_theme()
        assert "theme" in get_resp_dark, f"Response missing 'theme' key: {get_resp_dark}"
        assert get_resp_dark["theme"] == "dark", f"Theme persistence failed, expected 'dark', got {get_resp_dark['theme']}"

        # Step 3: Switch to 'light' theme and verify response
        set_resp_light = set_theme("light")
        assert "theme" in set_resp_light, f"Response missing 'theme' key: {set_resp_light}"
        assert set_resp_light["theme"] == "light", f"Expected theme to be 'light', got {set_resp_light['theme']}"

        # Step 4: Get theme and verify persistence of 'light'
        get_resp_light = get_theme()
        assert "theme" in get_resp_light, f"Response missing 'theme' key: {get_resp_light}"
        assert get_resp_light["theme"] == "light", f"Theme persistence failed, expected 'light', got {get_resp_light['theme']}"

    except requests.HTTPError as e:
        # For test failures due to HTTP errors, fail test with detailed info
        raise AssertionError(f"HTTP error occurred: {e}, Response: {e.response.text if e.response else 'No response'}")
    except requests.RequestException as e:
        raise AssertionError(f"Request failed: {e}")

test_verify_theme_toggle_persistence_and_ui_switching()
