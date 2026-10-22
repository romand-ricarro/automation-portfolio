"""SQLite storage for requests."""

import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

DEFAULT_DB = Path(__file__).resolve().parents[2] / "data" / "ops.db"

SCHEMA = """
CREATE TABLE IF NOT EXISTS requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    requester TEXT NOT NULL,
    team TEXT NOT NULL,
    request_type TEXT NOT NULL,
    priority TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'New',
    created_at TEXT NOT NULL
)
"""

COLUMNS = ["title", "description", "requester", "team", "request_type", "priority", "status", "created_at"]


def db_path() -> Path:
    return Path(os.getenv("OPS_DB_PATH") or DEFAULT_DB)


def connect(path: Path | None = None) -> sqlite3.Connection:
    path = path or db_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    conn.execute(SCHEMA)
    return conn


def insert_request(conn: sqlite3.Connection, request: dict) -> int:
    """Insert one request. Missing status and created_at get defaults."""
    row = {
        "description": "",
        "status": "New",
        "created_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        **request,
    }
    cur = conn.execute(
        f"INSERT INTO requests ({', '.join(COLUMNS)}) VALUES ({', '.join('?' for _ in COLUMNS)})",
        [row[c].strip() if isinstance(row[c], str) else row[c] for c in COLUMNS],
    )
    conn.commit()
    return cur.lastrowid


def load_requests(conn: sqlite3.Connection) -> list[dict]:
    return [dict(r) for r in conn.execute("SELECT * FROM requests ORDER BY created_at")]
