"""Business rules: request ages, highlight colors and form validation."""

from datetime import datetime, timezone

TEAMS = ["Warehouse", "Front Desk", "Facilities", "Field Crew", "Customer Care", "Finance Ops"]
REQUEST_TYPES = ["Equipment repair", "Supplies order", "Access request", "Schedule change",
                 "Vehicle booking", "Report request"]
PRIORITIES = ["Low", "Normal", "High", "Urgent"]
STATUSES = ["New", "In progress", "Waiting", "Done"]
OPEN_STATUSES = ["New", "In progress", "Waiting"]

AGE_BUCKETS = ["Under 24h", "24 to 48h", "Over 48h"]
YELLOW = "#fff3b0"
RED = "#f8c4c4"


def age_hours(created_at: str, now: datetime | None = None) -> float:
    """Hours since the request was created. created_at is an ISO 8601 UTC string."""
    now = now or datetime.now(timezone.utc)
    return (now - datetime.fromisoformat(created_at)).total_seconds() / 3600


def age_bucket(hours: float) -> str:
    if hours > 48:
        return "Over 48h"
    if hours > 24:
        return "24 to 48h"
    return "Under 24h"


def highlight_color(hours: float, status: str) -> str | None:
    """Yellow for open requests older than 24 hours, red for older than 48. Done requests are not highlighted."""
    if status not in OPEN_STATUSES:
        return None
    if hours > 48:
        return RED
    if hours > 24:
        return YELLOW
    return None


def validate_request(form: dict) -> list[str]:
    """Return a list of problems with a new request. An empty list means it is valid."""
    errors = []
    title = form.get("title", "").strip()
    requester = form.get("requester", "").strip()
    description = form.get("description", "").strip()

    if len(title) < 5:
        errors.append("Title must be at least 5 characters.")
    if len(title) > 120:
        errors.append("Title must be 120 characters or fewer.")
    if len(requester) < 2:
        errors.append("Requester name is required.")
    if len(description) > 1000:
        errors.append("Description must be 1000 characters or fewer.")
    if form.get("team") not in TEAMS:
        errors.append("Choose a team from the list.")
    if form.get("request_type") not in REQUEST_TYPES:
        errors.append("Choose a request type from the list.")
    if form.get("priority") not in PRIORITIES:
        errors.append("Choose a priority from the list.")
    return errors
