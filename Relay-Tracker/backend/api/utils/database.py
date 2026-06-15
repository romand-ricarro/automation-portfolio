"""Turso/libsql database utilities for Relay API."""

import os
import json
from typing import Optional
import libsql_experimental as libsql

# Database connection singleton
_connection = None


def get_connection():
    """Get or create a database connection."""
    global _connection

    if _connection is None:
        turso_url = os.getenv("TURSO_DATABASE_URL")
        turso_token = os.getenv("TURSO_AUTH_TOKEN")

        if not turso_url:
            raise ValueError("TURSO_DATABASE_URL must be set")

        # Connect to Turso (remote) or local SQLite
        if turso_token:
            _connection = libsql.connect(turso_url, auth_token=turso_token)
        else:
            # Local SQLite for development
            _connection = libsql.connect(turso_url)

    return _connection


def init_database():
    """Initialize the database schema."""
    conn = get_connection()

    # Read and execute schema
    schema_path = os.path.join(os.path.dirname(__file__), "..", "models", "schema.sql")
    with open(schema_path, "r") as f:
        schema = f.read()

    # Split by semicolons and execute each statement
    statements = [s.strip() for s in schema.split(";") if s.strip()]
    for statement in statements:
        if statement:
            try:
                conn.execute(statement)
            except Exception as e:
                # Ignore "already exists" errors
                if "already exists" not in str(e).lower():
                    print(f"Schema error: {e}")

    conn.commit()


def get_user_by_id(user_id: str) -> Optional[dict]:
    """Get a user by their Google sub ID."""
    conn = get_connection()
    result = conn.execute(
        "SELECT user_id, email, name, avatar_url, role, created_at, updated_at FROM user_roles WHERE user_id = ?",
        (user_id,)
    ).fetchone()

    if result:
        return {
            "user_id": result[0],
            "email": result[1],
            "name": result[2],
            "avatar_url": result[3],
            "role": result[4],
            "created_at": result[5],
            "updated_at": result[6],
        }
    return None


def get_user_by_email(email: str) -> Optional[dict]:
    """Get a user by their email address."""
    conn = get_connection()
    result = conn.execute(
        "SELECT user_id, email, name, avatar_url, role, created_at, updated_at FROM user_roles WHERE email = ?",
        (email,)
    ).fetchone()

    if result:
        return {
            "user_id": result[0],
            "email": result[1],
            "name": result[2],
            "avatar_url": result[3],
            "role": result[4],
            "created_at": result[5],
            "updated_at": result[6],
        }
    return None


def get_users_by_emails(emails: list[str]) -> list[dict]:
    """Get multiple users by their email addresses in a single query."""
    if not emails:
        return []
    
    conn = get_connection()
    # Create placeholders for IN clause
    placeholders = ", ".join(["?" for _ in emails])
    query = f"""
        SELECT user_id, email, name, avatar_url, role, created_at, updated_at 
        FROM user_roles 
        WHERE email IN ({placeholders})
    """
    
    results = conn.execute(query, tuple(emails)).fetchall()
    
    return [
        {
            "user_id": r[0],
            "email": r[1],
            "name": r[2],
            "avatar_url": r[3],
            "role": r[4],
            "created_at": r[5],
            "updated_at": r[6],
        }
        for r in results
    ]


def create_user(user_id: str, email: str, name: str = None, avatar_url: str = None) -> dict:
    """Create a new user. First user gets admin role.

    Raises:
        ValueError: If email is not whitelisted
    """
    conn = get_connection()

    # Check if email is whitelisted (skip check if no whitelist table exists yet or is empty)
    try:
        whitelist_count = conn.execute("SELECT COUNT(*) FROM allowed_emails").fetchone()[0]
        if whitelist_count > 0 and not is_email_whitelisted(email):
            raise ValueError(
                f"Email {email} is not authorized to access this application. "
                "Please contact an administrator."
            )
    except Exception as e:
        # If table doesn't exist yet, skip whitelist check (first-time setup)
        if "no such table" not in str(e).lower():
            raise

    # Check if this is the first user
    count = conn.execute("SELECT COUNT(*) FROM user_roles").fetchone()[0]
    role = "admin" if count == 0 else "user"

    # Insert user
    conn.execute(
        """INSERT INTO user_roles (user_id, email, name, avatar_url, role)
           VALUES (?, ?, ?, ?, ?)""",
        (user_id, email, name, avatar_url, role)
    )

    # Insert default preferences
    conn.execute(
        """INSERT INTO user_preferences (user_id, email_notifications, discord_notifications, theme)
           VALUES (?, 1, 1, 'system')""",
        (user_id,)
    )

    conn.commit()

    return get_user_by_id(user_id)


