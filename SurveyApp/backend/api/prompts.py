"""
API endpoints for managing AI prompt templates.
Admin-only access for template management.
"""
from flask import Blueprint, jsonify, request, g
import logging
from models.database import db, PromptTemplate, PromptTemplateVersion
from services.auth_service import require_auth, require_role
from services.prompt_service import (
    get_template, create_template, update_template, revert_template,
    preview_template, extract_variables, initialize_default_templates,
    DEFAULT_TEMPLATES
)
from marshmallow import Schema, fields, validate, ValidationError

logger = logging.getLogger('insightpulse.api.prompts')
bp = Blueprint('prompts', __name__, url_prefix='/api/prompts')


# Validation schemas
class PromptCreateSchema(Schema):
    """Schema for creating a new prompt template."""
    slug = fields.String(
        required=True,
        validate=validate.Regexp(r'^[a-z][a-z0-9_]*$', error='Slug must be lowercase alphanumeric with underscores')
    )
    name = fields.String(required=True, validate=validate.Length(min=1, max=100))
    template_content = fields.String(required=True, validate=validate.Length(min=10))


class PromptUpdateSchema(Schema):
    """Schema for updating a prompt template."""
    template_content = fields.String(required=True, validate=validate.Length(min=10))
    change_note = fields.String(validate=validate.Length(max=500))


class PromptPreviewSchema(Schema):
    """Schema for previewing a prompt template."""
    sample_data = fields.Dict(keys=fields.String(), values=fields.Raw())


@bp.route('', methods=['GET', 'OPTIONS'])
@require_auth
@require_role('admin')
def list_templates():
    """
    List all prompt templates.
    Returns templates with basic info (not full content).
    """
    templates = PromptTemplate.query.order_by(PromptTemplate.name).all()

    return jsonify([{
        'id': str(t.id),
        'name': t.name,
        'slug': t.slug,
        'version': t.version,
        'is_active': t.is_active,
        'updated_at': t.updated_at.isoformat() if t.updated_at else None,
    } for t in templates])


@bp.route('/defaults', methods=['GET', 'OPTIONS'])
@require_auth
@require_role('admin')
def list_default_templates():
    """
    List available default templates.
    """
    return jsonify([{
        'slug': slug,
        'name': data['name'],
        'variables': extract_variables(data['template_content'])
    } for slug, data in DEFAULT_TEMPLATES.items()])


@bp.route('/initialize', methods=['POST', 'OPTIONS'])
@require_auth
@require_role('admin')
def init_templates():
    """
    Initialize default templates in the database.
    Only creates templates that don't already exist.
    """
    try:
        initialize_default_templates(created_by=str(g.user.id))
        logger.info(f"Templates initialized by user {g.user.id}")
        return jsonify({'message': 'Default templates initialized'})
    except Exception as e:
        logger.exception(f"Failed to initialize templates: {e}")
        return jsonify({'error': str(e)}), 500


@bp.route('', methods=['POST', 'OPTIONS'])
@require_auth
@require_role('admin')
def create_new_template():
    """
    Create a new prompt template.
    """
    data = request.get_json() or {}

    # Validate input
    schema = PromptCreateSchema()
    try:
        validated = schema.load(data)
    except ValidationError as err:
        return jsonify({'error': 'Validation failed', 'details': err.messages}), 400

    # Check if slug already exists
    existing = PromptTemplate.query.filter_by(slug=validated['slug']).first()
    if existing:
        return jsonify({'error': f"Template with slug '{validated['slug']}' already exists"}), 409

    try:
        template = create_template(
            slug=validated['slug'],
            name=validated['name'],
            template_content=validated['template_content'],
            created_by=str(g.user.id)
        )
        logger.info(f"Template '{validated['slug']}' created by user {g.user.id}")
        return jsonify(template.to_dict(include_versions=True)), 201

    except Exception as e:
        db.session.rollback()
        logger.exception(f"Failed to create template: {e}")
        return jsonify({'error': str(e)}), 500


@bp.route('/<slug>', methods=['GET', 'OPTIONS'])
@require_auth
@require_role('admin')
def get_template_by_slug(slug):
    """
    Get a prompt template by slug with full content and version history.
    """
    template = PromptTemplate.query.filter_by(slug=slug).first()
    if not template:
        return jsonify({'error': 'Template not found'}), 404

    return jsonify(template.to_dict(include_versions=True))


