"""Jira Cloud API service for Relay.

Provides functions to interact with Jira Cloud REST API v3.
Includes in-memory caching for performance optimization.
"""

import os
import time
import logging
import hashlib
from typing import Optional
from datetime import datetime
import json

from ..utils.database import (
    get_user_by_email,
    get_users_by_emails,
    get_issue_attachments as db_get_attachments,
)
from ..utils.storage import get_presigned_url_for_attachment


# Deferred import to speed up initial server startup

logger = logging.getLogger(__name__)

# =============================================================================
# JIRA CACHE - Simple in-memory cache with TTL for issue list queries
# =============================================================================

CACHE_TTL_SECONDS = 300  # 5 minutes

# Cache structure: { cache_key: { "data": ..., "expires_at": timestamp } }
JIRA_CACHE: dict = {}


def _get_cache_key(prefix: str, **kwargs) -> str:
    """Generate a cache key from prefix and kwargs."""
    sorted_items = sorted((k, v) for k, v in kwargs.items() if v is not None)
    key_str = f"{prefix}:{sorted_items}"
    return hashlib.md5(key_str.encode()).hexdigest()


def _get_from_cache(cache_key: str) -> Optional[dict]:
    """Get data from cache if not expired."""
    entry = JIRA_CACHE.get(cache_key)
    if entry and entry["expires_at"] > time.time():
        logger.info(f"Cache HIT for key: {cache_key[:12]}...")
        return entry["data"]
    if entry:
        # Expired, remove it
        del JIRA_CACHE[cache_key]
    return None


def _set_cache(cache_key: str, data: dict) -> None:
    """Store data in cache with TTL."""
    JIRA_CACHE[cache_key] = {
        "data": data,
        "expires_at": time.time() + CACHE_TTL_SECONDS,
    }
    logger.info(f"Cache SET for key: {cache_key[:12]}... (TTL: {CACHE_TTL_SECONDS}s)")


def _get_total_issue_count(jql: str) -> int:
    """
    Get the total number of issues for a JQL query using a lightweight ID-only fetch.
    Caches the result for 5 minutes.
    """
    cache_key = _get_cache_key("total_count", jql=jql)
    cached_count = _get_from_cache(cache_key)
    if cached_count is not None:
        return cached_count

    jira = get_jira_client()
    path = "rest/api/3/search/jql"
    
    # Lightweight fetch: only IDs, large maxResults
    # We don't need the actual issues, just the count of what Jira can return
    all_ids = []
    next_page_token = None
    
    try:
        # Fetch up to 1000 IDs per call (Atlassian limit for ID-only search)
        params = {
            "jql": jql,
            "maxResults": 1000,
            "fields": "id",
        }
        if next_page_token:
            params["nextPageToken"] = next_page_token
            
        response = jira.request(method="GET", path=path, params=params)
        data = response.json() if hasattr(response, 'json') else response
        
        # The new API doesn't return 'total', but we can count the issues in the response
        # If there's no nextPageToken, the count of issues IS the total
        issues = data.get("issues", [])
        total = len(issues)
        
        # If there's a nextPageToken, we'd need to fetch more, but for most projects < 1000, 
        # one call is enough. For now, we'll return what we have or a "more than" estimate.
        if data.get("nextPageToken"):
            # If there are more than 1000, we'll just show 1000+ for now to keep it fast
            # unless we specifically want to loop. For accurate pagination, we should loop.
            while data.get("nextPageToken"):
                params["nextPageToken"] = data.get("nextPageToken")
                response = jira.request(method="GET", path=path, params=params)
                data = response.json() if hasattr(response, 'json') else response
                more_issues = data.get("issues", [])
                if not more_issues:
                    break
                total += len(more_issues)
                if not data.get("nextPageToken"):
                    break

        # Cache the result for 5 minutes
        _set_cache(cache_key, total)
        return total
    except Exception as e:
        logger.error(f"Failed to fetch total issue count: {e}")
        return 0


