"""Issue routes for Relay API.

Exposes Jira functionality to the frontend.
"""

from flask import Blueprint, jsonify, request, g

from ..utils.auth import require_auth, require_role, log_activity
from ..utils.template_builder import parse_user_agent
from ..services.email_service import notify_issue_created, notify_status_changed, notify_comment_added
from ..utils.database import (
    add_attachment as db_add_attachment,
    get_issue_attachments as db_get_attachments,
)
from ..services.jira_service import (
    fetch_issues,
    get_issue,
    create_issue,
    update_issue,
    add_comment,
    upload_attachment,
    check_user_can_edit,
    get_issues_updated_since,
)

issues_bp = Blueprint("issues", __name__, url_prefix="/api/issues")


@issues_bp.route("", methods=["GET"])
@require_auth
def list_issues():
    """
    List Jira issues with optional filters.

    Query params:
        status: Comma-separated status values
        priority: Comma-separated priority values
        type: Comma-separated issue types
        reporter: Reporter email
        search: Search text
        page: Page number (default 1)
        limit: Results per page (default 20, max 100)
        refresh: If "true", bypass cache and fetch fresh data from Jira

    Returns:
        { issues: [...], total: number, page: number, totalPages: number }
    """
    try:
        status = request.args.get("status")
        priority = request.args.get("priority")
        issue_type = request.args.get("type")
        tool = request.args.get("tool")
        reporter = request.args.get("reporter")
        relay_reporter = request.args.get("relay_reporter")
        search = request.args.get("search")
        page = int(request.args.get("page", 1))
        limit = min(int(request.args.get("limit", 20)), 100)  # Max 100
        refresh = request.args.get("refresh", "").lower() == "true"

        result = fetch_issues(
            status=status,
            priority=priority,
            issue_type=issue_type,
            tool=tool,
            reporter=reporter,
            relay_reporter=relay_reporter,
            search=search,
            page=page,
            limit=limit,
            skip_cache=refresh,
        )

        return jsonify(result)

    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"Failed to fetch issues: {str(e)}"}), 500


@issues_bp.route("/<issue_key>", methods=["GET"])
@require_auth
def get_issue_detail(issue_key: str):
    """
    Get a single issue with all details.

    Args:
        issue_key: The Jira issue key (e.g., "BUG-123")

    Returns:
        Full issue details including comments and attachments
    """
    try:
        issue = get_issue(issue_key)
        return jsonify(issue)

    except Exception as e:
        return jsonify({"error": f"Failed to get issue: {str(e)}"}), 500


