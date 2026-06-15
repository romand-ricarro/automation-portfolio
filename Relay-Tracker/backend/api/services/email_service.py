"""
Resend Email Service for Relay Tracker

Handles sending branded HTML email notifications to users.
Respects user preferences for email_notifications toggle.
"""

import os
import logging
import resend

logger = logging.getLogger(__name__)

# Environment variables
resend.api_key = os.environ.get("RESEND_API_KEY")
APP_URL = os.environ.get("VITE_APP_URL", "https://relay-foodstyles.vercel.app")

# NOTE: Using onboarding@resend.dev until we verify a custom domain
FROM_EMAIL = "onboarding@resend.dev"


def is_configured() -> bool:
    """Check if Resend is properly configured."""
    return bool(resend.api_key)


def send_issue_receipt(user_email: str, issue_key: str, summary: str) -> dict | None:
    """
    Sends a receipt to the user after issue creation.
    NOTE: For now, 'from' must be 'onboarding@resend.dev' until we verify a domain.

    Args:
        user_email: Recipient email address
        issue_key: The Jira issue key (e.g., "BUG-123")
        summary: The issue summary/title

    Returns:
        Response dict with 'id' if successful, None otherwise
    """
    if not resend.api_key:
        logger.warning("Resend API key not configured, skipping email send")
        return None

    try:
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6;">
            <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                <div style="background: linear-gradient(135deg, #f97316 0%, #ef4444 100%); padding: 32px; border-radius: 16px 16px 0 0; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 28px;">Issue Received: {issue_key}</h1>
                </div>
                <div style="background: white; padding: 32px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <p style="color: #4b5563; line-height: 1.6; margin: 0 0 24px 0;">
                        Thanks for reporting "<strong>{summary}</strong>".
                    </p>
                    <p style="color: #4b5563; line-height: 1.6; margin: 0 0 24px 0;">
                        Our team has been notified.
                    </p>
                    <div style="text-align: center;">
                        <a href="{APP_URL}/issues/{issue_key}"
                           style="display: inline-block; background: #f97316; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">
                            View Status
                        </a>
                    </div>
                </div>
                <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 24px;">
                    Relay Tracker • Fast track from report to resolution
                </p>
            </div>
        </body>
        </html>
        """

        r = resend.Emails.send({
            "from": FROM_EMAIL,
            "to": user_email,
            "subject": f"[{issue_key}] Report Received",
            "html": html_content
        })
        logger.info(f"[Email] Sent receipt to {user_email} (ID: {r.get('id')})")
        return r
    except Exception as e:
        logger.error(f"[Email] Failed to send: {e}")
        return None


def _should_send_email(user_email: str) -> bool:
    """
    Check if user has email notifications enabled.

    Args:
        user_email: User's email address to look up

    Returns:
        True if email should be sent, False otherwise
    """
    try:
        from ..utils.database import get_user_by_email, get_user_preferences

        user = get_user_by_email(user_email)
        if not user:
            logger.info(f"User not found for email {user_email[:3]}***, skipping notification")
            return False

        prefs = get_user_preferences(user["user_id"])
        if not prefs or not prefs.get("email_notifications", True):
            logger.info(f"Email notifications disabled for user {user_email[:3]}***")
            return False

        return True
    except Exception as e:
        logger.error(f"Error checking user preferences: {e}")
        return False


def notify_issue_created(
    reporter_email: str,
    issue_key: str,
    summary: str,
    description: str = None,
    issue_type: str = None,
    priority: str = None
) -> bool:
    """
    Send notification when a new issue is created.

    Args:
        reporter_email: Email of the issue reporter
        issue_key: Jira issue key (e.g., "BUG-123")
        summary: Issue summary/title
        description: Issue description text
        issue_type: Type of issue (Bug, Task, Story)
        priority: Issue priority level

    Returns:
        True if email was sent successfully
    """
    if not _should_send_email(reporter_email):
        return False

    result = send_issue_receipt(reporter_email, issue_key, summary)
    return result is not None


def notify_status_changed(
    reporter_email: str,
    issue_key: str,
    summary: str,
    old_status: str,
    new_status: str
) -> bool:
    """
    Send notification when issue status changes.

    Args:
        reporter_email: Email of the issue reporter
        issue_key: Jira issue key
        summary: Issue summary/title
        old_status: Previous status
        new_status: New status

    Returns:
        True if email was sent successfully
    """
    if not _should_send_email(reporter_email):
        return False

    if not resend.api_key:
        logger.warning("Resend API key not configured, skipping email send")
        return False

    try:
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6;">
            <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                <div style="background: linear-gradient(135deg, #f97316 0%, #ef4444 100%); padding: 32px; border-radius: 16px 16px 0 0; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 28px;">Status Updated: {issue_key}</h1>
                </div>
                <div style="background: white; padding: 32px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <p style="color: #4b5563; line-height: 1.6; margin: 0 0 16px 0;">
                        <strong>{summary}</strong>
                    </p>
                    <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                        <p style="color: #6b7280; margin: 0 0 8px 0; font-size: 14px;">Status changed:</p>
                        <p style="color: #111827; margin: 0; font-size: 16px;">
                            <span style="text-decoration: line-through; color: #9ca3af;">{old_status}</span>
                            &nbsp;→&nbsp;
                            <strong style="color: #059669;">{new_status}</strong>
                        </p>
                    </div>
                    <div style="text-align: center;">
                        <a href="{APP_URL}/issues/{issue_key}"
                           style="display: inline-block; background: #f97316; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">
                            View Issue
                        </a>
                    </div>
                </div>
                <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 24px;">
                    Relay Tracker • Fast track from report to resolution
                </p>
            </div>
        </body>
        </html>
        """

        r = resend.Emails.send({
            "from": FROM_EMAIL,
            "to": reporter_email,
            "subject": f"[{issue_key}] Status Changed: {old_status} → {new_status}",
            "html": html_content
        })
        logger.info(f"[Email] Sent status update to {reporter_email} (ID: {r.get('id')})")
        return True
    except Exception as e:
        logger.error(f"[Email] Failed to send status update: {e}")
        return False


