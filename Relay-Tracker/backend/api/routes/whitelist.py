"""Whitelist management routes for Relay API."""

import re
from flask import Blueprint, jsonify, request, g

from ..utils.auth import require_auth, require_role, log_activity
from ..utils.database import (
    get_all_whitelisted_emails,
    add_email_to_whitelist,
    remove_email_from_whitelist,
    get_whitelisted_email_by_id,
    is_email_whitelisted,
    get_user_by_id,
)

whitelist_bp = Blueprint("whitelist", __name__, url_prefix="/api/whitelist")


def is_valid_email(email: str) -> bool:
    """Validate email format."""
    pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
    return bool(re.match(pattern, email))


@whitelist_bp.route("", methods=["GET"])
@require_auth
@require_role("admin")
def list_whitelisted_emails():
    """List all whitelisted emails (admin only)."""
    emails = get_all_whitelisted_emails()
    return jsonify({"emails": emails, "total": len(emails)})


@whitelist_bp.route("", methods=["POST"])
@require_auth
@require_role("admin")
def add_whitelist_email():
    """Add email to whitelist (admin only)."""
    data = request.get_json()

    if not data:
        return jsonify({"error": "No data provided"}), 400

    email = data.get("email", "").strip()
    notes = data.get("notes", "").strip() or None

    # Validate email
    if not email:
        return jsonify({"error": "Email is required"}), 400

    if not is_valid_email(email):
        return jsonify({"error": "Invalid email format"}), 400

    # Get current user from Flask's g object
    current_user = g.user

    try:
        result = add_email_to_whitelist(email, current_user["user_id"], notes)

        # Log the action
        log_activity(
            current_user["user_id"],
            "whitelist_add",
            metadata={"email": email, "notes": notes}
        )

        return jsonify({"success": True, "email": result}), 201

    except ValueError as e:
        return jsonify({"error": str(e)}), 409


@whitelist_bp.route("/<int:email_id>", methods=["DELETE"])
@require_auth
@require_role("admin")
def remove_whitelist_email(email_id: int):
    """Remove email from whitelist (admin only)."""
    current_user = g.user

    # Get the email being removed
    email_record = get_whitelisted_email_by_id(email_id)
    if not email_record:
        return jsonify({"error": "Email not found in whitelist"}), 404

    # Prevent removing own email
    if email_record["email"].lower() == current_user["email"].lower():
        return jsonify({"error": "You cannot remove your own email from the whitelist"}), 400

    try:
        remove_email_from_whitelist(email_id)

        # Log the action
        log_activity(
            current_user["user_id"],
            "whitelist_remove",
            metadata={"email": email_record["email"], "email_id": email_id}
        )

        return jsonify({
            "success": True,
            "message": f"Email {email_record['email']} removed from whitelist"
        })

    except ValueError as e:
        return jsonify({"error": str(e)}), 404


@whitelist_bp.route("/check/<email>", methods=["GET"])
@require_auth
@require_role("admin")
def check_email_whitelisted(email: str):
    """Check if an email is whitelisted (admin only)."""
    if not is_valid_email(email):
        return jsonify({"error": "Invalid email format"}), 400

    whitelisted = is_email_whitelisted(email)
    return jsonify({"email": email, "whitelisted": whitelisted})
