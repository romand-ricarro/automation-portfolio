"""
Email service for sending notifications via Resend.
Handles all email-related functionality for InsightPulse.
"""
import os
import logging
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta

logger = logging.getLogger('insightpulse.email_service')

# Check if Resend is available
try:
    import resend
    RESEND_AVAILABLE = True
except ImportError:
    RESEND_AVAILABLE = False
    logger.warning("Resend package not installed. Email notifications disabled.")


def init_resend():
    """Initialize Resend with API key."""
    if not RESEND_AVAILABLE:
        return False

    api_key = os.environ.get('RESEND_API_KEY')
    if not api_key:
        logger.warning("RESEND_API_KEY not configured. Email notifications disabled.")
        return False

    resend.api_key = api_key
    return True


def get_from_email() -> str:
    """Get the sender email address."""
    return os.environ.get('FROM_EMAIL', 'InsightPulse <notifications@insightpulse.app>')


def get_app_url() -> str:
    """Get the application URL for email links."""
    return os.environ.get('APP_URL', os.environ.get('FRONTEND_URL', 'http://localhost:5173'))


def send_email(
    to: List[str],
    subject: str,
    html: str,
    text: Optional[str] = None
) -> Dict[str, Any]:
    """
    Send an email via Resend.

    Args:
        to: List of recipient email addresses
        subject: Email subject
        html: HTML content
        text: Optional plain text content

    Returns:
        Response from Resend API or error dict
    """
    if not init_resend():
        return {'error': 'Email service not configured', 'sent': False}

    try:
        params = {
            'from': get_from_email(),
            'to': to,
            'subject': subject,
            'html': html,
        }
        if text:
            params['text'] = text

        response = resend.Emails.send(params)
        logger.info(f"Email sent to {to}: {subject}")
        return {'id': response.get('id'), 'sent': True}

    except Exception as e:
        logger.exception(f"Failed to send email to {to}: {e}")
        return {'error': str(e), 'sent': False}


# ============================================
# Email Templates
# ============================================

def get_base_template(content: str, title: str) -> str:
    """Wrap content in base email template."""
    app_url = get_app_url()
    return f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title}</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }}
        .header {{
            background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%);
            color: white;
            padding: 24px;
            border-radius: 8px 8px 0 0;
            text-align: center;
        }}
        .header h1 {{
            margin: 0;
            font-size: 24px;
        }}
        .content {{
            background: #ffffff;
            border: 1px solid #e5e7eb;
            border-top: none;
            padding: 24px;
            border-radius: 0 0 8px 8px;
        }}
        .button {{
            display: inline-block;
            background: #3B82F6;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 500;
            margin: 16px 0;
        }}
        .button:hover {{
            background: #2563EB;
        }}
        .footer {{
            text-align: center;
            padding: 16px;
            color: #6b7280;
            font-size: 12px;
        }}
        .highlight {{
            background: #f3f4f6;
            padding: 16px;
            border-radius: 6px;
            margin: 16px 0;
        }}
        table {{
            width: 100%;
            border-collapse: collapse;
            margin: 16px 0;
        }}
        th, td {{
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #e5e7eb;
        }}
        th {{
            background: #f9fafb;
            font-weight: 600;
        }}
        .priority-high {{
            color: #dc2626;
            font-weight: 600;
        }}
        .priority-medium {{
            color: #f59e0b;
            font-weight: 600;
        }}
        .priority-low {{
            color: #10b981;
            font-weight: 600;
        }}
    </style>
</head>
<body>
    <div class="header">
        <h1>InsightPulse</h1>
    </div>
    <div class="content">
        {content}
    </div>
    <div class="footer">
        <p>This email was sent by InsightPulse.</p>
        <p><a href="{app_url}">Open InsightPulse</a> | <a href="{app_url}/settings/notifications">Manage Notifications</a></p>
    </div>