def _invalidate_cache(pattern: Optional[str] = None) -> None:
    """
    Invalidate cache entries.

    Args:
        pattern: If provided, only invalidate keys containing this pattern.
                 If None, clear the entire cache.
    """
    global JIRA_CACHE
    if pattern is None:
        count = len(JIRA_CACHE)
        JIRA_CACHE = {}
        logger.info(f"Cache CLEARED ({count} entries)")
    else:
        keys_to_remove = [k for k in JIRA_CACHE.keys()]
        for key in keys_to_remove:
            del JIRA_CACHE[key]
        if keys_to_remove:
            logger.info(f"Cache INVALIDATED {len(keys_to_remove)} entries")

# Singleton Jira client
_jira_client = None


def get_jira_client():
    """Get or create the Jira client singleton."""
    global _jira_client
    # Import inside function to avoid startup delay
    from atlassian import Jira

    if _jira_client is None:
        jira_url = os.getenv("JIRA_URL")
        jira_email = os.getenv("JIRA_EMAIL")
        jira_token = os.getenv("JIRA_API_TOKEN")

        if not all([jira_url, jira_email, jira_token]):
            raise ValueError(
                "Missing Jira configuration. "
                "Set JIRA_URL, JIRA_EMAIL, and JIRA_API_TOKEN environment variables."
            )

        _jira_client = Jira(
            url=jira_url,
            username=jira_email,
            password=jira_token,
            cloud=True,
        )

    return _jira_client


def get_project_key() -> str:
    """Get the configured Jira project key."""
    project_key = os.getenv("JIRA_PROJECT_KEY")
    if not project_key:
        raise ValueError("JIRA_PROJECT_KEY environment variable is required.")
    return project_key


def _extract_text_from_adf(adf: dict | str | None) -> str:
    """Extract plain text from Atlassian Document Format (ADF) or return string as-is."""
    if adf is None:
        return ""
    if isinstance(adf, str):
        return adf
    if not isinstance(adf, dict):
        return ""

    # ADF structure: { "type": "doc", "content": [...] }
    def extract_text(node):
        if isinstance(node, str):
            return node
        if isinstance(node, list):
            return "".join(extract_text(child) for child in node)
        if not isinstance(node, dict):
            return ""

        node_type = node.get("type")
        if node_type == "text":
            return node.get("text", "")
        if node_type == "hardBreak":
            return "\n"
        if node_type == "paragraph":
            content = node.get("content", [])
            return "".join(extract_text(child) for child in content) + "\n"

        content = node.get("content", [])
        return "".join(extract_text(child) for child in content)

    return extract_text(adf)


def _retry_with_backoff(func, max_retries: int = 3, base_delay: float = 1.0):
    """Execute a function with retry and exponential backoff."""
    last_exception = None

    for attempt in range(max_retries):
        try:
            return func()
        except Exception as e:
            last_exception = e
            if attempt < max_retries - 1:
                delay = base_delay * (2**attempt)
                logger.warning(
                    f"Jira API call failed (attempt {attempt + 1}/{max_retries}): {e}. "
                    f"Retrying in {delay}s..."
                )
                time.sleep(delay)
            else:
                logger.error(f"Jira API call failed after {max_retries} attempts: {e}")

    raise last_exception


