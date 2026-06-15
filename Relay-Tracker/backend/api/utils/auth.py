"""Authentication utilities for Relay API using Google OAuth."""

import os
from functools import wraps
from typing import Optional

from flask import request, jsonify, g
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

from .database import (
    get_or_create_user,
    get_user_by_id,
    get_user_preferences as db_get_user_preferences,
    log_activity as db_log_activity,
)


def get_google_client_id() -> str:
    """Get the Google OAuth Client ID."""
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    if not client_id:
        raise ValueError("GOOGLE_CLIENT_ID must be set")
    return client_id


def verify_google_token(token: str) -> Optional[dict]:
    """
    Verify a Google ID token and return user info.

    Args:
        token: The Google ID token to verify

    Returns:
        User info dict or None if invalid
    """
    try:
        client_id = get_google_client_id()
        idinfo = id_token.verify_oauth2_token(
            token,
            google_requests.Request(),
            client_id
        )

        # Token is valid, extract user info
        return {
            "sub": idinfo["sub"],  # Unique Google user ID
            "email": idinfo.get("email"),
            "name": idinfo.get("name"),
            "picture": idinfo.get("picture"),
            "email_verified": idinfo.get("email_verified", False),
        }
    except Exception as e:
        print(f"Token verification failed: {e}")
        return None


def get_user_from_token(token: str) -> Optional[dict]:
    """
    Get or create user from a Google ID token.

    Args:
        token: The Google ID token

    Returns:
        Full user info dict including role, or None if invalid
    """
    google_user = verify_google_token(token)
    if not google_user:
        return None

    # Get or create user in database
    user = get_or_create_user(
        user_id=google_user["sub"],
        email=google_user["email"],
        name=google_user.get("name"),
        avatar_url=google_user.get("picture"),
    )

    if user:
        # Add the token info
        user["email_verified"] = google_user.get("email_verified", False)

    return user


def get_user_role(user_id: str) -> Optional[str]:
    """
    Get the role for a user from the database.

    Args:
        user_id: The user's Google sub ID

    Returns:
        The user's role or None if not found
    """
    user = get_user_by_id(user_id)
    if user:
        return user.get("role")
    return None


def get_user_preferences(user_id: str) -> Optional[dict]:
    """
    Get preferences for a user from the database.

    Args:
        user_id: The user's Google sub ID

    Returns:
        The user's preferences or None if not found
    """
    return db_get_user_preferences(user_id)


def require_auth(f):
    """
    Decorator to require authentication for a route.

    Usage:
        @app.route('/api/protected')
        @require_auth
        def protected_route():
            user = g.user  # Access the authenticated user
            return jsonify(user)
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get("Authorization")

        if not auth_header:
            # Check for emergency bypass in development
            if os.getenv("DEV_BYPASS_AUTH") == "true" and request.headers.get("X-Dev-Bypass") == "true":
                user = {
                    "user_id": "dev-admin-123",
                    "email": "romand.ricarro@foodstyles.com",
                    "name": "Dev Admin",
                    "role": "admin",
                    "email_verified": True
                }
                g.user = user
                g.user_role = "admin"
                return f(*args, **kwargs)
            return jsonify({"error": "Missing authorization header"}), 401

        parts = auth_header.split()
        if len(parts) != 2 or parts[0].lower() != "bearer":
            return jsonify({"error": "Invalid authorization header format"}), 401

        token = parts[1]
        
        # Check for dev token if bypass is enabled
        if os.getenv("DEV_BYPASS_AUTH") == "true" and token == "dev-token-secret":
            user = {
                "user_id": "dev-admin-123",
                "email": "romand.ricarro@foodstyles.com",
                "name": "Dev Admin",
                "role": "admin",
                "email_verified": True
            }
            g.user = user
            g.user_role = "admin"
            return f(*args, **kwargs)

        try:
            user = get_user_from_token(token)
        except ValueError as e:
            # Whitelist/authorization error
            return jsonify({"error": str(e)}), 401
        except Exception as e:
            print(f"Error getting user from token: {e}")
            return jsonify({"error": "Authentication failed"}), 401

        if not user:
            return jsonify({"error": "Invalid or expired token"}), 401

        # Store user info in Flask's g object
        g.user = user
        g.user_role = user.get("role")

        return f(*args, **kwargs)

    return decorated_function


def require_role(*allowed_roles):
    """
    Decorator to require specific roles for a route.
    Must be used after @require_auth.

    Usage:
        @app.route('/api/admin')
        @require_auth
        @require_role('admin')
        def admin_route():
            return jsonify({"message": "Admin only"})

        @app.route('/api/sqa')
        @require_auth
        @require_role('admin', 'sqa')
        def sqa_route():
            return jsonify({"message": "Admin or SQA"})
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not hasattr(g, "user_role"):
                return jsonify({"error": "Authentication required"}), 401

            if g.user_role not in allowed_roles:
                return jsonify({
                    "error": "Insufficient permissions",
                    "required_roles": list(allowed_roles),
                    "current_role": g.user_role,
                }), 403

            return f(*args, **kwargs)

        return decorated_function

    return decorator


def log_activity(user_id: str, action: str, jira_issue_key: str = None, metadata: dict = None):
    """
    Log user activity to the database.

    Args:
        user_id: The user's Google sub ID
        action: Description of the action
        jira_issue_key: Optional Jira issue key
        metadata: Optional additional metadata
    """
    try:
        db_log_activity(user_id, action, jira_issue_key, metadata)
    except Exception as e:
        # Log error but don't fail the request
        print(f"Failed to log activity: {e}")
