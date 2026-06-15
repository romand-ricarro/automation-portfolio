"""
Prompt service for managing and rendering AI prompt templates.
Provides template loading from database and variable substitution.
"""
import re
import json
import logging
from typing import Dict, Any, Optional, List
from models.database import db, PromptTemplate, PromptTemplateVersion

logger = logging.getLogger('insightpulse.prompt_service')

# Default templates (used when database is empty or for fallback)
DEFAULT_TEMPLATES = {
    'question_analysis': {
        'name': 'Question Analysis',
        'template_content': '''You are assisting a manager in analyzing survey responses. For the following survey question and responses, please:

1. Summarize the main trends by grouping similar responses together.
2. Enumerate the exact number of respondents who shared each similar answer.
3. Ensure the total number of respondents in your analysis matches the total number of responses provided.
4. Present the findings in bullet form, specifying the number of respondents for each point.
5. Avoid miscalculations, misunderstandings, overcomplications, and misinterpretations by carefully reviewing each response and basing your analysis strictly on the information provided.
6. After the findings, provide a key insight.
7. Keep the insights concise and directly related to the data.
8. Make sure that subpoints are elaborate and clearly indicate and explain the issues mentioned by the respondents.

Make sure to use simple and easy-to-understand language.
By reading the summary, I should clearly understand each bucket without needing to visit or re-read the actual responses.
Also, don't mention entry numbers—just include the number of mentions per bucket. No need to add dates or anything else.

Survey Question: {{question_name}}

Responses to analyse:
{{responses}}

Total respondents: {{response_count}}'''
    },
    'common_issues': {
        'name': 'Common Issues Table',
        'template_content': '''Create a common issue table using the following survey analysis as data. We will put the info in a table for easier analysis.

{{analyses}}

Format as a table with:
- Column 1: Common Issue (the main theme)
- Column 2: Evidence/Signal (supporting details)

Make it clear and structured.'''
    }
}


def get_template(slug: str) -> Optional[PromptTemplate]:
    """
    Get a prompt template by slug.
    Returns None if not found.
    """
    return PromptTemplate.query.filter_by(slug=slug, is_active=True).first()


def get_template_content(slug: str) -> str:
    """
    Get template content by slug, with fallback to default.
    """
    template = get_template(slug)
    if template:
        return template.template_content

    # Fallback to default template
    default = DEFAULT_TEMPLATES.get(slug)
    if default:
        logger.info(f"Using default template for '{slug}' (not found in database)")
        return default['template_content']

    raise ValueError(f"No template found for slug: {slug}")


def render_template(slug: str, variables: Dict[str, Any]) -> str:
    """
    Render a prompt template with variable substitution.

    Variables are substituted using {{variable_name}} syntax.

    Args:
        slug: Template slug identifier
        variables: Dictionary of variable values

    Returns:
        Rendered template string
    """
    template_content = get_template_content(slug)
    return substitute_variables(template_content, variables)


def substitute_variables(template: str, variables: Dict[str, Any]) -> str:
    """
    Substitute variables in a template string.

    Supports {{variable_name}} syntax.
    Lists are converted to newline-separated strings with bullet points.
    Dicts are converted to JSON.
    """
    def replace_var(match):
        var_name = match.group(1).strip()
        value = variables.get(var_name, match.group(0))  # Keep original if not found

        if value is None:
            return ''
        elif isinstance(value, list):
            # Format list as bullet points
            return '\n'.join([f"- {item}" for item in value])
        elif isinstance(value, dict):
            return json.dumps(value, indent=2)
        else:
            return str(value)

    # Match {{variable_name}} pattern
    pattern = r'\{\{(\s*[\w_]+\s*)\}\}'
    return re.sub(pattern, replace_var, template)


def extract_variables(template_content: str) -> List[str]:
    """
    Extract all variable names from a template.

    Returns list of variable names found in {{}} syntax.
    """
    pattern = r'\{\{(\s*[\w_]+\s*)\}\}'
    matches = re.findall(pattern, template_content)
    return list(set(match.strip() for match in matches))


def create_template(slug: str, name: str, template_content: str, created_by: str = None) -> PromptTemplate:
    """
    Create a new prompt template.
    """
    template = PromptTemplate(
        slug=slug,
        name=name,
        template_content=template_content,
        version=1,
        is_active=True,
        created_by=created_by
    )
    db.session.add(template)

    # Create initial version
    version = PromptTemplateVersion(
        template=template,
        version=1,
        template_content=template_content,
        created_by=created_by,
        change_note='Initial version'
    )
    db.session.add(version)
    db.session.commit()

    logger.info(f"Created prompt template: {slug} (v1)")
    return template


def update_template(slug: str, template_content: str, updated_by: str = None,
                   change_note: str = None) -> PromptTemplate:
    """
    Update a prompt template and create a new version.
    """
    template = PromptTemplate.query.filter_by(slug=slug).first()
    if not template:
        raise ValueError(f"Template not found: {slug}")

    # Increment version
    new_version = template.version + 1

    # Save old content as version
    version = PromptTemplateVersion(
        template_id=template.id,
        version=template.version,
        template_content=template.template_content,
        created_by=updated_by,
        change_note=f"Replaced by version {new_version}"
    )
    db.session.add(version)

    # Update template
    template.template_content = template_content
    template.version = new_version

    db.session.commit()

    logger.info(f"Updated prompt template: {slug} (v{new_version})")
    return template


def revert_template(slug: str, target_version: int, reverted_by: str = None) -> PromptTemplate:
    """
    Revert a template to a previous version.
    """
    template = PromptTemplate.query.filter_by(slug=slug).first()
    if not template:
        raise ValueError(f"Template not found: {slug}")

    # Find the target version
    version_record = PromptTemplateVersion.query.filter_by(
        template_id=template.id,
        version=target_version
    ).first()

    if not version_record:
        raise ValueError(f"Version {target_version} not found for template: {slug}")

    # Create new version with reverted content
    new_version = template.version + 1

    # Save current as version
    current_version = PromptTemplateVersion(
        template_id=template.id,
        version=template.version,
        template_content=template.template_content,
        created_by=reverted_by,
        change_note=f"Replaced by revert to v{target_version}"
    )
    db.session.add(current_version)

    # Update template with reverted content
    template.template_content = version_record.template_content
    template.version = new_version

    db.session.commit()

    logger.info(f"Reverted prompt template: {slug} to v{target_version} (now v{new_version})")
    return template


def initialize_default_templates(created_by: str = None):
    """
    Initialize default templates in the database if they don't exist.
    """
    for slug, template_data in DEFAULT_TEMPLATES.items():
        existing = PromptTemplate.query.filter_by(slug=slug).first()
        if not existing:
            create_template(
                slug=slug,
                name=template_data['name'],
                template_content=template_data['template_content'],
                created_by=created_by
            )
            logger.info(f"Initialized default template: {slug}")


def preview_template(slug: str, sample_data: Dict[str, Any] = None) -> Dict[str, Any]:
    """
    Preview a template with sample data.

    Returns:
        Dictionary with 'rendered' content and 'variables' list
    """
    template_content = get_template_content(slug)
    variables = extract_variables(template_content)

    # Use sample data if provided, otherwise use placeholders
    if sample_data is None:
        sample_data = {var: f"[SAMPLE_{var.upper()}]" for var in variables}

    rendered = substitute_variables(template_content, sample_data)

    return {
        'template_content': template_content,
        'variables': variables,
        'rendered': rendered,
        'sample_data': sample_data
    }