@issues_bp.route("", methods=["POST"])
@require_auth
def create_new_issue():
    """
    Create a new Jira issue with type-specific SOP templates.

    Request body:
        For Bug:
        {
            "summary": "Issue summary",
            "details": "Bug description",
            "type": "Bug",
            "priority": "Highest" | "High" | "Medium" | "Low" | "Lowest",
            "attachmentLinks": "Optional BEB/video link"
        }

        For Story:
        {
            "summary": "Issue summary",
            "type": "Story",
            "priority": "...",
            "problemDescription": "Description of the problem",
            "proposedSolution": "Proposed solution",
            "acceptanceCriteria": "Required acceptance criteria",
            "scope": "Optional scope",
            "attachmentLinks": "Optional link"
        }

        For Task:
        {
            "summary": "Issue summary",
            "type": "Task",
            "priority": "...",
            "taskDescription": "Required task description",
            "notes": "Optional notes",
            "links": "Optional links/templates"
        }

    Returns:
        { key: "BUG-123", self: "..." }
    """
    user = g.user
    data = request.get_json()

    if not data:
        return jsonify({"error": "No data provided"}), 400

    # Validate common required fields
    if not data.get("summary"):
        return jsonify({"error": "Missing required field: summary"}), 400
    if not data.get("type"):
        return jsonify({"error": "Missing required field: type"}), 400
    if not data.get("priority"):
        return jsonify({"error": "Missing required field: priority"}), 400

    # Validate summary length
    if len(data["summary"]) > 255:
        return jsonify({"error": "Summary must be 255 characters or less"}), 400

    # Validate issue type
    valid_types = ["Bug", "Task", "Story"]
    issue_type = data["type"]
    if issue_type not in valid_types:
        return jsonify({"error": f"Invalid type. Must be one of: {valid_types}"}), 400

    # Validate priority
    valid_priorities = ["Highest", "High", "Medium", "Low", "Lowest"]
    if data["priority"] not in valid_priorities:
        return jsonify({"error": f"Invalid priority. Must be one of: {valid_priorities}"}), 400

    # Type-specific validation
    if issue_type == "Bug":
        if not all(data.get(k) for k in ["stepsToReproduce", "expectedResult", "actualResult"]):
            return jsonify({"error": "Bug requires 'stepsToReproduce', 'expectedResult', and 'actualResult' fields"}), 400
        # Mandatory attachment links (video/screenshot) for Bug reports only
        if not data.get("attachmentLinks"):
            return jsonify({"error": "A video or screenshot link is required for Bug reports"}), 400
    elif issue_type == "Story":
        if not data.get("acceptanceCriteria"):
            return jsonify({"error": "Story requires 'acceptanceCriteria' field"}), 400
        if not data.get("problemDescription"):
            return jsonify({"error": "Story requires 'problemDescription' field"}), 400
    elif issue_type == "Task":
        if not data.get("taskDescription"):
            return jsonify({"error": "Task requires 'taskDescription' field"}), 400

    try:
        # Parse user agent for browser/OS detection
        user_agent = request.headers.get("User-Agent", "")
        browser, os_info = parse_user_agent(user_agent)

        result = create_issue(
            summary=data["summary"],
            details=data.get("details", ""),
            issue_type=issue_type,
            priority=data["priority"],
            user_email=user["email"],
            browser=browser,
            os_info=os_info,
            attachment_links=data.get("attachmentLinks"),
            # Bug fields
            steps_to_reproduce=data.get("stepsToReproduce"),
            expected_result=data.get("expectedResult"),
            actual_result=data.get("actualResult"),
            # Story fields
            problem_description=data.get("problemDescription"),
            proposed_solution=data.get("proposedSolution"),
            acceptance_criteria=data.get("acceptanceCriteria"),
            scope=data.get("scope"),
            # Task fields
            task_description=data.get("taskDescription"),
            notes=data.get("notes"),
            links=data.get("links"),
        )

        # Log the activity
        log_activity(
            user["user_id"],
            "create_issue",
            jira_issue_key=result["key"],
            metadata={
                "type": data["type"],
                "priority": data["priority"],
            },
        )

        # Send email notification (async-safe, won't block response)
        notify_issue_created(
            reporter_email=user["email"],
            issue_key=result["key"],
            summary=data["summary"],
            description=data["details"],
            issue_type=data["type"],
            priority=data["priority"]
        )

        return jsonify(result), 201

    except Exception as e:
        return jsonify({"error": f"Failed to create issue: {str(e)}"}), 500


@issues_bp.route("/<issue_key>", methods=["PUT"])
@require_auth
def update_existing_issue(issue_key: str):
    """
    Update an existing Jira issue.

    Users can only update their own issues.
    SQA and Admin can update any issue.

    Request body:
        {
            "summary": "Updated summary",
            "description": "Updated description",
            "status": "In Progress",
            "priority": "High",
            "assignee": "email@example.com"
        }

    Returns:
        { key: "BUG-123" }
    """
    user = g.user
    data = request.get_json()

    if not data:
        return jsonify({"error": "No data provided"}), 400

    try:
        # Check if user can edit this issue
        can_edit = check_user_can_edit(issue_key, user["email"], user["role"])
        if not can_edit:
            return jsonify({"error": "You can only edit your own issues"}), 403

        # Validate priority if provided
        if "priority" in data:
            valid_priorities = ["Highest", "High", "Medium", "Low", "Lowest"]
            if data["priority"] not in valid_priorities:
                return jsonify({"error": f"Invalid priority. Must be one of: {valid_priorities}"}), 400

        # Get current issue state before update (for status change notification)
        old_status = None
        if "status" in data:
            try:
                current_issue = get_issue(issue_key)
                old_status = current_issue.get("status")
            except:
                pass

        result = update_issue(issue_key, data)

        # Log the activity
        log_activity(
            user["user_id"],
            "update_issue",
            jira_issue_key=issue_key,
            metadata={"fields_updated": list(data.keys())},
        )

        # Send status change notification if status was updated
        if "status" in data and old_status and old_status != data["status"]:
            try:
                issue = get_issue(issue_key)
                reporter_email = issue.get("reporter", {}).get("email")
                if reporter_email:
                    notify_status_changed(
                        reporter_email=reporter_email,
                        issue_key=issue_key,
                        summary=issue.get("summary", ""),
                        old_status=old_status,
                        new_status=data["status"]
                    )
            except:
                # Don't fail the request if notification fails
                pass

        return jsonify(result)

    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"Failed to update issue: {str(e)}"}), 500


