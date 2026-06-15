from flask import Blueprint, jsonify, request, g
from sqlalchemy import func, or_
from models.database import db, Session, ActionItem, SessionRating, User
from services.auth_service import require_auth

bp = Blueprint('dashboard', __name__, url_prefix='/api/dashboard')


def get_user_session_ids(user):
    """Get session IDs that a user owns (facilitator_name matches)."""
    sessions = Session.query.filter(Session.facilitator_name == user.name).all()
    return [str(s.id) for s in sessions]


@bp.route('/stats', methods=['GET', 'OPTIONS'])
@bp.route('/statistics', methods=['GET', 'OPTIONS'])
@require_auth
def get_dashboard_stats():
    # RBAC: Facilitators see only their own stats
    is_facilitator = g.user.role == 'facilitator'

    if is_facilitator:
        user_session_ids = get_user_session_ids(g.user)

        # Total sessions (own only)
        total_sessions = Session.query.filter(Session.facilitator_name == g.user.name).count()

        # Action Items counts (own sessions + assigned to them)
        open_items = ActionItem.query.filter(
            ActionItem.status == 'Open',
            or_(
                ActionItem.session_id.in_(user_session_ids),
                ActionItem.person_in_charge == g.user.name
            )
        ).count() if user_session_ids else ActionItem.query.filter(
            ActionItem.status == 'Open',
            ActionItem.person_in_charge == g.user.name
        ).count()

        in_progress_items = ActionItem.query.filter(
            ActionItem.status == 'In Progress',
            or_(
                ActionItem.session_id.in_(user_session_ids),
                ActionItem.person_in_charge == g.user.name
            )
        ).count() if user_session_ids else ActionItem.query.filter(
            ActionItem.status == 'In Progress',
            ActionItem.person_in_charge == g.user.name
        ).count()

        # Average Repeatability (own sessions only)
        avg_repeatability = db.session.query(func.avg(SessionRating.repeatability))\
            .join(Session, Session.id == SessionRating.session_id)\
            .filter(Session.facilitator_name == g.user.name)\
            .scalar()

        # Recent sessions (own only)
        recent_sessions = Session.query\
            .filter(Session.facilitator_name == g.user.name)\
            .order_by(Session.session_date.desc()).limit(5).all()
    else:
        # Admin/Viewer: see all stats
        total_sessions = Session.query.count()
        open_items = ActionItem.query.filter_by(status='Open').count()
        in_progress_items = ActionItem.query.filter_by(status='In Progress').count()
        avg_repeatability = db.session.query(func.avg(SessionRating.repeatability)).scalar()
        recent_sessions = Session.query.order_by(Session.session_date.desc()).limit(5).all()

    # Handle None
    avg_repeatability = float(avg_repeatability) if avg_repeatability else 0.0

    return jsonify({
        'total_sessions': total_sessions,
        'open_action_items': open_items,
        'in_progress_action_items': in_progress_items,
        'average_repeatability': round(avg_repeatability, 2),
        'recent_sessions': [s.to_dict() for s in recent_sessions],
        'scope': 'personal' if is_facilitator else 'global'
    })

@bp.route('/performance', methods=['GET', 'OPTIONS'])
@require_auth
def get_facilitator_performance():
    # RBAC: Facilitators see only their own performance
    base_query = db.session.query(
        func.trim(Session.facilitator_name).label('facilitator_name'),
        func.avg(SessionRating.facilitator_understanding).label('avg_understanding'),
        func.avg(SessionRating.qa_support).label('avg_qa'),
        func.avg(SessionRating.problem_articulation).label('avg_articulation'),
        func.avg(SessionRating.overall_quality).label('avg_overall'),
        func.count(Session.id).label('session_count'),
        func.sum(Session.num_responses).label('total_responses')
    ).join(SessionRating, Session.id == SessionRating.session_id)

    if g.user.role == 'facilitator':
        base_query = base_query.filter(Session.facilitator_name == g.user.name)

    # Trim names to avoid grouping issues with extra spaces from sheets
    results = base_query.group_by(func.trim(Session.facilitator_name)).all()

    performance_data = []
    for r in results:
        performance_data.append({
            'facilitator_name': r.facilitator_name,
            'avg_understanding': float(r.avg_understanding) if r.avg_understanding else 0.0,
            'avg_qa': float(r.avg_qa) if r.avg_qa else 0.0,
            'avg_articulation': float(r.avg_articulation) if r.avg_articulation else 0.0,
            'avg_overall': float(r.avg_overall) if r.avg_overall else 0.0,
            'session_count': r.session_count,
            'total_responses': int(r.total_responses) if r.total_responses else 0
        })

    return jsonify(performance_data)

METRIC_FIELDS = [
    'facilitator_understanding', 'learning_mechanics', 'qa_support',
    'problem_articulation', 'session_pace', 'tools_helpfulness',
    'repeatability', 'learning_objectives', 'overall_quality'
]


