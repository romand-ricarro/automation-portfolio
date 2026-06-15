import requests

BASE_URL = "http://localhost:5174"
TIMEOUT = 30

# Replace with a valid JWT token for an admin or facilitator user with report access
JWT_TOKEN = "your_valid_jwt_token_here"


def test_validate_reports_facilitator_performance_and_session_comparisons():
    headers = {
        "Authorization": f"Bearer {JWT_TOKEN}",
        "Accept": "application/json",
    }

    reports_endpoint = f"{BASE_URL}/api/reports/facilitator-performance"

    try:
        response = requests.get(reports_endpoint, headers=headers, timeout=TIMEOUT)
    except requests.RequestException as e:
        assert False, f"Request to reports endpoint failed: {e}"

    assert response.status_code == 200, f"Expected 200 OK but got {response.status_code}"
    assert response.headers.get("Content-Type") and "application/json" in response.headers.get("Content-Type"), \
        f"Expected JSON response but got {response.headers.get('Content-Type')}"

    json_data = response.json()

    assert isinstance(json_data, dict), "Response JSON root should be an object/dict"
    assert "facilitatorMetrics" in json_data, "Response missing 'facilitatorMetrics' key"
    assert "sessionComparisons" in json_data, "Response missing 'sessionComparisons' key"

    facilitator_metrics = json_data["facilitatorMetrics"]
    session_comparisons = json_data["sessionComparisons"]

    assert isinstance(facilitator_metrics, (list, dict)), "'facilitatorMetrics' should be a list or dict"
    if isinstance(facilitator_metrics, list):
        assert len(facilitator_metrics) > 0, "'facilitatorMetrics' list should not be empty"
        for metric in facilitator_metrics:
            assert "facilitatorId" in metric, "Each metric must have 'facilitatorId'"
            assert "averageRating" in metric, "Each metric must have 'averageRating'"
            assert isinstance(metric["averageRating"], (int, float)), "'averageRating' must be numeric"
    else:
        assert "facilitatorId" in facilitator_metrics, "'facilitatorMetrics' dict missing 'facilitatorId'"
        assert "averageRating" in facilitator_metrics, "'facilitatorMetrics' dict missing 'averageRating'"

    assert isinstance(session_comparisons, (list, dict)), "'sessionComparisons' should be a list or dict"
    if isinstance(session_comparisons, list):
        assert len(session_comparisons) > 0, "'sessionComparisons' list should not be empty"
        for comparison in session_comparisons:
            assert "sessionId" in comparison, "Each comparison must have 'sessionId'"
            assert "ratings" in comparison, "Each comparison must have 'ratings'"
            assert isinstance(comparison["ratings"], dict), "'ratings' should be a dict of rating metrics"
            expected_metrics = {"overallQuality", "repeatability"}
            missing_metric_keys = expected_metrics - comparison["ratings"].keys()
            assert not missing_metric_keys, f"Missing expected rating keys: {missing_metric_keys}"
            for key in expected_metrics:
                assert isinstance(comparison["ratings"][key], (int, float)), f"Rating {key} must be numeric"
    else:
        assert "sessionId" in session_comparisons, "'sessionComparisons' dict missing 'sessionId'"
        assert "ratings" in session_comparisons, "'sessionComparisons' dict missing 'ratings'"
        expected_metrics = {"overallQuality", "repeatability"}
        missing_metric_keys = expected_metrics - session_comparisons["ratings"].keys()
        assert not missing_metric_keys, f"Missing expected rating keys: {missing_metric_keys}"
        for key in expected_metrics:
            assert isinstance(session_comparisons["ratings"][key], (int, float)), f"Rating {key} must be numeric"


test_validate_reports_facilitator_performance_and_session_comparisons()