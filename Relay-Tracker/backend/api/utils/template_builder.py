"""Template builder for Jira issue descriptions.

Transforms simple user input into the professional SQA template format.
Supports different templates for Bug, Story, and Task issue types.
"""

from typing import Optional


def build_bug_description(
    user_email: str,
    browser: str,
    os_info: str,
    steps_to_reproduce: str,
    expected_result: str,
    actual_result: str,
    recording_link: Optional[str] = None,
) -> str:
    """
    Build a Bug issue description using the SQA template format.

    Args:
        user_email: Reporter's email address
        browser: Detected browser info (e.g., "Chrome 120.0.0")
        os_info: Detected OS info (e.g., "Windows 11")
        steps_to_reproduce: User-provided steps to reproduce
        expected_result: User-provided expected result
        actual_result: User-provided actual result
        recording_link: Optional BEB/video recording link

    Returns:
        Formatted Jira description string for Bug
    """
    link_text = recording_link if recording_link else "[No recording provided]"

    template = f"""*ENVIRONMENT:*
Browser: {browser}
OS: {os_info}

*STEPS TO REPRODUCE:*
[To be filled by SQA]

*EXPECTED RESULT:*
[To be filled by SQA]

*ACTUAL RESULT:*
[To be filled by SQA]

*SCOPE:*
[To be filled by SQA]

*PLEASE SEE (BEB LINK):*
{link_text}

*(FOR SQA ONLY) WATCHERS:*
[To be filled by SQA]

*(FOR SQA ONLY) DEVELOPERS:*
[To be filled by SQA]

----

*USER PROVIDED INFORMATION:*
*Steps To Reproduce:*
{steps_to_reproduce}

*Expected Result:*
{expected_result}

*Actual Result:*
{actual_result}

*Reporter:* {user_email} (Relay App)"""

    return template


def build_story_description(
    problem_description: str,
    proposed_solution: str,
    acceptance_criteria: str,
    user_email: str,
    scope: Optional[str] = None,
    recording_link: Optional[str] = None,
) -> str:
    """
    Build a Story/Feature issue description.

    Args:
        problem_description: Description of the problem to solve
        proposed_solution: Proposed solution approach
        acceptance_criteria: Acceptance criteria (required)
        user_email: Reporter's email address
        scope: Optional scope description
        recording_link: Optional video/screenshot link

    Returns:
        Formatted Jira description string for Story
    """
    scope_text = scope if scope else "[Not specified]"

    # Only include recording link section if provided
    recording_section = ""
    if recording_link:
        recording_section = f"""
*PLEASE SEE:*
{recording_link}
"""

    template = f"""*PROBLEM DESCRIPTION:*
{problem_description}

*PROPOSED SOLUTION:*
{proposed_solution}

*SCOPE:*
{scope_text}

*ACCEPTANCE CRITERIA:*
{acceptance_criteria}{recording_section}

----

*Reporter:* {user_email} (Relay App)"""

    return template


def build_task_description(
    task_description: str,
    user_email: str,
    notes: Optional[str] = None,
    links: Optional[str] = None,
    recording_link: Optional[str] = None,
) -> str:
    """
    Build a Task issue description.

    Args:
        task_description: Description of the task (required)
        user_email: Reporter's email address
        notes: Optional additional notes
        links: Optional links or templates
        recording_link: Optional video/screenshot link

    Returns:
        Formatted Jira description string for Task
    """
    notes_text = notes if notes else "[No notes provided]"
    links_text = links if links else "[No links provided]"

    # Only include recording link section if provided
    recording_section = ""
    if recording_link:
        recording_section = f"""
*PLEASE SEE:*
{recording_link}
"""

    template = f"""*TASK DESCRIPTION:*
{task_description}

*NOTES:*
{notes_text}

*LINKS / TEMPLATES:*
{links_text}{recording_section}

----

*Reporter:* {user_email} (Relay App)"""

    return template


