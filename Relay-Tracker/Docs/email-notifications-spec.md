# Feature Spec: Email Notifications (via Resend)

## 1. Context

- **Goal:** Replace any existing SendGrid logic with **Resend** for email notifications.
- **Trigger:** Send an email confirmation to the user immediately after they successfully create an Issue.
- **Constraint:** Use the `onboarding@resend.dev` sender address to avoid domain verification issues during development.

## 2. Implementation Plan

### Phase 1: Dependencies

- **Action:** Add `resend` to `backend/api/requirements.txt`.
- **Action:** Delete `sendgrid` from requirements (if present) to keep the project clean.

### Phase 2: The Email Service

- **File:** `backend/api/services/email_service.py` (Create or Overwrite)
- **Logic:**

  ```python
  import os
  import resend

  resend.api_key = os.environ.get("RESEND_API_KEY")

  def send_issue_receipt(user_email, issue_key, summary):
      """
      Sends a receipt to the user.
      NOTE: For now, 'from' must be 'onboarding@resend.dev' until we verify a domain.
      """
      try:
          html_content = f\"\"\"
            <h1>Issue Received: {issue_key}</h1>
            <p>Thanks for reporting \"<strong>{summary}</strong>\".</p>
            <p>Our team has been notified.</p>
            <p><a href=\"https://relay-foodstyles.vercel.app/issues/{issue_key}\">View Status</a></p>
          \"\"\"

          r = resend.Emails.send({
              "from": "Relay Tracker <onboarding@resend.dev>",
              "to": user_email,
              "subject": f"[{issue_key}] Report Received",
              "html": html_content
          })
          print(f"[Email] Sent receipt to {user_email} (ID: {r.get('id')})")
          return r
      except Exception as e:
          print(f"[Email] Failed to send: {e}")
          return None
  ```

### Phase 3: Integration

- **File:** `backend/api/routes/issues.py`
- **Location:** Inside the `create_issue` endpoint, after the Jira issue is successfully created.
- **Action:**
  - Import `send_issue_receipt`.
  - Call it: `send_issue_receipt(data['reporter_email'], new_issue_key, data['summary'])`.
- **Important:** Wrap this in a generic try/except block so email failures do not crash the HTTP request.

## 3. Verification

### Test:

1. Create an issue using your real email address as the reporter.
2. Check your inbox.
3. Verify the sender is `onboarding@resend.dev`.