@issues_bp.route("/<issue_key>/comments", methods=["POST"])
@require_auth
def add_issue_comment(issue_key: str):
    """
    Add a comment to an issue.

    Request body:
        {
            "body": "Comment text"
        }

    Returns:
        { id: "...", body: "...", created: "..." }
    """
    user = g.user
    data = request.get_json()

    if not data or not data.get("body"):
        return jsonify({"error": "Comment body is required"}), 400

    if len(data["body"].strip()) == 0:
        return jsonify({"error": "Comment cannot be empty"}), 400

    try:
        result = add_comment(issue_key, data["body"], user["email"])

        # Log the activity
        log_activity(
            user["user_id"],
            "add_comment",
            jira_issue_key=issue_key,
        )

        # Send email notification to reporter (if different from commenter)
        try:
            issue = get_issue(issue_key)
            reporter_email = issue.get("reporter", {}).get("email")
            if reporter_email:
                notify_comment_added(
                    reporter_email=reporter_email,
                    commenter_email=user["email"],
                    issue_key=issue_key,
                    summary=issue.get("summary", ""),
                    comment_body=data["body"],
                    commenter_name=user.get("name")
                )
        except Exception as e:
            # Don't fail the request if notification fails
            pass

        return jsonify(result), 201

    except Exception as e:
        return jsonify({"error": f"Failed to add comment: {str(e)}"}), 500


@issues_bp.route("/<issue_key>/attachments", methods=["POST"])
@require_auth
def upload_issue_attachment(issue_key: str):
    """
    Register an R2 attachment (JSON wrap) or upload a direct attachment to Jira (Multipart).

    JSON Request (R2):
        {
            "id": "uuid",
            "url": "public_url",
            "filename": "name.ext",
            "size": 12345,
            "mime_type": "image/png"
        }

    Returns:
        { id: "...", filename: "...", size: ..., mimeType: "..." }
    """
    user = g.user

    # Case 1: R2 Attachment Registration (JSON)
    if request.is_json:
        data = request.get_json()
        if not all(k in data for k in ["id", "url", "filename"]):
            return jsonify({"error": "Missing required fields: id, url, filename"}), 400

        try:
            db_add_attachment(
                id=data["id"],
                issue_key=issue_key,
                uploader_id=user["user_id"],
                filename=data["filename"],
                url=data["url"],
                size=data.get("size"),
                mime_type=data.get("mime_type"),
            )
            return (
                jsonify(
                    {
                        "id": data["id"],
                        "filename": data["filename"],
                        "size": data.get("size"),
                        "mimeType": data.get("mime_type"),
                        "url": data["url"],
                        "storage": "r2",
                    }
                ),
                201,
            )
        except Exception as e:
            return jsonify({"error": f"Failed to register R2 attachment: {str(e)}"}), 500

    # Case 2: Direct Jira Upload (Multipart)
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]

    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400

    # Check file size (10MB limit)
    file.seek(0, 2)  # Seek to end
    file_size = file.tell()
    file.seek(0)  # Seek back to start

    max_size = 10 * 1024 * 1024  # 10MB
    if file_size > max_size:
        return jsonify({"error": "File size exceeds 10MB limit"}), 400

    # Check allowed file types
    allowed_extensions = {
        "png",
        "jpg",
        "jpeg",
        "gif",
        "bmp",
        "webp",  # Images
        "pdf",  # Documents
        "mp4",
        "webm",
        "mov",
        "avi",  # Videos
        "zip",
        "rar",
        "7z",  # Archives
        "txt",
        "log",
        "json",
        "xml",  # Text files
    }

    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in allowed_extensions:
        return jsonify(
            {
                "error": f"File type not allowed. Allowed types: {', '.join(sorted(allowed_extensions))}"
            }
        ), 400

    try:
        file_content = file.read()
        result = upload_attachment(issue_key, file.filename, file_content)

        # Log the activity
        log_activity(
            user["user_id"],
            "upload_attachment",
            jira_issue_key=issue_key,
            metadata={"filename": file.filename, "size": file_size},
        )

        return jsonify(result), 201

    except Exception as e:
        return jsonify({"error": f"Failed to upload attachment: {str(e)}"}), 500