def build_jira_description(
    details: str,
    user_email: str,
    browser: str,
    os_info: str,
    attachment_links: Optional[str] = None,
    issue_type: str = "Bug",
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
) -> str:
    """
    Build a Jira issue description using the appropriate template based on issue type.

    Args:
        details: Detailed description (used for legacy or fallback)
        user_email: Reporter's email address
        browser: Detected browser info
        os_info: Detected OS info
        attachment_links: Optional BEB/attachment links
        issue_type: Type of issue (Bug, Story, Task)
        steps_to_reproduce: (Bug) User-provided steps to reproduce
        expected_result: (Bug) User-provided expected result
        actual_result: (Bug) User-provided actual result
        problem_description: (Story) Description of the problem
        proposed_solution: (Story) Proposed solution
        acceptance_criteria: (Story) Acceptance criteria (required for Story)
        scope: (Story) Scope of the feature
        task_description: (Task) Description of the task (required for Task)
        notes: (Task) Additional notes
        links: (Task) Links or templates

    Returns:
        Formatted Jira description string
    """
    if issue_type == "Story":
        return build_story_description(
            problem_description=problem_description or details,
            proposed_solution=proposed_solution or "[To be determined]",
            acceptance_criteria=acceptance_criteria or "[Required - please specify]",
            user_email=user_email,
            scope=scope,
            recording_link=attachment_links,
        )
    elif issue_type == "Task":
        return build_task_description(
            task_description=task_description or details,
            user_email=user_email,
            notes=notes,
            links=links,
            recording_link=attachment_links,
        )
    else:
        # Default: Bug template
        return build_bug_description(
            user_email=user_email,
            browser=browser,
            os_info=os_info,
            steps_to_reproduce=steps_to_reproduce or details,
            expected_result=expected_result or "[Required - please specify]",
            actual_result=actual_result or "[Required - please specify]",
            recording_link=attachment_links,
        )


def parse_user_agent(user_agent: str) -> tuple[str, str]:
    """
    Parse User-Agent string to extract browser and OS information.

    Args:
        user_agent: The User-Agent header string

    Returns:
        Tuple of (browser, os_info)
    """
    browser = "Unknown Browser"
    os_info = "Unknown OS"

    if not user_agent:
        return browser, os_info

    ua_lower = user_agent.lower()

    # Detect OS
    if "windows nt 10" in ua_lower:
        if "windows nt 10.0" in ua_lower:
            os_info = "Windows 10/11"
        else:
            os_info = "Windows 10"
    elif "windows nt 11" in ua_lower:
        os_info = "Windows 11"
    elif "windows nt 6.3" in ua_lower:
        os_info = "Windows 8.1"
    elif "windows nt 6.2" in ua_lower:
        os_info = "Windows 8"
    elif "windows nt 6.1" in ua_lower:
        os_info = "Windows 7"
    elif "mac os x" in ua_lower:
        os_info = "macOS"
        # Try to extract version
        import re
        mac_match = re.search(r"mac os x (\d+[._]\d+)", ua_lower)
        if mac_match:
            version = mac_match.group(1).replace("_", ".")
            os_info = f"macOS {version}"
    elif "linux" in ua_lower:
        if "android" in ua_lower:
            os_info = "Android"
            android_match = __import__("re").search(r"android (\d+\.?\d*)", ua_lower)
            if android_match:
                os_info = f"Android {android_match.group(1)}"
        else:
            os_info = "Linux"
    elif "iphone" in ua_lower or "ipad" in ua_lower:
        os_info = "iOS"
        ios_match = __import__("re").search(r"os (\d+[._]\d+)", ua_lower)
        if ios_match:
            version = ios_match.group(1).replace("_", ".")
            os_info = f"iOS {version}"
    elif "cros" in ua_lower:
        os_info = "Chrome OS"

    # Detect Browser (order matters - more specific first)
    import re

    if "edg/" in ua_lower or "edge/" in ua_lower:
        browser = "Microsoft Edge"
        edge_match = re.search(r"edg[e]?/(\d+\.?\d*)", ua_lower)
        if edge_match:
            browser = f"Microsoft Edge {edge_match.group(1)}"
    elif "opr/" in ua_lower or "opera" in ua_lower:
        browser = "Opera"
        opera_match = re.search(r"opr/(\d+\.?\d*)", ua_lower)
        if opera_match:
            browser = f"Opera {opera_match.group(1)}"
    elif "firefox/" in ua_lower:
        browser = "Firefox"
        ff_match = re.search(r"firefox/(\d+\.?\d*)", ua_lower)
        if ff_match:
            browser = f"Firefox {ff_match.group(1)}"
    elif "safari/" in ua_lower and "chrome" not in ua_lower:
        browser = "Safari"
        safari_match = re.search(r"version/(\d+\.?\d*)", ua_lower)
        if safari_match:
            browser = f"Safari {safari_match.group(1)}"
    elif "chrome/" in ua_lower:
        browser = "Chrome"
        chrome_match = re.search(r"chrome/(\d+\.?\d*)", ua_lower)
        if chrome_match:
            browser = f"Chrome {chrome_match.group(1)}"

    return browser, os_info