def fetch_issues(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    issue_type: Optional[str] = None,
    tool: Optional[str] = None,
    reporter: Optional[str] = None,
    relay_reporter: Optional[str] = None,
    search: Optional[str] = None,
    page: int = 1,
    limit: int = 50,
    skip_cache: bool = False,
) -> dict:
    """
    Fetch issues from Jira with optional filters.

    Args:
        status: Comma-separated status values (e.g., "Open,In Progress")
        priority: Comma-separated priority values (e.g., "Highest,High")
        issue_type: Comma-separated issue types (e.g., "Bug,Task")
        tool: Comma-separated tool names (e.g., "AI,Curator")
        reporter: Reporter email address
        search: Search text for summary/description
        page: Page number (1-indexed)
        limit: Number of results per page (max 50)
        skip_cache: If True, bypass cache and fetch fresh data

    Returns:
        Dict with issues, total, page, and totalPages
    """
    # Check cache first (unless skip_cache is True)
    cache_key = _get_cache_key(
        "issues_v3",
        status=status,
        priority=priority,
        issue_type=issue_type,
        tool=tool,
        reporter=reporter,
        relay_reporter=relay_reporter,
        search=search,
        page=page,
        limit=limit,
    )

    if not skip_cache:
        cached = _get_from_cache(cache_key)
        if cached:
            return cached

    jira = get_jira_client()
    project_key = get_project_key()

    # Build JQL query - Filter to only show issues created via Relay App
    jql_parts = [
        f"project = '{project_key}'",
        'labels = "relay-app"'
    ]

    if status:
        statuses = [s.strip() for s in status.split(",")]
        is_not = any(s.startswith("!") for s in statuses)
        clean_statuses = [s[1:] if s.startswith("!") else s for s in statuses]
        status_jql = ", ".join([f'"{s}"' for s in clean_statuses])
        op = "NOT IN" if is_not else "IN"
        jql_parts.append(f"status {op} ({status_jql})")

    if priority:
        priorities = [p.strip() for p in priority.split(",")]
        is_not = any(p.startswith("!") for p in priorities)
        clean_priorities = [p[1:] if p.startswith("!") else p for p in priorities]
        priority_jql = ", ".join([f'"{p}"' for p in clean_priorities])
        op = "NOT IN" if is_not else "IN"
        jql_parts.append(f"priority {op} ({priority_jql})")

    if issue_type:
        types = [t.strip() for t in issue_type.split(",")]
        is_not = any(t.startswith("!") for t in types)
        clean_types = [t[1:] if t.startswith("!") else t for t in types]
        type_jql = ", ".join([f'"{t}"' for t in clean_types])
        op = "NOT IN" if is_not else "IN"
        jql_parts.append(f"issuetype {op} ({type_jql})")

    if tool:
        tool_names = [t.strip() for t in tool.split(",")]
        tool_conditions = []
        for t in tool_names:
            is_not = t.startswith("!")
            clean_tool = t[1:] if is_not else t
            
            # Check for label OR tool name in summary
            condition = f'(labels = "{clean_tool}" OR summary ~ "\\"{clean_tool}\\"")'
            if is_not:
                # Jira JQL doesn't have a direct "NOT (A OR B)" that works well with labels and summary
                # but we can use NOT labels = "X" AND summary !~ "X"
                condition = f'(labels != "{clean_tool}" AND summary !~ "\\"{clean_tool}\\"")'
            
            tool_conditions.append(condition)

        if tool_conditions:
            join_op = ' AND ' if any(t.startswith('!') for t in tool_names) else ' OR '
            jql_parts.append(f"({join_op.join(tool_conditions)})")


    if reporter:
        jql_parts.append(f'reporter = "{reporter}"')

    if relay_reporter:
        # Search for the Relay-specific reporter format in description
        # This targets tickets specifically reported THROUGH the Relay App
        # Note: description is searched for the literal "Reporter:" string
        jql_parts.append(f'description ~ "Reporter: {relay_reporter}"')

    if search:
        # Escape special JQL characters
        escaped_search = search.replace('"', '\\"')
        jql_parts.append(f'(summary ~ "{escaped_search}" OR description ~ "{escaped_search}")')

    jql = " AND ".join(jql_parts)
    logger.info(f"Executing JQL: {jql}")
    jql += " ORDER BY created DESC"

    # Calculate start index
    start_at = (page - 1) * limit

    logger.info(f"Fetching issues with JQL: {jql}")

    def _fetch():
        # Use the new /search/jql endpoint (legacy /search has been removed)
        path = "rest/api/3/search/jql"
        all_issues = []
        next_page_token = None
        fetched_count = 0
        target_end = start_at + limit  # We need issues from start_at to start_at + limit
        
        # Fetch pages sequentially until we have enough issues
        while fetched_count < target_end:
            params = {
                "jql": jql,
                "maxResults": min(limit, 50),  # Fetch in chunks of up to 50
                "fields": "key,summary,status,priority,issuetype,reporter,assignee,created,updated,description",
            }
            if next_page_token:
                params["nextPageToken"] = next_page_token
            
            response = jira.request(method="GET", path=path, params=params)
            data = response.json() if hasattr(response, 'json') else response
            
            page_issues = data.get("issues", [])
            if not page_issues:
                break  # No more results
            
            all_issues.extend(page_issues)
            fetched_count = len(all_issues)
            
            # Get next page token for continuation
            next_page_token = data.get("nextPageToken")
            if not next_page_token:
                break  # No more pages
        
        # Slice to get only the requested page
        page_issues = all_issues[start_at:target_end]
        
        # Get accurate total count (cached)
        total_count = _get_total_issue_count(jql)
        
        # If our sequential fetch already found everything and it's less than what 
        # _get_total_issue_count found (which shouldn't happen) or more, we use the best info
        final_total = max(total_count, len(all_issues) if not next_page_token else 0)

        # Return in a format compatible with the old API response
        return {
            "issues": page_issues,
            "total": final_total,
            "startAt": start_at,
            "maxResults": limit,
        }

    result = _retry_with_backoff(_fetch)

    # Transform issues to a cleaner format
    issues = []
    for issue in result.get("issues", []):
        fields = issue.get("fields", {})
        issues.append({
            "key": issue.get("key"),
            "summary": fields.get("summary"),
            "status": fields.get("status", {}).get("name") if fields.get("status") else None,
            "priority": fields.get("priority", {}).get("name") if fields.get("priority") else None,
            "type": fields.get("issuetype", {}).get("name") if fields.get("issuetype") else None,
            "reporter": {
                "email": fields.get("reporter", {}).get("emailAddress"),
                "name": fields.get("reporter", {}).get("displayName"),
                "avatar": fields.get("reporter", {}).get("avatarUrls", {}).get("48x48"),
            } if fields.get("reporter") else None,
            "assignee": {
                "email": fields.get("assignee", {}).get("emailAddress"),
                "name": fields.get("assignee", {}).get("displayName"),
                "avatar": fields.get("assignee", {}).get("avatarUrls", {}).get("48x48"),
            } if fields.get("assignee") else None,
            "created": fields.get("created"),
            "updated": fields.get("updated"),
            "description": fields.get("description"),
        })

    # Batch lookup Relay Reporters
    try:
        import re
        reporter_emails = set()
        issue_to_email = {}

        for issue in issues:
            desc = _extract_text_from_adf(issue.get("description"))
            relay_email = None
            if "Reporter:" in desc:
                # ADF extracts text WITHOUT wiki markup asterisks, so search for "Reporter:" not "*Reporter:*"
                match = re.search(r"Reporter:\s+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})", desc)
                if match:
                    relay_email = match.group(1)
            
            # Fallback to Jira reporter if still no email (though this usually means it wasn't created via Relay)
            if not relay_email and issue.get("reporter"):
                relay_email = issue["reporter"].get("email")
            
            if relay_email:
                reporter_emails.add(relay_email)
                issue_to_email[issue["key"]] = relay_email

        # Fetch all identified users in one go
        users_data = get_users_by_emails(list(reporter_emails))
        email_to_user = {u["email"]: u for u in users_data}

        # Map back to issues
        for issue in issues:
            email = issue_to_email.get(issue["key"])
            if email and email in email_to_user:
                u = email_to_user[email]
                issue["relayReporter"] = {
                    "name": u["name"],
                    "email": u["email"],
                    "avatar": u["avatar_url"]
                }
            else:
                issue["relayReporter"] = None
            
            # Clean up: description is no longer needed in list view
            if "description" in issue:
                del issue["description"]

    except Exception as e:
        logger.error(f"Failed to batch lookup relay reporters: {e}")
        for issue in issues:
            issue["relayReporter"] = None

    total = result.get("total", 0)
    total_pages = (total + limit - 1) // limit if limit > 0 else 0

    response = {
        "issues": issues,
        "total": total,
        "page": page,
        "totalPages": total_pages,
    }

    # Store in cache
    _set_cache(cache_key, response)

    return response


