"""
API endpoints for notification preferences.
"""
from flask import Blueprint, jsonify, request, g
import logging
from models.database import db, NotificationPreference, User, ActionItem, Session
from services.auth_service import require_auth, require_role
from services.email_service import (
    send_test_email, send_weekly_digest_email, send_action_item_reminder_email
)
from marshmallow import Schema, fields, validate, ValidationError
from datetime import datetime, timedelta

logger = logging.getLogger('insightpulse.api.notifications')
bp = Blueprint('notifications', __name__, url_prefix='/api/notifications')


# Validation schemas
class NotificationPreferenceSchema(Schema):
    """Schema for updating notification preferences."""
    analysis_complete = fields.Boolean()
    action_item_assigned = fields.Boolean()
    action_item_reminder = fields.Boolean()
    weekly_digest = fields.Boolean()
    email_override = fields.Email(allow_none=True)


@bp.route('/preferences', methods=['GET', 'OPTIONS'])
@require_auth
def get_preferences():
    """
    Get current user's notification preferences.
    Creates default preferences if they don't exist.
    """
    prefs = NotificationPreference.query.filter_by(user_id=g.user.id).first()

    if not prefs:
        # Create default preferences
        prefs = NotificationPreference(
            user_id=g.user.id,
            analysis_complete=True,
            action_item_assigned=True,
            action_item_reminder=True,
            weekly_digest=True
        )
        db.session.add(prefs)
        db.session.commit()
        logger.info(f"Created default notification preferences for user {g.user.id}")

    return jsonify(prefs.to_dict())


@bp.route('/preferences', methods=['PUT', 'OPTIONS'])
@require_auth
def update_preferences():
    """
    Update current user's notification preferences.
    """
    data = request.get_json() or {}

    # Validate input
    schema = NotificationPreferenceSchema()
    try:
        validated = schema.load(data)
    except ValidationError as err:
        return jsonify({'error': 'Validation failed', 'details': err.messages}), 400

    # Get or create preferences
    prefs = NotificationPreference.query.filter_by(user_id=g.user.id).first()
    if not prefs:
        prefs = NotificationPreference(user_id=g.user.id)
        db.session.add(prefs)

    # Update fields
    for key, value in validated.items():
        if hasattr(prefs, key):
            setattr(prefs, key, value)

    try:
        db.session.commit()
        logger.info(f"Updated notification preferences for user {g.user.id}")
        return jsonify(prefs.to_dict())

    except Exception as e:
        db.session.rollback()
        logger.exception(f"Failed to update preferences: {e}")
        return jsonify({'error': str(e)}), 500


@bp.route('/test', methods=['POST', 'OPTIONS'])
@require_auth
def send_test():
    """
    Send a test email to the current user.
    """
    # Get user's email (or override)
    prefs = NotificationPreference.query.filter_by(user_id=g.user.id).first()
    email = prefs.email_override if prefs and prefs.email_override else g.user.email

    result = send_test_email(email)

    if result.get('sent'):
        logger.info(f"Test email sent to {email} for user {g.user.id}")
        return jsonify({'message': f'Test email sent to {email}', 'email_id': result.get('id')})
    else:
        return jsonify({'error': result.get('error', 'Failed to send email')}), 500


@bp.route('/trigger/reminders', methods=['POST', 'OPTIONS'])
@require_auth
@require_role('admin')
def trigger_reminders():
    """
    Manually trigger overdue action item reminders (admin only).
    Normally called by a cron job.
    """
    sent_count = 0
    errors = []

    try:
        # Find users with overdue action items
        today = datetime.now().date()

        # Get all overdue items grouped by person_in_charge
        overdue_items = ActionItem.query.filter(
            ActionItem.deadline < today,
            ActionItem.status.in_(['Open', 'In Progress'])
        ).all()

        # Group by assignee (person_in_charge)
        assignee_items = {}
        for item in overdue_items:
            if item.person_in_charge:
                if item.person_in_charge not in assignee_items:
                    assignee_items[item.person_in_charge] = []
                assignee_items[item.person_in_charge].append(item.to_dict())

        # Find users who match assignees and have reminders enabled
        for assignee_name, items in assignee_items.items():
            # Try to find user by name match (simple matching)
            user = User.query.filter(
                User.name.ilike(f"%{assignee_name}%"),
                User.is_active == True
            ).first()

            if user:
                prefs = NotificationPreference.query.filter_by(user_id=user.id).first()
                if prefs and prefs.action_item_reminder:
                    email = prefs.email_override or user.email
                    result = send_action_item_reminder_email(email, user.name or assignee_name, items)
                    if result.get('sent'):
                        sent_count += 1
                    else:
                        errors.append(f"Failed to send to {email}: {result.get('error')}")

        logger.info(f"Reminder emails sent: {sent_count}")
        return jsonify({
            'message': f'Sent {sent_count} reminder email(s)',
            'sent_count': sent_count,
            'errors': errors if errors else None
        })

    except Exception as e:
        logger.exception(f"Failed to send reminders: {e}")
        return jsonify({'error': str(e)}), 500