</body>
</html>
"""


# ============================================
# Notification Functions
# ============================================

def send_analysis_complete_email(
    to_email: str,
    session_name: str,
    session_id: str,
    facilitator_name: str,
    num_responses: int
) -> Dict[str, Any]:
    """
    Send notification when session analysis is complete.
    """
    app_url = get_app_url()
    session_url = f"{app_url}/sessions/{session_id}"

    content = f"""
    <h2>Analysis Complete</h2>
    <p>The AI analysis for your session has been completed successfully.</p>

    <div class="highlight">
        <p><strong>Session:</strong> {session_name}</p>
        <p><strong>Facilitator:</strong> {facilitator_name}</p>
        <p><strong>Responses Analyzed:</strong> {num_responses}</p>
    </div>

    <p>You can now view the analysis results, including:</p>
    <ul>
        <li>Question-by-question analysis</li>
        <li>Common issues and themes</li>
        <li>Actionable insights</li>
    </ul>

    <p style="text-align: center;">
        <a href="{session_url}" class="button">View Analysis Results</a>
    </p>
    """

    html = get_base_template(content, 'Analysis Complete')
    return send_email([to_email], f"Analysis Complete: {session_name}", html)


def send_action_item_assigned_email(
    to_email: str,
    assignee_name: str,
    action_item: Dict[str, Any],
    session_name: str,
    assigned_by: str
) -> Dict[str, Any]:
    """
    Send notification when an action item is assigned.
    """
    app_url = get_app_url()
    session_url = f"{app_url}/sessions/{action_item.get('session_id')}"

    priority = action_item.get('priority', 'Medium')
    priority_class = f"priority-{priority.lower()}"

    deadline = action_item.get('deadline')
    deadline_str = deadline if deadline else 'No deadline set'

    content = f"""
    <h2>Action Item Assigned</h2>
    <p>Hi {assignee_name},</p>
    <p>You have been assigned a new action item by {assigned_by}.</p>

    <div class="highlight">
        <p><strong>Issue:</strong> {action_item.get('issue', 'N/A')}</p>
        <p><strong>Action Required:</strong> {action_item.get('action', 'N/A')}</p>
        <p><strong>Priority:</strong> <span class="{priority_class}">{priority}</span></p>
        <p><strong>Deadline:</strong> {deadline_str}</p>
        <p><strong>Session:</strong> {session_name}</p>
    </div>

    <p style="text-align: center;">
        <a href="{session_url}" class="button">View Action Item</a>
    </p>
    """

    html = get_base_template(content, 'Action Item Assigned')
    return send_email([to_email], f"Action Item Assigned: {action_item.get('issue', 'New Action')[:50]}", html)


def send_action_item_reminder_email(
    to_email: str,
    user_name: str,
    overdue_items: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Send reminder for overdue action items.
    """
    app_url = get_app_url()

    items_html = ""
    for item in overdue_items:
        priority = item.get('priority', 'Medium')
        priority_class = f"priority-{priority.lower()}"
        items_html += f"""
        <tr>
            <td>{item.get('issue', 'N/A')[:50]}...</td>
            <td class="{priority_class}">{priority}</td>
            <td>{item.get('deadline', 'N/A')}</td>
        </tr>
        """

    content = f"""
    <h2>Overdue Action Items</h2>
    <p>Hi {user_name},</p>
    <p>You have <strong>{len(overdue_items)}</strong> overdue action item(s) that need your attention.</p>

    <table>
        <thead>
            <tr>
                <th>Issue</th>
                <th>Priority</th>
                <th>Due Date</th>
            </tr>
        </thead>
        <tbody>
            {items_html}
        </tbody>
    </table>

    <p style="text-align: center;">
        <a href="{app_url}/action-items" class="button">View All Action Items</a>
    </p>
    """

    html = get_base_template(content, 'Action Items Reminder')
    return send_email([to_email], f"Reminder: {len(overdue_items)} Overdue Action Item(s)", html)


def send_weekly_digest_email(
    to_email: str,
    user_name: str,
    digest_data: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Send weekly digest summary.
    """
    app_url = get_app_url()

    sessions_html = ""
    for session in digest_data.get('recent_sessions', []):
        sessions_html += f"""
        <tr>
            <td>{session.get('session_name', 'N/A')}</td>
            <td>{session.get('session_date', 'N/A')}</td>
            <td>{session.get('num_responses', 0)}</td>
            <td>{session.get('status', 'N/A')}</td>
        </tr>
        """

    if not sessions_html:
        sessions_html = "<tr><td colspan='4'>No sessions this week</td></tr>"

    content = f"""
    <h2>Weekly Digest</h2>
    <p>Hi {user_name},</p>
    <p>Here's your weekly summary from InsightPulse:</p>

    <div class="highlight">
        <p><strong>Sessions Analyzed:</strong> {digest_data.get('sessions_analyzed', 0)}</p>
        <p><strong>Total Responses:</strong> {digest_data.get('total_responses', 0)}</p>
        <p><strong>Action Items Created:</strong> {digest_data.get('action_items_created', 0)}</p>
        <p><strong>Action Items Completed:</strong> {digest_data.get('action_items_completed', 0)}</p>
    </div>

    <h3>Recent Sessions</h3>
    <table>
        <thead>
            <tr>
                <th>Session</th>
                <th>Date</th>
                <th>Responses</th>
                <th>Status</th>
            </tr>
        </thead>
        <tbody>
            {sessions_html}
        </tbody>
    </table>

    <p style="text-align: center;">
        <a href="{app_url}/dashboard" class="button">View Dashboard</a>
    </p>
    """

    html = get_base_template(content, 'Weekly Digest')
    week_of = datetime.now().strftime('%b %d, %Y')
    return send_email([to_email], f"InsightPulse Weekly Digest - Week of {week_of}", html)


def send_test_email(to_email: str) -> Dict[str, Any]:
    """
    Send a test email to verify configuration.
    """
    content = """
    <h2>Test Email</h2>
    <p>This is a test email from InsightPulse.</p>
    <p>If you received this email, your notification settings are working correctly.</p>

    <div class="highlight">
        <p><strong>Status:</strong> Email service is configured and operational.</p>
    </div>
    """

    html = get_base_template(content, 'Test Email')
    return send_email([to_email], "InsightPulse Test Email", html)
