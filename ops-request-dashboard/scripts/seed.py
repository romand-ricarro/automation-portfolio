"""Create the database and fill it with synthetic requests.

Usage: python scripts/seed.py [--count 150]
This replaces any existing data. All names and requests are made up.
"""

import argparse
import random
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from ops_dashboard.db import connect, db_path, insert_request  # noqa: E402
from ops_dashboard.logic import PRIORITIES, REQUEST_TYPES, TEAMS  # noqa: E402

FIRST_NAMES = ["Avery", "Blake", "Cameron", "Devon", "Emery", "Finley", "Harper", "Jamie",
               "Kendall", "Logan", "Morgan", "Parker", "Quinn", "Reese", "Rowan", "Sage"]
LAST_INITIALS = list("ABCDEFGHJKLMNPRSTW")

# A few title templates per request type, so the data looks like a real queue.
TITLES = {
    "Equipment repair": ["Forklift battery not charging", "Label printer jams", "Loading dock door stuck",
                         "Scanner will not pair", "Cold room thermostat reading high"],
    "Supplies order": ["Order more packing tape", "Restock safety gloves", "Need pallets for Friday",
                       "Printer toner running low", "Order cleaning supplies"],
    "Access request": ["Badge access for new starter", "Shared drive access", "Reset door code",
                       "Access to booking calendar", "Visitor pass for contractor"],
    "Schedule change": ["Swap shift on Thursday", "Cover needed for Monday morning", "Holiday rota update",
                        "Move team meeting", "Extra staff for stock count"],
    "Vehicle booking": ["Van needed for delivery run", "Book car for site visit", "Truck for bulk pickup",
                        "Return vehicle early", "Extend van booking"],
    "Report request": ["Weekly stock summary", "Overtime hours for last month", "Late deliveries list",
                       "Supplier spend by quarter", "Open orders by region"],
}


def fake_request(rng: random.Random, now: datetime) -> dict:
    request_type = rng.choice(REQUEST_TYPES)
    # Ages spread over the last 7 days, weighted toward recent requests.
    hours_ago = rng.triangular(0.2, 168, 6)
    # Older requests are more likely to be done.
    done_chance = min(0.85, hours_ago / 120)
    if rng.random() < done_chance:
        status = "Done"
    else:
        status = rng.choices(["New", "In progress", "Waiting"], weights=[4, 4, 2])[0]
    return {
        "title": rng.choice(TITLES[request_type]),
        "description": "Synthetic demo request.",
        "requester": f"{rng.choice(FIRST_NAMES)} {rng.choice(LAST_INITIALS)}.",
        "team": rng.choice(TEAMS),
        "request_type": request_type,
        "priority": rng.choices(PRIORITIES, weights=[2, 5, 2, 1])[0],
        "status": status,
        "created_at": (now - timedelta(hours=hours_ago)).isoformat(timespec="seconds"),
    }


def seed(conn, count: int = 150, rng_seed: int = 7) -> None:
    rng = random.Random(rng_seed)
    now = datetime.now(timezone.utc)
    conn.execute("DELETE FROM requests")
    for _ in range(count):
        insert_request(conn, fake_request(rng, now))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--count", type=int, default=150)
    args = parser.parse_args()
    with connect() as conn:
        seed(conn, args.count)
    print(f"Seeded {args.count} synthetic requests into {db_path()}")