def get_issue(issue_key: str) -> dict:
    """
    Get a single issue with all details.

    Args:
        issue_key: The Jira issue key (e.g., "BUG-123")

    Returns:
        Dict with full issue details including comments and attachments
    """
    jira = get_jira_client()

    def _fetch():
        return jira.issue(issue_key, expand="changelog")

    issue = _retry_with_backoff(_fetch)
    fields = issue.get("fields", {})

    # Fetch comments separately
    def _fetch_comments():
        return jira.issue_get_comments(issue_key)

    comments_data = _retry_with_backoff(_fetch_comments)
    comments = []
    for comment in comments_data.get("comments", []):
        comments.append({
            "id": comment.get("id"),
            "author": {
                "email": comment.get("author", {}).get("emailAddress"),
                "name": comment.get("author", {}).get("displayName"),
                "avatar": comment.get("author", {}).get("avatarUrls", {}).get("48x48"),
            } if comment.get("author") else None,
            "body": comment.get("body"),
            "created": comment.get("created"),
            "updated": comment.get("updated"),
        })

    # Get attachments (Jira native)
    attachments = []
    for attachment in fields.get("attachment", []):
        attachments.append({
            "id": attachment.get("id"),
            "filename": attachment.get("filename"),
            "size": attachment.get("size"),
            "mimeType": attachment.get("mimeType"),
            "content": attachment.get("content"),  # Download URL
            "created": attachment.get("created"),
            "author": {
                "email": attachment.get("author", {}).get("emailAddress"),
                "name": attachment.get("author", {}).get("displayName"),
            } if attachment.get("author") else None,
            "storage": "jira",
        })

    # Get attachments (Relay R2) from database
    try:
        r2_attachments = db_get_attachments(issue_key)
        for r2 in r2_attachments:
            # Generate presigned URL for private R2 bucket access
            presigned_url = get_presigned_url_for_attachment(r2["url"], expires_in=3600)
            attachments.append({
                "id": r2["id"],
                "filename": r2["filename"],
                "size": r2["size"],
                "mimeType": r2["mime_type"],
                "content": presigned_url,  # Presigned URL for authenticated access
                "created": r2["created_at"],
                "storage": "r2",
                "author": None,
            })
    except Exception as e:
        logger.error(f"Failed to fetch R2 attachments from DB: {e}")

    # Get activity/history from changelog
    history = []
    changelog = issue.get("changelog", {})
    for change in changelog.get("histories", [])[-10:]:  # Last 10 changes
        items = []
        for item in change.get("items", []):
            items.append({
                "field": item.get("field"),
                "from": item.get("fromString"),
                "to": item.get("toString"),
            })
        history.append({
            "id": change.get("id"),
            "author": {
                "email": change.get("author", {}).get("emailAddress"),
                "name": change.get("author", {}).get("displayName"),
            } if change.get("author") else None,
            "created": change.get("created"),
            "items": items,
        })

    issue_detail = {
        "key": issue.get("key"),
        "summary": fields.get("summary"),
        "description": fields.get("description"),
        "status": fields.get("status", {}).get("name") if fields.get("status") else None,
        "priority": fields.get("priority", {}).get("name") if fields.get("priority") else None,
        "type": fields.get("issuetype", {}).get("name") if fields.get("issuetype") else None,
        "reporter": {
            "email": fields.get("reporter", {}).get("emailAddress"),
            "name": fields.get("reporter", {}).get("displayName"),
            "avatar": fields.get("reporter", {}).get("avatarUrls", {}).get("48x48"),
        } if fields.get("reporter") else None,
        "assignee": {
            "email": fields.get("assignee", {}).get("emailAddress"),
            "name": fields.get("assignee", {}).get("displayName"),
            "avatar": fields.get("assignee", {}).get("avatarUrls", {}).get("48x48"),
        } if fields.get("assignee") else None,
        "created": fields.get("created"),
        "updated": fields.get("updated"),
        "comments": comments,
        "attachments": attachments,
        "history": history,
    }

    # Add Relay Reporter info from database
    try:
        # Extract the reporter email from the description if it's there (formatted by Relay)
        # or use the Jira reporter as a fallback
        import re
        relay_email = None
        desc = _extract_text_from_adf(fields.get("description"))
        if "Reporter:" in desc:
            match = re.search(r"\*Reporter:\*\s+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})", desc)
            if match:
                relay_email = match.group(1)
        
        if not relay_email and fields.get("reporter"):
            relay_email = fields.get("reporter", {}).get("emailAddress")

        if relay_email:
            user_data = get_user_by_email(relay_email)
            if user_data:
                issue_detail["relayReporter"] = {
                    "name": user_data["name"],
                    "email": user_data["email"],
                    "avatar": user_data["avatar_url"]
                }
            else:
                issue_detail["relayReporter"] = None
    except Exception as e:
        logger.error(f"Failed to lookup relay reporter: {e}")
        issue_detail["relayReporter"] = None

    return issue_detail


