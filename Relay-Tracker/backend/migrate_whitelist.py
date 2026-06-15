#!/usr/bin/env python3
"""
Migration script to create the allowed_emails whitelist table.
Safe to run multiple times (idempotent).

Usage:
    python migrate_whitelist.py
"""

import os
import sys

# Add the parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
import libsql_experimental as libsql

# Load environment variables
load_dotenv()


def get_connection():
    """Get database connection."""
    turso_url = os.getenv("TURSO_DATABASE_URL")
    turso_token = os.getenv("TURSO_AUTH_TOKEN")

    if not turso_url:
        raise ValueError("TURSO_DATABASE_URL must be set")

    if turso_token:
        return libsql.connect(turso_url, auth_token=turso_token)
    else:
        return libsql.connect(turso_url)


def migrate():
    """Run the whitelist migration."""
    print("Starting whitelist migration...")

    conn = get_connection()

    # Create allowed_emails table
    print("Creating allowed_emails table...")
    conn.execute("""
        CREATE TABLE IF NOT EXISTS allowed_emails (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL UNIQUE,
            added_by TEXT,
            notes TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (added_by) REFERENCES user_roles(user_id) ON DELETE SET NULL
        )
    """)

    # Create index for faster email lookups
    print("Creating index on email column...")
    try:
        conn.execute("CREATE INDEX IF NOT EXISTS idx_allowed_emails_email ON allowed_emails(email)")
    except Exception as e:
        if "already exists" not in str(e).lower():
            print(f"Warning: Could not create index: {e}")

    conn.commit()
    print("Table created successfully!")

    # Auto-whitelist existing users from user_roles
    print("\nAuto-whitelisting existing users...")
    existing_users = conn.execute(
        "SELECT DISTINCT email FROM user_roles WHERE email IS NOT NULL"
    ).fetchall()

    whitelisted_count = 0
    for (email,) in existing_users:
        try:
            conn.execute(
                "INSERT OR IGNORE INTO allowed_emails (email, notes) VALUES (?, ?)",
                (email.lower(), "Auto-whitelisted from existing users")
            )
            whitelisted_count += 1
        except Exception as e:
            print(f"  Skipped {email}: {e}")

    conn.commit()
    print(f"Whitelisted {whitelisted_count} existing users.")

    # Print summary
    total_whitelisted = conn.execute("SELECT COUNT(*) FROM allowed_emails").fetchone()[0]
    print(f"\nMigration complete! Total whitelisted emails: {total_whitelisted}")

    # List all whitelisted emails
    print("\nWhitelisted emails:")
    emails = conn.execute("SELECT email, notes, created_at FROM allowed_emails ORDER BY created_at").fetchall()
    for email, notes, created_at in emails:
        print(f"  - {email} ({notes or 'No notes'}) - {created_at}")


if __name__ == "__main__":
    migrate()
