from datetime import datetime, timedelta, timezone

import pytest

from ops_dashboard.logic import RED, YELLOW, age_bucket, age_hours, highlight_color, validate_request

NOW = datetime(2026, 1, 10, 12, 0, tzinfo=timezone.utc)


def created(hours_ago: float) -> str:
    return (NOW - timedelta(hours=hours_ago)).isoformat()


def test_age_hours():
    assert age_hours(created(30), now=NOW) == pytest.approx(30)
    assert age_hours(created(0.5), now=NOW) == pytest.approx(0.5)


@pytest.mark.parametrize("hours, bucket", [
    (1, "Under 24h"), (24, "Under 24h"), (24.1, "24 to 48h"), (48, "24 to 48h"), (48.1, "Over 48h"),
])
def test_age_bucket_boundaries(hours, bucket):
    assert age_bucket(hours) == bucket


@pytest.mark.parametrize("hours, color", [(10, None), (24, None), (25, YELLOW), (48, YELLOW), (49, RED)])
def test_highlight_for_open_requests(hours, color):
    assert highlight_color(hours, "In progress") == color


def test_done_requests_are_never_highlighted():
    assert highlight_color(100, "Done") is None


VALID = {"title": "Forklift battery not charging", "requester": "Avery B.", "team": "Warehouse",
         "request_type": "Equipment repair", "priority": "High", "description": ""}


def test_valid_request_has_no_errors():
    assert validate_request(VALID) == []


@pytest.mark.parametrize("change, message", [
    ({"title": "Fix"}, "Title must be at least 5 characters."),
    ({"title": "x" * 121}, "Title must be 120 characters or fewer."),
    ({"requester": " "}, "Requester name is required."),
    ({"team": None}, "Choose a team from the list."),
    ({"team": "Marketing"}, "Choose a team from the list."),
    ({"request_type": None}, "Choose a request type from the list."),
    ({"priority": "Whenever"}, "Choose a priority from the list."),
    ({"description": "x" * 1001}, "Description must be 1000 characters or fewer."),
])
def test_invalid_requests(change, message):
    assert validate_request({**VALID, **change}) == [message]


def test_whitespace_only_title_is_rejected():
    assert "Title must be at least 5 characters." in validate_request({**VALID, "title": "      "})