def create_issue(
    summary: str,
    details: str,
    issue_type: str,
    priority: str,
    user_email: str,
    browser: str,
    os_info: str,
    attachment_links: Optional[str] = None,
    # Bug-specific fields (new)
    steps_to_reproduce: Optional[str] = None,
    expected_result: Optional[str] = None,
    actual_result: Optional[str] = None,
    # Story-specific fields
    problem_description: Optional[str] = None,
    proposed_solution: Optional[str] = None,
    acceptance_criteria: Optional[str] = None,
    scope: Optional[str] = None,
    # Task-specific fields
    task_description: Optional[str] = None,
    notes: Optional[str] = None,
    links: Optional[str] = None,
) -> dict:
    """
    Create a new Jira issue with the appropriate SOP template format.

    Args:
        summary: Issue summary
        details: User-provided details (used for legacy or fallback)
        issue_type: Issue type (Bug, Task, Story)
        priority: Priority level (Highest, High, Medium, Low, Lowest)
        user_email: Reporter's email address
        browser: Detected browser info
        os_info: Detected OS info
        attachment_links: Optional attachment links
        steps_to_reproduce: (Bug) User-provided steps to reproduce
        expected_result: (Bug) User-provided expected result
        actual_result: (Bug) User-provided actual result
        problem_description: (Story) Description of the problem
        proposed_solution: (Story) Proposed solution
        acceptance_criteria: (Story) Acceptance criteria (required for Story)
        scope: (Story/Task) Scope description
        task_description: (Task) Description of the task
        notes: (Task) Additional notes
        links: (Task) Links or templates

    Returns:
        Dict with created issue key and self URL
    """
    from ..utils.template_builder import build_jira_description

    jira = get_jira_client()
    project_key = get_project_key()

    # Build the formatted description using the appropriate SOP template
    description = build_jira_description(
        details=details,
        user_email=user_email,
        browser=browser,
        os_info=os_info,
        attachment_links=attachment_links,
        issue_type=issue_type,
        # Bug fields
        steps_to_reproduce=steps_to_reproduce,
        expected_result=expected_result,
        actual_result=actual_result,
        # Story fields
        problem_description=problem_description,
        proposed_solution=proposed_solution,
        acceptance_criteria=acceptance_criteria,
        scope=scope,
        # Task fields
        task_description=task_description,
        notes=notes,
        links=links,
    )

    # Mission 15: SOP: Prefix summary with [Tool]
    tool_prefix = ""
    # Look for a tool name in the summary or description to prefix
    # If the summary already has a [Tool] prefix, don't add another one
    import re
    if not re.match(r'^\[[A-Za-z\s]+\]', summary):
        # We try to find if a tool was mentioned or if we can infer it
        # In a real app, this might come from the 'tool' field in the request
        # For now, we'll try to find any of the known tools in the summary
        for known_tool in ["AI", "Curator", "Metadata", "AutoEat", "Himera", "Mobile App", "MenuCurator", "Reports"]:
            if f"[{known_tool}]" in summary or known_tool.lower() in summary.lower():
                tool_prefix = f"[{known_tool}] "
                break
    
    final_summary = f"{tool_prefix}{summary}"
    
    issue_data = {
        "project": {"key": project_key},
        "summary": final_summary,
        "description": description,
        "issuetype": {"name": issue_type},
        "priority": {"name": priority},
        "labels": ["relay-app"],
    }

    logger.info(f"Creating issue in project {project_key}: {summary}")

    def _create():
        return jira.create_issue(fields=issue_data)

    result = _retry_with_backoff(_create)

    logger.info(f"Created issue: {result.get('key')}")

    # Invalidate issue list cache when a new issue is created
    _invalidate_cache()

    return {
        "key": result.get("key"),
        "self": result.get("self"),
    }