def notify_comment_added(
    reporter_email: str,
    commenter_email: str,
    issue_key: str,
    summary: str,
    comment_body: str,
    commenter_name: str = None
) -> bool:
    """
    Send notification when a comment is added to an issue.

    Only notifies the reporter if someone else comments (not self-comments).

    Args:
        reporter_email: Email of the issue reporter
        commenter_email: Email of the person who added the comment
        issue_key: Jira issue key
        summary: Issue summary/title
        comment_body: The comment text
        commenter_name: Display name of commenter

    Returns:
        True if email was sent successfully
    """
    # Don't notify if reporter commented on their own issue
    if reporter_email.lower() == commenter_email.lower():
        logger.info("Skipping self-comment notification")
        return False

    if not _should_send_email(reporter_email):
        return False

    if not resend.api_key:
        logger.warning("Resend API key not configured, skipping email send")
        return False

    try:
        display_name = commenter_name or commenter_email.split("@")[0]
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6;">
            <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                <div style="background: linear-gradient(135deg, #f97316 0%, #ef4444 100%); padding: 32px; border-radius: 16px 16px 0 0; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 28px;">New Comment: {issue_key}</h1>
                </div>
                <div style="background: white; padding: 32px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <p style="color: #4b5563; line-height: 1.6; margin: 0 0 16px 0;">
                        <strong>{summary}</strong>
                    </p>
                    <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                        <p style="color: #6b7280; margin: 0 0 8px 0; font-size: 14px;">
                            <strong>{display_name}</strong> commented:
                        </p>
                        <p style="color: #111827; margin: 0; font-size: 14px; white-space: pre-wrap;">
                            {comment_body}
                        </p>
                    </div>
                    <div style="text-align: center;">
                        <a href="{APP_URL}/issues/{issue_key}"
                           style="display: inline-block; background: #f97316; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">
                            View & Reply
                        </a>
                    </div>
                </div>
                <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 24px;">
                    Relay Tracker • Fast track from report to resolution
                </p>
            </div>
        </body>
        </html>
        """

        r = resend.Emails.send({
            "from": FROM_EMAIL,
            "to": reporter_email,
            "subject": f"[{issue_key}] New Comment - {summary[:40]}",
            "html": html_content
        })
        logger.info(f"[Email] Sent comment notification to {reporter_email} (ID: {r.get('id')})")
        return True
    except Exception as e:
        logger.error(f"[Email] Failed to send comment notification: {e}")
        return False
