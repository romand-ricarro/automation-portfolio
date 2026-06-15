from datetime import datetime
from flask import Blueprint, jsonify, request, g
import logging
from sqlalchemy import or_
from models.database import db, ActionItem, Session
from services.auth_service import require_auth, require_role, can_modify_action_item
from schemas import ActionItemCreateSchema, ActionItemUpdateSchema
from marshmallow import ValidationError

logger = logging.getLogger('insightpulse.api.action_items')
bp = Blueprint('action_items', __name__, url_prefix='/api/action-items')


def get_user_session_ids(user):
    """Get session IDs that a user owns (facilitator_name matches)."""
    sessions = Session.query.filter(Session.facilitator_name == user.name).all()
    return [str(s.id) for s in sessions]


@bp.route('', methods=['GET', 'OPTIONS'])
@require_auth
def list_action_items():
    # Filters
    session_id = request.args.get('session_id')
    status = request.args.get('status')
    priority = request.args.get('priority')

    query = ActionItem.query

    # RBAC: Facilitators see items from their own sessions OR assigned to them
    if g.user.role == 'facilitator':
        user_session_ids = get_user_session_ids(g.user)
        query = query.filter(
            or_(
                ActionItem.session_id.in_(user_session_ids),
                ActionItem.person_in_charge == g.user.name
            )
        )

    if session_id:
        query = query.filter_by(session_id=session_id)
    if status:
        query = query.filter_by(status=status)
    if priority:
        query = query.filter_by(priority=priority)

    items = query.order_by(ActionItem.created_at.desc()).all()

    # Include session metadata for each action item
    results = []
    for item in items:
        item_dict = item.to_dict()
        if item.session:
            item_dict['session_name'] = item.session.session_name
            item_dict['session_short_id'] = item.session.session_id
            # Flag if this is an assigned item (not from user's own session)
            if g.user.role == 'facilitator':
                item_dict['is_assigned'] = item.session.facilitator_name != g.user.name
        results.append(item_dict)

    return jsonify(results)


@bp.route('/assigned', methods=['GET', 'OPTIONS'])
@require_auth
def list_assigned_items():
    """
    Get action items assigned to current user from OTHER sessions.
    Facilitators see items where person_in_charge matches their name,
    but the session is NOT owned by them.
    """
    user_session_ids = get_user_session_ids(g.user)

    # Items assigned to me but NOT from my sessions
    query = ActionItem.query.filter(
        ActionItem.person_in_charge == g.user.name,
        ~ActionItem.session_id.in_(user_session_ids) if user_session_ids else True
    )

    items = query.order_by(ActionItem.created_at.desc()).all()

    results = []
    for item in items:
        item_dict = item.to_dict()
        if item.session:
            item_dict['session_name'] = item.session.session_name
            item_dict['session_short_id'] = item.session.session_id
            item_dict['session_date'] = item.session.session_date.isoformat() if item.session.session_date else None
        item_dict['is_assigned'] = True
        results.append(item_dict)

    return jsonify(results)

@bp.route('', methods=['POST', 'OPTIONS'])
@require_auth
@require_role('facilitator')
def create_action_item():
    data = request.get_json() or {}

    # Validate input using schema
    schema = ActionItemCreateSchema()
    try:
        validated_data = schema.load(data)
    except ValidationError as err:
        logger.info(f"Action item creation validation failed: {err.messages}")
        return jsonify({'error': 'Validation failed', 'details': err.messages}), 400

    # RBAC: Facilitators can only create items for their own sessions
    if g.user.role == 'facilitator':
        session = Session.query.get(str(validated_data['session_id']))
        if not session or session.facilitator_name != g.user.name:
            logger.warning(f"User {g.user.id} attempted to create action item for session they don't own")
            return jsonify({'error': 'Access denied - you can only create action items for your own sessions'}), 403

    try:
        item = ActionItem(
            session_id=str(validated_data['session_id']),
            issue=validated_data['issue'],
            action=validated_data['action'],
            priority=validated_data['priority'],
            person_in_charge=validated_data.get('person_in_charge'),
            deadline=validated_data.get('deadline'),
            status=validated_data.get('status', 'Open'),
            notes=validated_data.get('notes'),
            created_by=g.user.id,
            updated_by=g.user.id
        )
        db.session.add(item)
        db.session.commit()
        logger.info(f"Action item {item.id} created by user {g.user.id}")
        return jsonify(item.to_dict()), 201

    except Exception as e:
        db.session.rollback()
        logger.exception(f"Action item creation failed: {str(e)}")
        return jsonify({'error': str(e)}), 500