def update_issue(issue_key: str, fields: dict) -> dict:
    """
    Update an existing Jira issue.

    Args:
        issue_key: The Jira issue key (e.g., "BUG-123")
        fields: Dict of fields to update (summary, description, status, priority, assignee)

    Returns:
        Dict with updated issue key
    """
    jira = get_jira_client()

    update_fields = {}

    if "summary" in fields:
        update_fields["summary"] = fields["summary"]

    if "description" in fields:
        update_fields["description"] = fields["description"]

    if "priority" in fields:
        update_fields["priority"] = {"name": fields["priority"]}

    if "assignee" in fields:
        # Assignee requires account ID in Jira Cloud
        update_fields["assignee"] = {"emailAddress": fields["assignee"]} if fields["assignee"] else None

    if update_fields:
        logger.info(f"Updating issue {issue_key}: {list(update_fields.keys())}")

        def _update():
            return jira.update_issue_field(issue_key, update_fields)

        _retry_with_backoff(_update)

    # Handle status transition separately
    if "status" in fields:
        transition_issue(issue_key, fields["status"])

    # Invalidate cache when any issue is updated
    _invalidate_cache()

    return {"key": issue_key}


def transition_issue(issue_key: str, target_status: str) -> dict:
    """
    Transition an issue to a new status.

    Args:
        issue_key: The Jira issue key
        target_status: The target status name

    Returns:
        Dict with issue key and new status
    """
    jira = get_jira_client()

    # Get available transitions
    def _get_transitions():
        return jira.get_issue_transitions(issue_key)

    transitions = _retry_with_backoff(_get_transitions)

    # Find the transition that leads to the target status
    transition_id = None
    for t in transitions.get("transitions", []):
        if t.get("to", {}).get("name", "").lower() == target_status.lower():
            transition_id = t.get("id")
            break

    if not transition_id:
        available = [t.get("to", {}).get("name") for t in transitions.get("transitions", [])]
        raise ValueError(
            f"Cannot transition to '{target_status}'. "
            f"Available transitions: {available}"
        )

    logger.info(f"Transitioning {issue_key} to {target_status}")

    def _transition():
        return jira.issue_transition(issue_key, transition_id)

    _retry_with_backoff(_transition)

    # Invalidate cache when status changes
    _invalidate_cache()

    return {"key": issue_key, "status": target_status}