def get_or_create_user(user_id: str, email: str, name: str = None, avatar_url: str = None) -> dict:
    """Get existing user or create a new one."""
    user = get_user_by_id(user_id)
    if user:
        # Update user info if changed
        conn = get_connection()
        conn.execute(
            """UPDATE user_roles SET email = ?, name = ?, avatar_url = ? WHERE user_id = ?""",
            (email, name, avatar_url, user_id)
        )
        conn.commit()
        return get_user_by_id(user_id)
    return create_user(user_id, email, name, avatar_url)


def get_user_preferences(user_id: str) -> Optional[dict]:
    """Get user preferences."""
    conn = get_connection()
    result = conn.execute(
        """SELECT email_notifications, discord_notifications, theme FROM user_preferences WHERE user_id = ?""",
        (user_id,)
    ).fetchone()

    if result:
        return {
            "email_notifications": bool(result[0]),
            "discord_notifications": bool(result[1]),
            "theme": result[2],
        }
    return None


def update_user_preferences(user_id: str, **kwargs) -> dict:
    """Update user preferences."""
    conn = get_connection()

    updates = []
    values = []

    if "email_notifications" in kwargs:
        updates.append("email_notifications = ?")
        values.append(1 if kwargs["email_notifications"] else 0)

    if "discord_notifications" in kwargs:
        updates.append("discord_notifications = ?")
        values.append(1 if kwargs["discord_notifications"] else 0)

    if "theme" in kwargs:
        updates.append("theme = ?")
        values.append(kwargs["theme"])

    if updates:
        values.append(user_id)
        conn.execute(
            f"UPDATE user_preferences SET {', '.join(updates)} WHERE user_id = ?",
            tuple(values)
        )
        conn.commit()

    return get_user_preferences(user_id)


def update_user_role(user_id: str, role: str) -> Optional[dict]:
    """Update a user's role."""
    conn = get_connection()
    conn.execute(
        "UPDATE user_roles SET role = ? WHERE user_id = ?",
        (role, user_id)
    )
    conn.commit()
    return get_user_by_id(user_id)


def get_all_users() -> list:
    """Get all users (admin only)."""
    conn = get_connection()
    results = conn.execute(
        "SELECT user_id, email, name, avatar_url, role, created_at FROM user_roles ORDER BY created_at"
    ).fetchall()

    return [
        {
            "user_id": r[0],
            "email": r[1],
            "name": r[2],
            "avatar_url": r[3],
            "role": r[4],
            "created_at": r[5],
        }
        for r in results
    ]


def log_activity(user_id: str, action: str, jira_issue_key: str = None, metadata: dict = None):
    """Log user activity."""
    conn = get_connection()
    conn.execute(
        """INSERT INTO activity_log (user_id, action, jira_issue_key, metadata)
           VALUES (?, ?, ?, ?)""",
        (user_id, action, jira_issue_key, json.dumps(metadata or {}))
    )
    conn.commit()


# ============================================
# Email Whitelist Functions
# ============================================

def is_email_whitelisted(email: str) -> bool:
    """Check if email is in the whitelist (case-insensitive)."""
    conn = get_connection()
    result = conn.execute(
        "SELECT COUNT(*) FROM allowed_emails WHERE LOWER(email) = LOWER(?)",
        (email,)
    ).fetchone()
    return result[0] > 0


