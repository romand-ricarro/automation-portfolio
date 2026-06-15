"""Authentication routes for Relay API."""

from flask import Blueprint, jsonify, request, g

from ..utils.auth import (
    require_auth,
    require_role,
    get_user_preferences,
    log_activity,
)
from ..utils.database import (
    update_user_preferences,
    update_user_role as db_update_user_role,
    get_all_users,
    get_user_by_id,
)

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@auth_bp.route("/me", methods=["GET"])
@require_auth
def get_current_user():
    """
    Get the current authenticated user's information.

    Returns:
        User info including role and preferences
    """
    user = g.user
    preferences = get_user_preferences(user["user_id"])

    return jsonify({
        "id": user["user_id"],
        "email": user["email"],
        "name": user.get("name", user["email"]),
        "avatar_url": user.get("avatar_url"),
        "role": user["role"],
        "preferences": preferences,
    })


@auth_bp.route("/verify", methods=["POST"])
@require_auth
def verify_token():
    """
    Verify that a token is valid.

    Returns:
        Verification status and user info
    """
    user = g.user

    return jsonify({
        "valid": True,
        "user_id": user["user_id"],
        "email": user["email"],
        "role": user["role"],
    })


@auth_bp.route("/logout", methods=["POST"])
@require_auth
def logout():
    """
    Log out the current user.

    Note: Since we use Google ID tokens, the actual logout happens on the frontend
    by clearing the token. This endpoint logs the activity.
    """
    user = g.user
    log_activity(user["user_id"], "logout")

    return jsonify({
        "success": True,
        "message": "Logged out successfully",
    })


@auth_bp.route("/preferences", methods=["PUT"])
@require_auth
def update_preferences_route():
    """
    Update the current user's preferences.

    Request body:
        {
            "email_notifications": bool,
            "discord_notifications": bool,
            "theme": "light" | "dark" | "system"
        }
    """
    user = g.user
    data = request.get_json()

    if not data:
        return jsonify({"error": "No data provided"}), 400

    # Validate theme if provided
    valid_themes = ["light", "dark", "system"]
    if "theme" in data and data["theme"] not in valid_themes:
        return jsonify({"error": f"Invalid theme. Must be one of: {valid_themes}"}), 400

    try:
        # Build update data
        update_data = {}
        if "email_notifications" in data:
            update_data["email_notifications"] = bool(data["email_notifications"])
        if "discord_notifications" in data:
            update_data["discord_notifications"] = bool(data["discord_notifications"])
        if "theme" in data:
            update_data["theme"] = data["theme"]

        if not update_data:
            return jsonify({"error": "No valid fields to update"}), 400

        # Update preferences
        preferences = update_user_preferences(user["user_id"], **update_data)

        log_activity(user["user_id"], "update_preferences", metadata=update_data)

        return jsonify({
            "success": True,
            "preferences": preferences,
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# Admin routes

@auth_bp.route("/users", methods=["GET"])
@require_auth
@require_role("admin")
def list_users():
    """
    List all users with their roles.
    Admin only.
    """
    try:
        users = get_all_users()

        return jsonify({
            "users": users,
            "total": len(users),
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@auth_bp.route("/users/<user_id>/role", methods=["PUT"])
@require_auth
@require_role("admin")
def update_user_role_route(user_id):
    """
    Update a user's role.
    Admin only.

    Request body:
        {
            "role": "user" | "sqa" | "admin"
        }
    """
    data = request.get_json()

    if not data or "role" not in data:
        return jsonify({"error": "Role is required"}), 400

    valid_roles = ["user", "sqa", "admin"]
    if data["role"] not in valid_roles:
        return jsonify({"error": f"Invalid role. Must be one of: {valid_roles}"}), 400

    # Prevent admin from demoting themselves
    admin_user = g.user
    if user_id == admin_user["user_id"] and data["role"] != "admin":
        return jsonify({"error": "Cannot change your own admin role"}), 400

    try:
        # Check if user exists
        existing = get_user_by_id(user_id)
        if not existing:
            return jsonify({"error": "User not found"}), 404

        # Update role
        db_update_user_role(user_id, data["role"])

        log_activity(
            admin_user["user_id"],
            "update_user_role",
            metadata={"target_user_id": user_id, "new_role": data["role"]},
        )

        return jsonify({
            "success": True,
            "user_id": user_id,
            "role": data["role"],
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500