@bp.route('/<uuid:id>', methods=['PUT', 'OPTIONS'])
@require_auth
@require_role('facilitator')
def update_action_item(id):
    item = ActionItem.query.get(str(id))
    if not item:
        return jsonify({'error': 'Item not found'}), 404

    # RBAC: Check if user can modify this action item
    if not can_modify_action_item(g.user, item):
        logger.warning(f"User {g.user.id} attempted to update action item {id} without permission")
        return jsonify({'error': 'Access denied - you can only edit action items from your own sessions'}), 403

    data = request.get_json() or {}

    # Validate input using schema
    schema = ActionItemUpdateSchema()
    try:
        validated_data = schema.load(data)
    except ValidationError as err:
        logger.info(f"Action item update validation failed: {err.messages}")
        return jsonify({'error': 'Validation failed', 'details': err.messages}), 400

    try:
        if 'issue' in validated_data:
            item.issue = validated_data['issue']
        if 'action' in validated_data:
            item.action = validated_data['action']
        if 'priority' in validated_data:
            item.priority = validated_data['priority']
        if 'person_in_charge' in validated_data:
            item.person_in_charge = validated_data['person_in_charge']
        if 'deadline' in validated_data:
            item.deadline = validated_data['deadline']
        if 'status' in validated_data:
            item.status = validated_data['status']
        if 'notes' in validated_data:
            item.notes = validated_data['notes']

        item.updated_by = g.user.id
        db.session.commit()
        logger.info(f"Action item {id} updated by user {g.user.id}")
        return jsonify(item.to_dict())

    except Exception as e:
        db.session.rollback()
        logger.exception(f"Action item update failed: {str(e)}")
        return jsonify({'error': str(e)}), 500

@bp.route('/<uuid:id>', methods=['DELETE', 'OPTIONS'])
@require_auth
@require_role('facilitator')
def delete_action_item(id):
    item = ActionItem.query.get(str(id))
    if not item:
        return jsonify({'error': 'Item not found'}), 404

    # RBAC: Check if user can modify this action item
    if not can_modify_action_item(g.user, item):
        logger.warning(f"User {g.user.id} attempted to delete action item {id} without permission")
        return jsonify({'error': 'Access denied - you can only delete action items from your own sessions'}), 403

    try:
        db.session.delete(item)
        db.session.commit()
        return jsonify({'message': 'Deleted successfully'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/<uuid:id>/approve', methods=['PUT', 'OPTIONS'])
@require_auth
@require_role('admin')
def approve_action_item(id):
    """Approve an action item (admin only)."""
    item = ActionItem.query.get(str(id))
    if not item:
        return jsonify({'error': 'Item not found'}), 404

    item.approved_at = datetime.utcnow()
    item.approved_by = g.user.id
    db.session.commit()
    logger.info(f"Action item {id} approved by admin {g.user.id}")
    return jsonify(item.to_dict())


@bp.route('/<uuid:id>/approve', methods=['DELETE', 'OPTIONS'])
@require_auth
@require_role('admin')
def unapprove_action_item(id):
    """Remove approval from an action item (admin only)."""
    item = ActionItem.query.get(str(id))
    if not item:
        return jsonify({'error': 'Item not found'}), 404

    item.approved_at = None
    item.approved_by = None
    db.session.commit()
    logger.info(f"Action item {id} unapproved by admin {g.user.id}")
    return jsonify(item.to_dict())
