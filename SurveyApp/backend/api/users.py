from datetime import datetime
import logging
from flask import Blueprint, jsonify, request, g
from services.auth_service import require_auth, require_role
from models.database import User, db
from schemas import UserRoleUpdateSchema, UserAccessUpdateSchema, UserNameUpdateSchema, UserBulkCreateSchema
from marshmallow import ValidationError

logger = logging.getLogger('insightpulse.api.users')
bp = Blueprint('users', __name__, url_prefix='/api/users')

@bp.route('', methods=['GET', 'OPTIONS'])
@require_auth
@require_role('admin')
def list_users():
    # Filter out deleted users by default
    users = User.query.filter(User.deleted_at.is_(None)).all()
    return jsonify([u.to_dict() for u in users])

@bp.route('/<uuid:id>/role', methods=['PUT', 'OPTIONS'])
@require_auth
@require_role('admin')
def update_user_role(id):
    data = request.get_json() or {}

    # Validate input using schema
    schema = UserRoleUpdateSchema()
    try:
        validated_data = schema.load(data)
    except ValidationError as err:
        logger.info(f"User role update validation failed: {err.messages}")
        return jsonify({'error': 'Validation failed', 'details': err.messages}), 400

    user = User.query.get(str(id))
    if not user:
        return jsonify({'error': 'User not found'}), 404

    user.role = validated_data['role']
    db.session.commit()
    logger.info(f"User {id} role updated to {validated_data['role']} by {g.user.id}")

    return jsonify(user.to_dict())

@bp.route('/<uuid:id>/name', methods=['PUT', 'OPTIONS'])
@require_auth
@require_role('admin')
def update_user_name(id):
    """Update a user's display name (used for facilitator matching)."""
    data = request.get_json() or {}

    schema = UserNameUpdateSchema()
    try:
        validated_data = schema.load(data)
    except ValidationError as err:
        logger.info(f"User name update validation failed: {err.messages}")
        return jsonify({'error': 'Validation failed', 'details': err.messages}), 400

    user = User.query.get(str(id))
    if not user:
        return jsonify({'error': 'User not found'}), 404

    user.name = validated_data['name']
    db.session.commit()
    logger.info(f"User {id} name updated to '{validated_data['name']}' by {g.user.id}")

    return jsonify(user.to_dict())


@bp.route('/names', methods=['GET', 'OPTIONS'])
@require_auth
def list_user_names():
    """Return list of active user names for dropdowns (available to all authenticated users)."""
    users = User.query.filter(
        User.deleted_at.is_(None),
        User.is_active == True,
        User.name.isnot(None),
        User.name != ''
    ).order_by(User.name).all()
    return jsonify([{'id': str(u.id), 'name': u.name} for u in users])


@bp.route('/me', methods=['GET', 'OPTIONS'])
@require_auth
def get_current_user():
    # Helper to get own profile
    return jsonify(g.user.to_dict())


@bp.route('/<uuid:id>/access', methods=['PUT', 'OPTIONS'])
@require_auth
@require_role('admin')
def update_user_access(id):
    """Toggle user's is_active status."""
    data = request.get_json() or {}

    # Validate input using schema
    schema = UserAccessUpdateSchema()
    try:
        validated_data = schema.load(data)
    except ValidationError as err:
        logger.info(f"User access update validation failed: {err.messages}")
        return jsonify({'error': 'Validation failed', 'details': err.messages}), 400

    user = User.query.get(str(id))
    if not user:
        return jsonify({'error': 'User not found'}), 404

    # Prevent admin from disabling their own account
    if str(g.user.id) == str(id):
        return jsonify({'error': 'Cannot disable your own account'}), 400

    user.is_active = validated_data['is_active']
    db.session.commit()
    logger.info(f"User {id} access updated to {validated_data['is_active']} by {g.user.id}")

    return jsonify(user.to_dict())


@bp.route('/<uuid:id>', methods=['DELETE', 'OPTIONS'])
@require_auth
@require_role('admin')
def delete_user(id):
    """Soft delete a user by setting deleted_at timestamp."""
    user = User.query.get(str(id))
    if not user:
        return jsonify({'error': 'User not found'}), 404

    # Prevent admin from deleting their own account
    if str(g.user.id) == str(id):
        return jsonify({'error': 'Cannot delete your own account'}), 400

    user.deleted_at = datetime.utcnow()
    db.session.commit()

    return jsonify({'message': 'User deleted successfully'})


@bp.route('/bulk', methods=['POST', 'OPTIONS'])
@require_auth
@require_role('admin')
def create_bulk_users():
    """Create multiple users at once from a list of emails."""
    data = request.get_json() or {}

    # Validate input using schema
    schema = UserBulkCreateSchema()
    try:
        validated_data = schema.load(data)
    except ValidationError as err:
        logger.info(f"Bulk user creation validation failed: {err.messages}")
        return jsonify({'error': 'Validation failed', 'details': err.messages}), 400

    emails = validated_data['emails']
    default_role = validated_data.get('role', 'viewer')

    created = []
    skipped = []
    errors = []

    for email in emails:
        email = email.strip().lower()
        if not email:
            continue

        # Check if user already exists (including soft-deleted)
        existing = User.query.filter_by(email=email).first()
        if existing:
            if existing.deleted_at:
                # Restore soft-deleted user
                existing.deleted_at = None
                existing.is_active = True
                existing.role = default_role
                db.session.commit()
                created.append(existing.to_dict())
            else:
                skipped.append({'email': email, 'reason': 'User already exists'})
            continue

        # Create new user
        user = User(
            email=email,
            role=default_role,
            is_active=True
        )
        db.session.add(user)
        db.session.commit()
        created.append(user.to_dict())

    logger.info(f"Bulk user creation by {g.user.id}: {len(created)} created, {len(skipped)} skipped")

    return jsonify({
        'created': created,
        'skipped': skipped,
        'errors': errors,
        'summary': {
            'created_count': len(created),
            'skipped_count': len(skipped),
            'error_count': len(errors)
        }
    })