@bp.route('/comparison', methods=['GET', 'OPTIONS'])
@require_auth
def get_comparison():
    """Compare multiple facilitators across all 9 metrics."""
    facilitator_param = request.args.get('facilitators', '').strip()

    is_facilitator = g.user.role == 'facilitator'

    # Build list of aggregation columns for all 9 metrics
    agg_columns = [
        func.trim(Session.facilitator_name).label('facilitator_name'),
        func.count(Session.id).label('session_count'),
    ]
    for field in METRIC_FIELDS:
        agg_columns.append(func.avg(getattr(SessionRating, field)).label(f'avg_{field}'))

    # Always include global average
    global_query = db.session.query(*agg_columns)\
        .join(SessionRating, Session.id == SessionRating.session_id)

    # Compute global average (all facilitators combined)
    global_agg = [func.count(Session.id).label('session_count')]
    for field in METRIC_FIELDS:
        global_agg.append(func.avg(getattr(SessionRating, field)).label(f'avg_{field}'))
    global_row = db.session.query(*global_agg)\
        .join(SessionRating, Session.id == SessionRating.session_id)\
        .one()

    global_entry = {
        'facilitator_name': 'Global Average',
        'metrics': {},
        'session_count': global_row.session_count or 0
    }
    for field in METRIC_FIELDS:
        val = getattr(global_row, f'avg_{field}')
        global_entry['metrics'][field] = round(float(val), 2) if val else 0.0

    if is_facilitator:
        # Facilitator: own data + global average only
        own_query = db.session.query(*agg_columns)\
            .join(SessionRating, Session.id == SessionRating.session_id)\
            .filter(Session.facilitator_name == g.user.name)\
            .group_by(func.trim(Session.facilitator_name))
        results = own_query.all()
    else:
        # Admin/Viewer: return requested facilitators
        base_query = global_query.group_by(func.trim(Session.facilitator_name))
        if facilitator_param:
            names = [n.strip() for n in facilitator_param.split(',') if n.strip()]
            base_query = base_query.filter(func.trim(Session.facilitator_name).in_(names))
        results = base_query.all()

    comparison = []
    for r in results:
        entry = {
            'facilitator_name': r.facilitator_name,
            'metrics': {},
            'session_count': r.session_count
        }
        for field in METRIC_FIELDS:
            val = getattr(r, f'avg_{field}')
            entry['metrics'][field] = round(float(val), 2) if val else 0.0
        comparison.append(entry)

    comparison.append(global_entry)
    return jsonify(comparison)


@bp.route('/benchmarks', methods=['GET', 'OPTIONS'])
@require_auth
def get_benchmarks():
    """Compare a session's ratings against facilitator and global averages."""
    session_id = request.args.get('session_id', '').strip()
    if not session_id:
        return jsonify({'error': 'session_id is required'}), 400

    session = Session.query.get(session_id)
    if not session:
        return jsonify({'error': 'Session not found'}), 404

    # RBAC: Facilitators can only benchmark their own sessions
    if g.user.role == 'facilitator' and session.facilitator_name != g.user.name:
        return jsonify({'error': 'Access denied'}), 403

    rating = SessionRating.query.filter_by(session_id=session_id).first()
    if not rating:
        return jsonify({'error': 'No ratings found for this session'}), 404

    # Session metrics
    session_metrics = {}
    for field in METRIC_FIELDS:
        val = getattr(rating, field)
        session_metrics[field] = float(val) if val else 0.0

    # Facilitator average
    fac_agg = []
    for field in METRIC_FIELDS:
        fac_agg.append(func.avg(getattr(SessionRating, field)).label(f'avg_{field}'))
    fac_row = db.session.query(*fac_agg)\
        .join(Session, Session.id == SessionRating.session_id)\
        .filter(func.trim(Session.facilitator_name) == session.facilitator_name)\
        .one()

    facilitator_avg = {}
    for field in METRIC_FIELDS:
        val = getattr(fac_row, f'avg_{field}')
        facilitator_avg[field] = round(float(val), 2) if val else 0.0

    # Global average
    global_agg = []
    for field in METRIC_FIELDS:
        global_agg.append(func.avg(getattr(SessionRating, field)).label(f'avg_{field}'))
    global_row = db.session.query(*global_agg)\
        .join(Session, Session.id == SessionRating.session_id)\
        .one()

    global_avg = {}
    for field in METRIC_FIELDS:
        val = getattr(global_row, f'avg_{field}')
        global_avg[field] = round(float(val), 2) if val else 0.0

    return jsonify({
        'session': session_metrics,
        'facilitator_avg': facilitator_avg,
        'global_avg': global_avg,
        'facilitator_name': session.facilitator_name,
        'session_name': session.session_name or session.session_id
    })


@bp.route('/facilitator-history', methods=['GET', 'OPTIONS'])
@require_auth
def get_facilitator_history():
    """Get chronological session history for a specific facilitator."""
    facilitator_name = request.args.get('name', '').strip()

    if not facilitator_name:
        return jsonify({'error': 'Facilitator name is required'}), 400

    # RBAC: Facilitators can only view their own history
    if g.user.role == 'facilitator' and facilitator_name != g.user.name:
        return jsonify({'error': 'Access denied - you can only view your own history'}), 403

    # Query sessions with ratings for this facilitator, ordered by date
    results = db.session.query(Session, SessionRating)\
        .join(SessionRating, Session.id == SessionRating.session_id)\
        .filter(func.trim(Session.facilitator_name) == facilitator_name)\
        .order_by(Session.session_date.asc())\
        .all()

    history = []
    for session, rating in results:
        history.append({
            'session_id': session.session_id,
            'session_name': session.session_name,
            'date': session.session_date.isoformat() if session.session_date else None,
            'num_responses': session.num_responses,
            'facilitator_understanding': float(rating.facilitator_understanding) if rating.facilitator_understanding else None,
            'learning_mechanics': float(rating.learning_mechanics) if rating.learning_mechanics else None,
            'qa_support': float(rating.qa_support) if rating.qa_support else None,
            'problem_articulation': float(rating.problem_articulation) if rating.problem_articulation else None,
            'session_pace': float(rating.session_pace) if rating.session_pace else None,
            'tools_helpfulness': float(rating.tools_helpfulness) if rating.tools_helpfulness else None,
            'repeatability': float(rating.repeatability) if rating.repeatability else None,
            'learning_objectives': float(rating.learning_objectives) if rating.learning_objectives else None,
            'overall_quality': float(rating.overall_quality) if rating.overall_quality else None,
        })

    return jsonify(history)
