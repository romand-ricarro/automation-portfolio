"""SQLite storage for API keys and sent notifications."""

import json
import sqlite3
import threading
import uuid
from datetime import datetime, timezone
from typing import Any

SCHEMA = """
CREATE TABLE IF NOT EXISTS api_keys (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    prefix TEXT NOT NULL,
    key_hash TEXT NOT NULL UNIQUE,
    rate_limit_per_minute INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    revoked_at TEXT
);
CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    api_key_id TEXT NOT NULL REFERENCES api_keys(id),
    channel TEXT NOT NULL,
    recipient TEXT NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    metadata TEXT NOT NULL,
    status TEXT NOT NULL,
    error TEXT,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_notifications_key ON notifications(api_key_id, created_at);
"""


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class Store:
    def __init__(self, path: str):
        self._conn = sqlite3.connect(path, check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        self._lock = threading.Lock()
        with self._lock:
            self._conn.executescript(SCHEMA)

    def close(self) -> None:
        self._conn.close()

    # API keys

    def create_key(self, name: str, prefix: str, key_hash: str, rate_limit_per_minute: int) -> dict[str, Any]:
        row = {
            "id": f"key_{uuid.uuid4().hex[:12]}",
            "name": name,
            "prefix": prefix,
            "key_hash": key_hash,
            "rate_limit_per_minute": rate_limit_per_minute,
            "created_at": _now(),
            "revoked_at": None,
        }
        with self._lock:
            self._conn.execute(
                "INSERT INTO api_keys VALUES (:id, :name, :prefix, :key_hash, :rate_limit_per_minute, :created_at, :revoked_at)",
                row,
            )
            self._conn.commit()
        return row

    def list_keys(self) -> list[dict[str, Any]]:
        with self._lock:
            rows = self._conn.execute("SELECT * FROM api_keys ORDER BY created_at").fetchall()
        return [dict(r) for r in rows]

    def find_active_key(self, key_hash: str) -> dict[str, Any] | None:
        with self._lock:
            row = self._conn.execute(
                "SELECT * FROM api_keys WHERE key_hash = ? AND revoked_at IS NULL", (key_hash,)
            ).fetchone()
        return dict(row) if row else None

    def revoke_key(self, key_id: str) -> bool:
        with self._lock:
            cur = self._conn.execute(
                "UPDATE api_keys SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL", (_now(), key_id)
            )
            self._conn.commit()
        return cur.rowcount == 1

    # Notifications

    def add_notification(self, api_key_id: str, data: dict[str, Any], status: str, error: str | None) -> dict[str, Any]:
        row = {
            "id": f"ntf_{uuid.uuid4().hex[:16]}",
            "api_key_id": api_key_id,
            "channel": data["channel"],
            "recipient": data["recipient"],
            "subject": data["subject"],
            "body": data["body"],
            "metadata": json.dumps(data["metadata"]),
            "status": status,
            "error": error,
            "created_at": _now(),
        }
        with self._lock:
            self._conn.execute(
                "INSERT INTO notifications VALUES (:id, :api_key_id, :channel, :recipient, :subject, :body,"
                " :metadata, :status, :error, :created_at)",
                row,
            )
            self._conn.commit()
        return _decode(row)

    def list_notifications(self, api_key_id: str, limit: int) -> list[dict[str, Any]]:
        with self._lock:
            rows = self._conn.execute(
                "SELECT * FROM notifications WHERE api_key_id = ? ORDER BY created_at DESC LIMIT ?",
                (api_key_id, limit),
            ).fetchall()
        return [_decode(dict(r)) for r in rows]


def _decode(row: dict[str, Any]) -> dict[str, Any]:
    return {**row, "metadata": json.loads(row["metadata"])}