def get_all_whitelisted_emails() -> list:
    """Get all whitelisted emails with metadata."""
    conn = get_connection()
    results = conn.execute(
        """SELECT ae.id, ae.email, ae.added_by, ae.notes, ae.created_at, ur.name as added_by_name
           FROM allowed_emails ae
           LEFT JOIN user_roles ur ON ae.added_by = ur.user_id
           ORDER BY ae.created_at DESC"""
    ).fetchall()

    return [
        {
            "id": r[0],
            "email": r[1],
            "added_by": r[2],
            "notes": r[3],
            "created_at": r[4],
            "added_by_name": r[5],
        }
        for r in results
    ]


def add_email_to_whitelist(email: str, added_by: str, notes: str = None) -> dict:
    """Add email to whitelist."""
    conn = get_connection()

    # Check if already exists
    existing = conn.execute(
        "SELECT id FROM allowed_emails WHERE LOWER(email) = LOWER(?)",
        (email,)
    ).fetchone()

    if existing:
        raise ValueError(f"Email {email} is already whitelisted")

    # Insert new email (store lowercase)
    conn.execute(
        """INSERT INTO allowed_emails (email, added_by, notes)
           VALUES (?, ?, ?)""",
        (email.lower(), added_by, notes)
    )
    conn.commit()

    # Return the added email record
    result = conn.execute(
        """SELECT ae.id, ae.email, ae.added_by, ae.notes, ae.created_at, ur.name as added_by_name
           FROM allowed_emails ae
           LEFT JOIN user_roles ur ON ae.added_by = ur.user_id
           WHERE LOWER(ae.email) = LOWER(?)""",
        (email,)
    ).fetchone()

    return {
        "id": result[0],
        "email": result[1],
        "added_by": result[2],
        "notes": result[3],
        "created_at": result[4],
        "added_by_name": result[5],
    }


def remove_email_from_whitelist(email_id: int) -> bool:
    """Remove email from whitelist by ID."""
    conn = get_connection()

    # Check if exists
    existing = conn.execute(
        "SELECT email FROM allowed_emails WHERE id = ?",
        (email_id,)
    ).fetchone()

    if not existing:
        raise ValueError(f"Email with ID {email_id} not found in whitelist")

    conn.execute("DELETE FROM allowed_emails WHERE id = ?", (email_id,))
    conn.commit()

    return True


def get_whitelisted_email_by_id(email_id: int) -> Optional[dict]:
    """Get a whitelisted email by ID."""
    conn = get_connection()
    result = conn.execute(
        """SELECT ae.id, ae.email, ae.added_by, ae.notes, ae.created_at, ur.name as added_by_name
           FROM allowed_emails ae
           LEFT JOIN user_roles ur ON ae.added_by = ur.user_id
           WHERE ae.id = ?""",
        (email_id,)
    ).fetchone()

    if result:
        return {
            "id": result[0],
            "email": result[1],
            "added_by": result[2],
            "notes": result[3],
            "created_at": result[4],
            "added_by_name": result[5],
        }
    return None


# ============================================
# Issue Attachment Functions
# ============================================

def add_attachment(id: str, issue_key: str, uploader_id: str, filename: str, url: str, size: int, mime_type: str):
    """Save attachment metadata to the database."""
    conn = get_connection()
    conn.execute(
        """INSERT INTO issue_attachments (id, issue_key, uploader_id, filename, url, size, mime_type)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (id, issue_key, uploader_id, filename, url, size, mime_type)
    )
    conn.commit()


def get_issue_attachments(issue_key: str) -> list:
    """Get all attachments for an issue."""
    conn = get_connection()
    results = conn.execute(
        "SELECT id, issue_key, uploader_id, filename, url, size, mime_type, created_at FROM issue_attachments WHERE issue_key = ?",
        (issue_key,)
    ).fetchall()
    return [
        {
            "id": r[0],
            "issue_key": r[1],
            "uploader_id": r[2],
            "filename": r[3],
            "url": r[4],
            "size": r[5],
            "mime_type": r[6],
            "created_at": r[7],
        }
        for r in results
    ]