@bp.route('/trigger/digest', methods=['POST', 'OPTIONS'])
@require_auth
@require_role('admin')
def trigger_weekly_digest():
    """
    Manually trigger weekly digest emails (admin only).
    Normally called by a cron job.
    """
    sent_count = 0
    errors = []

    try:
        # Get users with weekly digest enabled
        prefs_with_digest = NotificationPreference.query.filter_by(weekly_digest=True).all()

        # Calculate date range for the week
        today = datetime.now()
        week_ago = today - timedelta(days=7)

        for pref in prefs_with_digest:
            user = User.query.get(pref.user_id)
            if not user or not user.is_active:
                continue

            # Gather digest data
            sessions = Session.query.filter(
                Session.created_at >= week_ago,
                Session.created_at <= today
            ).all()

            action_items_created = ActionItem.query.filter(
                ActionItem.created_at >= week_ago,
                ActionItem.created_at <= today
            ).count()

            action_items_completed = ActionItem.query.filter(
                ActionItem.updated_at >= week_ago,
                ActionItem.status == 'Completed'
            ).count()

            digest_data = {
                'sessions_analyzed': len([s for s in sessions if s.status == 'analyzed']),
                'total_responses': sum(s.num_responses or 0 for s in sessions),
                'action_items_created': action_items_created,
                'action_items_completed': action_items_completed,
                'recent_sessions': [s.to_dict() for s in sessions[:5]]
            }

            email = pref.email_override or user.email
            result = send_weekly_digest_email(email, user.name or user.email, digest_data)

            if result.get('sent'):
                sent_count += 1
            else:
                errors.append(f"Failed to send to {email}: {result.get('error')}")

        logger.info(f"Weekly digest emails sent: {sent_count}")
        return jsonify({
            'message': f'Sent {sent_count} weekly digest email(s)',
            'sent_count': sent_count,
            'errors': errors if errors else None
        })

    except Exception as e:
        logger.exception(f"Failed to send weekly digest: {e}")
        return jsonify({'error': str(e)}), 500


@bp.route('/status', methods=['GET', 'OPTIONS'])
@require_auth
@require_role('admin')
def get_email_status():
    """
    Get email service status (admin only).
    """
    import os

    resend_configured = bool(os.environ.get('RESEND_API_KEY'))
    from_email = os.environ.get('FROM_EMAIL', 'Not configured')
    app_url = os.environ.get('APP_URL', os.environ.get('FRONTEND_URL', 'Not configured'))

    # Count users with notifications enabled
    total_prefs = NotificationPreference.query.count()
    analysis_enabled = NotificationPreference.query.filter_by(analysis_complete=True).count()
    assignment_enabled = NotificationPreference.query.filter_by(action_item_assigned=True).count()
    reminder_enabled = NotificationPreference.query.filter_by(action_item_reminder=True).count()
    digest_enabled = NotificationPreference.query.filter_by(weekly_digest=True).count()

    return jsonify({
        'service_configured': resend_configured,
        'from_email': from_email,
        'app_url': app_url,
        'preferences': {
            'total_users': total_prefs,
            'analysis_complete_enabled': analysis_enabled,
            'action_item_assigned_enabled': assignment_enabled,
            'action_item_reminder_enabled': reminder_enabled,
            'weekly_digest_enabled': digest_enabled
        }
    })
