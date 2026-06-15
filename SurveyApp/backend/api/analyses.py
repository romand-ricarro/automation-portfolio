from flask import Blueprint, jsonify, request
from models.database import db, QuestionAnalysis, CommonIssue, Session, SessionRating
from services.auth_service import require_auth
import uuid

bp = Blueprint('analyses', __name__, url_prefix='/api/sessions')

@bp.route('/<uuid:id>/analyses', methods=['GET', 'OPTIONS'])
@require_auth
def get_analyses(id):
    analyses = QuestionAnalysis.query.filter_by(session_id=str(id)).all()
    return jsonify([a.to_dict() for a in analyses])

@bp.route('/<uuid:id>/common-issues', methods=['GET', 'OPTIONS'])
@require_auth
def get_common_issues(id):
    issues = CommonIssue.query.filter_by(session_id=str(id)).order_by(CommonIssue.display_order).all()
    return jsonify([i.to_dict() for i in issues])

@bp.route('/common-issues/<uuid:issue_id>', methods=['PATCH', 'OPTIONS'])
@require_auth
def update_common_issue(issue_id):
    """Update a common issue's status (e.g., acknowledge it)."""
    if request.method == 'OPTIONS':
        return '', 204

    issue = CommonIssue.query.get(str(issue_id))
    if not issue:
        return jsonify({'error': 'Common issue not found'}), 404

    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    # Only allow updating status field
    if 'status' in data:
        allowed_statuses = ['pending', 'acknowledged']
        if data['status'] not in allowed_statuses:
            return jsonify({'error': f'Invalid status. Must be one of: {allowed_statuses}'}), 400
        issue.status = data['status']

    db.session.commit()
    return jsonify(issue.to_dict())

@bp.route('/<uuid:id>/ratings', methods=['GET', 'OPTIONS'])
@require_auth
def get_ratings(id):
    rating = SessionRating.query.filter_by(session_id=str(id)).first()
    if not rating:
        return jsonify({})
    return jsonify(rating.to_dict())