def add_comment(issue_key: str, comment_text: str, user_email: str) -> dict:
    """
    Add a comment to an issue.

    Args:
        issue_key: The Jira issue key
        comment_text: The comment text
        user_email: Email of the user adding the comment

    Returns:
        Dict with comment details
    """
    jira = get_jira_client()

    # Mission 15: SOP-compliant comment attribution format
    # **Name (Relay):**\n\n Comment text
    
    user_name = user_email
    try:
        user_data = get_user_by_email(user_email)
        if user_data and user_data.get("name"):
            user_name = user_data["name"]
    except Exception as e:
        logger.error(f"Failed to lookup user name for comment: {e}")

    formatted_comment = f"**{user_name} (Relay):**\n\n{comment_text}"

    logger.info(f"Adding comment to {issue_key}")

    def _add_comment():
        return jira.issue_add_comment(issue_key, formatted_comment)

    result = _retry_with_backoff(_add_comment)

    return {
        "id": result.get("id"),
        "body": comment_text,
        "created": result.get("created"),
    }


def upload_attachment(issue_key: str, filename: str, file_content: bytes) -> dict:
    """
    Upload an attachment to an issue.

    Args:
        issue_key: The Jira issue key
        filename: Name of the file
        file_content: File content as bytes

    Returns:
        Dict with attachment details
    """
    jira = get_jira_client()

    logger.info(f"Uploading attachment '{filename}' to {issue_key}")

    def _upload():
        return jira.add_attachment(issue_key, filename=filename, file=file_content)

    result = _retry_with_backoff(_upload)

    # Result is a list of attachments
    if result and len(result) > 0:
        attachment = result[0]
        return {
            "id": attachment.get("id"),
            "filename": attachment.get("filename"),
            "size": attachment.get("size"),
            "mimeType": attachment.get("mimeType"),
            "content": attachment.get("content"),
        }

    return {"filename": filename}