@bp.route('/<slug>', methods=['PUT', 'OPTIONS'])
@require_auth
@require_role('admin')
def update_template_by_slug(slug):
    """
    Update a prompt template content.
    Creates a new version automatically.
    """
    template = PromptTemplate.query.filter_by(slug=slug).first()
    if not template:
        return jsonify({'error': 'Template not found'}), 404

    data = request.get_json() or {}

    # Validate input
    schema = PromptUpdateSchema()
    try:
        validated = schema.load(data)
    except ValidationError as err:
        return jsonify({'error': 'Validation failed', 'details': err.messages}), 400

    try:
        updated = update_template(
            slug=slug,
            template_content=validated['template_content'],
            updated_by=str(g.user.id),
            change_note=validated.get('change_note')
        )
        logger.info(f"Template '{slug}' updated to v{updated.version} by user {g.user.id}")
        return jsonify(updated.to_dict(include_versions=True))

    except Exception as e:
        db.session.rollback()
        logger.exception(f"Failed to update template: {e}")
        return jsonify({'error': str(e)}), 500


@bp.route('/<slug>/preview', methods=['POST', 'OPTIONS'])
@require_auth
@require_role('admin')
def preview_template_render(slug):
    """
    Preview a template with sample data.
    """
    # Check template exists
    template = PromptTemplate.query.filter_by(slug=slug).first()
    if not template:
        # Check if it's a default template
        if slug not in DEFAULT_TEMPLATES:
            return jsonify({'error': 'Template not found'}), 404

    data = request.get_json() or {}

    # Validate input
    schema = PromptPreviewSchema()
    try:
        validated = schema.load(data)
    except ValidationError as err:
        return jsonify({'error': 'Validation failed', 'details': err.messages}), 400

    try:
        result = preview_template(slug, validated.get('sample_data'))
        return jsonify(result)

    except Exception as e:
        logger.exception(f"Failed to preview template: {e}")
        return jsonify({'error': str(e)}), 500


@bp.route('/<slug>/revert/<int:version>', methods=['POST', 'OPTIONS'])
@require_auth
@require_role('admin')
def revert_template_version(slug, version):
    """
    Revert a template to a previous version.
    """
    template = PromptTemplate.query.filter_by(slug=slug).first()
    if not template:
        return jsonify({'error': 'Template not found'}), 404

    try:
        reverted = revert_template(
            slug=slug,
            target_version=version,
            reverted_by=str(g.user.id)
        )
        logger.info(f"Template '{slug}' reverted to v{version} by user {g.user.id}")
        return jsonify(reverted.to_dict(include_versions=True))

    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        db.session.rollback()
        logger.exception(f"Failed to revert template: {e}")
        return jsonify({'error': str(e)}), 500


@bp.route('/<slug>/versions', methods=['GET', 'OPTIONS'])
@require_auth
@require_role('admin')
def get_template_versions(slug):
    """
    Get version history for a template.
    """
    template = PromptTemplate.query.filter_by(slug=slug).first()
    if not template:
        return jsonify({'error': 'Template not found'}), 404

    versions = PromptTemplateVersion.query.filter_by(
        template_id=template.id
    ).order_by(PromptTemplateVersion.version.desc()).all()

    return jsonify([v.to_dict() for v in versions])


@bp.route('/<slug>', methods=['DELETE', 'OPTIONS'])
@require_auth
@require_role('admin')
def delete_template(slug):
    """
    Delete a prompt template.
    """
    template = PromptTemplate.query.filter_by(slug=slug).first()
    if not template:
        return jsonify({'error': 'Template not found'}), 404

    try:
        db.session.delete(template)
        db.session.commit()
        logger.info(f"Template '{slug}' deleted by user {g.user.id}")
        return jsonify({'message': f"Template '{slug}' deleted successfully"})

    except Exception as e:
        db.session.rollback()
        logger.exception(f"Failed to delete template: {e}")
        return jsonify({'error': str(e)}), 500


@bp.route('/<slug>/toggle', methods=['POST', 'OPTIONS'])
@require_auth
@require_role('admin')
def toggle_template_active(slug):
    """
    Toggle a template's active status.
    """
    template = PromptTemplate.query.filter_by(slug=slug).first()
    if not template:
        return jsonify({'error': 'Template not found'}), 404

    try:
        template.is_active = not template.is_active
        db.session.commit()
        logger.info(f"Template '{slug}' {'activated' if template.is_active else 'deactivated'} by user {g.user.id}")
        return jsonify(template.to_dict())

    except Exception as e:
        db.session.rollback()
        logger.exception(f"Failed to toggle template: {e}")
        return jsonify({'error': str(e)}), 500