@issues_bp.route("/<issue_key>", methods=["DELETE"])
@require_auth
@require_role("admin")
def delete_issue(issue_key: str):
    """
    Cancel/delete an issue (Admin only).

    This transitions the issue to "Cancelled" status rather than
    actually deleting it from Jira.

    Returns:
        { key: "BUG-123", status: "Cancelled" }
    """
    user = g.user

    try:
        from ..services.jira_service import transition_issue

        result = transition_issue(issue_key, "Cancelled")

        # Log the activity
        log_activity(
            user["user_id"],
            "cancel_issue",
            jira_issue_key=issue_key,
        )

        return jsonify(result)

    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"Failed to cancel issue: {str(e)}"}), 500


@issues_bp.route("/bulk/status", methods=["POST"])
@require_auth
@require_role("sqa", "admin")
def bulk_update_status():
    """
    Bulk update status for multiple issues.

    Only available to SQA and Admin roles.

    Request body:
        {
            "issue_keys": ["KEY-1", "KEY-2", ...],
            "status": "Done"
        }

    Returns:
        { updated: number, failed: ["KEY-3", ...] }
    """
    user = g.user
    data = request.get_json()

    if not data:
        return jsonify({"error": "No data provided"}), 400

    issue_keys = data.get("issue_keys", [])
    new_status = data.get("status")

    if not issue_keys or not isinstance(issue_keys, list):
        return jsonify({"error": "issue_keys must be a non-empty array"}), 400

    if not new_status:
        return jsonify({"error": "status is required"}), 400

    from ..services.jira_service import transition_issue

    updated = 0
    failed = []

    for issue_key in issue_keys:
        try:
            # Get current issue state for notification
            current_issue = get_issue(issue_key)
            old_status = current_issue.get("status")

            # Transition the issue
            transition_issue(issue_key, new_status)
            updated += 1

            # Log the activity
            log_activity(
                user["user_id"],
                "bulk_update_status",
                jira_issue_key=issue_key,
                metadata={"old_status": old_status, "new_status": new_status},
            )

            # Send notification if status changed
            if old_status and old_status != new_status:
                reporter_email = current_issue.get("reporter", {}).get("email")
                if reporter_email:
                    notify_status_changed(
                        reporter_email=reporter_email,
                        issue_key=issue_key,
                        summary=current_issue.get("summary", ""),
                        old_status=old_status,
                        new_status=new_status
                    )

        except Exception as e:
            failed.append(issue_key)

    return jsonify({"updated": updated, "failed": failed})


@issues_bp.route("/bulk/priority", methods=["POST"])
@require_auth
@require_role("sqa", "admin")
def bulk_update_priority():
    """
    Bulk update priority for multiple issues.

    Only available to SQA and Admin roles.

    Request body:
        {
            "issue_keys": ["KEY-1", "KEY-2", ...],
            "priority": "High"
        }

    Returns:
        { updated: number, failed: ["KEY-3", ...] }
    """
    user = g.user
    data = request.get_json()

    if not data:
        return jsonify({"error": "No data provided"}), 400

    issue_keys = data.get("issue_keys", [])
    new_priority = data.get("priority")

    if not issue_keys or not isinstance(issue_keys, list):
        return jsonify({"error": "issue_keys must be a non-empty array"}), 400

    if not new_priority:
        return jsonify({"error": "priority is required"}), 400

    valid_priorities = ["Highest", "High", "Medium", "Low", "Lowest"]
    if new_priority not in valid_priorities:
        return jsonify({"error": f"Invalid priority. Must be one of: {valid_priorities}"}), 400

    updated = 0
    failed = []

    for issue_key in issue_keys:
        try:
            # Update priority
            update_issue(issue_key, {"priority": new_priority})
            updated += 1

            # Log the activity
            log_activity(
                user["user_id"],
                "bulk_update_priority",
                jira_issue_key=issue_key,
                metadata={"new_priority": new_priority},
            )

        except Exception as e:
            failed.append(issue_key)

    return jsonify({"updated": updated, "failed": failed})


@issues_bp.route("/updates", methods=["GET"])
@require_auth
def get_updates():
    """
    Get issues updated since a specific timestamp.

    Query params:
        since: ISO format timestamp (required)

    Returns:
        List of updated issues
    """
    since = request.args.get("since")

    if not since:
        return jsonify({"error": "Missing 'since' parameter"}), 400

    try:
        issues = get_issues_updated_since(since)
        return jsonify({"issues": issues, "count": len(issues)})

    except Exception as e:
        return jsonify({"error": f"Failed to get updates: {str(e)}"}), 500