def check_user_can_edit(issue_key: str, user_email: str, user_role: str) -> bool:
    """
    Check if a user can edit an issue.

    Users can edit their own issues. SQA and Admin can edit any issue.

    Args:
        issue_key: The Jira issue key
        user_email: Email of the user
        user_role: Role of the user (user, sqa, admin)

    Returns:
        True if user can edit, False otherwise
    """
    # SQA and Admin can edit any issue
    if user_role in ["sqa", "admin"]:
        return True

    # Regular users can only edit their own issues
    issue = get_issue(issue_key)
    reporter_email = issue.get("reporter", {}).get("email")

    return reporter_email and reporter_email.lower() == user_email.lower()


def get_issues_updated_since(timestamp: str) -> list:
    """
    Get issues updated since a specific timestamp.

    Args:
        timestamp: ISO format timestamp

    Returns:
        List of updated issues (key, summary, status, priority, updated)
    """
    jira = get_jira_client()
    project_key = get_project_key()

    # Convert timestamp to Jira format
    try:
        dt = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
        jira_timestamp = dt.strftime("%Y-%m-%d %H:%M")
    except ValueError:
        jira_timestamp = timestamp

    jql = (
        f"project = '{project_key}' "
        f"AND labels = 'relay-app' "
        f"AND updated >= '{jira_timestamp}' "
        f"ORDER BY updated DESC"
    )

    logger.info(f"Fetching issues updated since {jira_timestamp}")

    def _fetch():
        # Use the new /search/jql endpoint
        path = "rest/api/3/search/jql"
        params = {
            "jql": jql,
            "maxResults": 100,
            "fields": "key,summary,status,priority,updated",
        }
        response = jira.request(method="GET", path=path, params=params)
        return response.json() if hasattr(response, 'json') else response

    result = _retry_with_backoff(_fetch)

    issues = []
    for issue in result.get("issues", []):
        fields = issue.get("fields", {})
        issues.append({
            "key": issue.get("key"),
            "summary": fields.get("summary"),
            "status": fields.get("status", {}).get("name") if fields.get("status") else None,
            "priority": fields.get("priority", {}).get("name") if fields.get("priority") else None,
            "updated": fields.get("updated"),
        })

    return issues
