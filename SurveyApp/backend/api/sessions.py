from flask import Blueprint, jsonify, request, g, Response, current_app
import os
import json
import logging
from datetime import datetime
from models.database import db, Session, QuestionAnalysis, CommonIssue, SessionRating
from services.auth_service import require_auth, require_role, can_access_session, is_session_owner
from services.google_sheets_service import fetch_survey_responses
from services.openai_service import analyze_question, generate_common_issues_table
from services.analysis_orchestrator import run_analysis_with_progress
from services.export_service import generate_pdf_report, generate_excel_report
from schemas import SessionUpdateSchema
from utils.validators import validate_google_sheets_id, get_friendly_sheets_error
from marshmallow import ValidationError

logger = logging.getLogger('insightpulse.api.sessions')
bp = Blueprint('sessions', __name__, url_prefix='/api/sessions')

@bp.route('', methods=['GET', 'OPTIONS'])
@require_auth
def list_sessions():
    # RBAC: Facilitators can only see their own sessions
    if g.user.role == 'facilitator':
        sessions = Session.query.filter(
            Session.facilitator_name == g.user.name
        ).order_by(Session.session_date.desc()).all()
    else:
        # Admin and Viewer can see all sessions
        sessions = Session.query.order_by(Session.session_date.desc()).all()
    return jsonify([s.to_dict() for s in sessions])

@bp.route('/<uuid:id>', methods=['GET', 'PATCH', 'OPTIONS'])
@require_auth
def session_detail(id):
    session = Session.query.get(str(id))
    if not session:
        return jsonify({'error': 'Session not found'}), 404

    # RBAC: Check if user can access this session
    if not can_access_session(g.user, session):
        return jsonify({'error': 'Access denied - You do not have access to this session'}), 403

    if request.method == 'PATCH':
        # Only admins can update
        if g.user.role != 'admin':
            return jsonify({'error': 'Admin access required'}), 403

        data = request.get_json() or {}

        # Validate input using schema
        schema = SessionUpdateSchema()
        try:
            validated_data = schema.load(data)
        except ValidationError as err:
            logger.info(f"Session update validation failed: {err.messages}")
            return jsonify({'error': 'Validation failed', 'details': err.messages}), 400

        # Apply validated updates
        if 'session_name' in validated_data:
            session.session_name = validated_data['session_name']
        if 'facilitator_name' in validated_data:
            session.facilitator_name = validated_data['facilitator_name']
        if 'status' in validated_data:
            session.status = validated_data['status']

        db.session.commit()
        logger.info(f"Session {id} updated by user {g.user.id}")

    return jsonify(session.to_dict())

def parse_session_date(date_str):
    if not date_str:
        return datetime.now().date()
    for fmt in ('%Y-%m-%d', '%m/%d/%Y', '%d/%m/%Y'):
        try:
            return datetime.strptime(date_str, fmt).date()
        except ValueError:
            continue
    # If all fail, return today or raise? Let's return today to avoid crashing, or maybe raise to alert format issues.
    # For robust MVP, defaulting to today or the string itself might fail DB constraint if it's not a date object.
    # Let's default to today and log needed?
    print(f"Warning: Could not parse date '{date_str}', defaulting to today.")
    return datetime.now().date()

@bp.route('/import', methods=['POST', 'OPTIONS'])
@require_auth
@require_role('admin')
def import_surveys():
    """
    Imports fresh data from Google Sheets.
    Creates new sessions or updates existing ones.
    """
    try:
        spreadsheet_id = os.environ.get('GOOGLE_SHEETS_SPREADSHEET_ID')
        logger.info(f"Starting import with spreadsheet_id: {spreadsheet_id}")

        if not spreadsheet_id:
            logger.error("GOOGLE_SHEETS_SPREADSHEET_ID not configured")
            return jsonify({'error': 'Google Sheets spreadsheet ID not configured. Please set GOOGLE_SHEETS_SPREADSHEET_ID in environment variables.'}), 500

        # Validate spreadsheet ID format
        is_valid, error_msg = validate_google_sheets_id(spreadsheet_id)
        if not is_valid:
            logger.warning(f"Invalid spreadsheet ID format: {spreadsheet_id}")
            return jsonify({'error': error_msg}), 400

        try:
            responses = fetch_survey_responses(spreadsheet_id)
        except Exception as sheets_error:
            error_msg = get_friendly_sheets_error(str(sheets_error))
            logger.error(f"Google Sheets fetch failed: {sheets_error}")
            return jsonify({'error': error_msg}), 500

        logger.info(f"Fetched {len(responses)} total responses from Google Sheets")
        
        imported_count = 0
        
        # Group responses by session_id
        session_groups = {}
        for r in responses:
            sid = r['session_id']
            if not sid: continue
            if sid not in session_groups:
                session_groups[sid] = []
            session_groups[sid].append(r)

        logger.info(f"Found {len(session_groups)} unique session groups")

        # Process each session group
        for sid, group_responses in session_groups.items():
            logger.debug(f"Processing session_id '{sid}' with {len(group_responses)} responses")
            # Check if session exists
            session = Session.query.filter_by(session_id=sid).first()
            
            # Simple logic: Update if response count changed or create new
            # For MVP we just basic upsert logic
            first_response = group_responses[0]
            
            if not session:
                logger.debug(f"Creating new session for '{sid}'")
                session = Session(
                    session_id=sid,
                    session_name=f"Session {sid}", # Placeholder name
                    session_date=parse_session_date(first_response['session_date']),
                    facilitator_name=first_response['facilitator_name'],
                    num_responses=len(group_responses),
                    status='pending',
                    created_by=g.user.id
                )
                db.session.add(session)
                imported_count += 1
            else:
                logger.debug(f"Session '{sid}' already exists, updating response count")
                session.num_responses = len(group_responses)
                # potentially update ratings here too
            
            # Calculate and update ratings (naive average)
            # We should wipe old ratings and re-calc
            # Or just calc avg
            
            def safe_float(val):
                try: 
                    return float(val) 
                except: 
                    return None
            
            # Aggregation
            sums = {k: 0.0 for k in [
                'facilitator_understanding', 'learning_mechanics', 'qa_support', 
                'problem_articulation', 'session_pace', 'tools_helpfulness', 
                'repeatability', 'learning_objectives', 'overall_quality'
            ]}
            counts = {k: 0 for k in sums.keys()}
            
            for r in group_responses:
                for k in sums.keys():
                    val = safe_float(r.get(k))
                    if val is not None:
                        sums[k] += val
                        counts[k] += 1
            
            averages = {k: (sums[k] / counts[k] if counts[k] > 0 else 0) for k in sums.keys()}
            
            # Update ratings
            if session.ratings:
                for k, v in averages.items():
                    setattr(session.ratings, k, v)
            else:
                rating_obj = SessionRating(session=session, **averages)
                db.session.add(rating_obj)
        
        db.session.commit()

        logger.info(f"Import complete. Processed {len(session_groups)} sessions, created {imported_count} new")
        return jsonify({'message': f'Processed {len(session_groups)} sessions', 'imported_new': imported_count})

    except Exception as e:
        logger.exception(f"Import failed: {str(e)}")
        return jsonify({'error': str(e)}), 500

@bp.route('/<uuid:id>/analyze/stream', methods=['GET', 'OPTIONS'])
@require_auth
def run_analysis_stream(id):
    """
    Streams AI analysis progress via Server-Sent Events (SSE).
    Returns real-time progress updates during analysis.
    """
    session = Session.query.get(str(id))
    if not session:
        return jsonify({'error': 'Session not found'}), 404

    # RBAC: Admin can analyze any, Facilitator can analyze own sessions only
    if not is_session_owner(g.user, session):
        return jsonify({'error': 'Access denied - You can only analyze your own sessions'}), 403

    # Check if force refresh is requested
    force = request.args.get('force', 'false').lower() == 'true'

    # Capture the app context for use in the generator
    app = current_app._get_current_object()

    def generate():
        """Generator function for SSE streaming."""
        # Run inside app context so database operations work
        with app.app_context():
            try:
                # Re-fetch session inside the new context
                session_obj = Session.query.get(str(id))
                if not session_obj:
                    error_event = json.dumps({'error': 'Session not found', 'code': 'NOT_FOUND'})
                    yield f"data: {error_event}\n\n"
                    return

                for event in run_analysis_with_progress(session_obj, force=force):
                    # Format as SSE
                    data = json.dumps(event)
                    yield f"data: {data}\n\n"

                    # If there's an error, stop streaming
                    if 'error' in event:
                        break

            except Exception as e:
                logger.exception(f"SSE streaming error: {e}")
                error_event = json.dumps({'error': str(e), 'code': 'STREAM_ERROR'})
                yield f"data: {error_event}\n\n"

    return Response(
        generate(),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no',  # Disable nginx buffering
        }
    )


@bp.route('/<uuid:id>/analyze', methods=['POST', 'OPTIONS'])
@require_auth
def run_analysis(id):
    """
    Triggers the AI analysis.
    NOTE: Detailed flow implies Step 1 (4 questions) then Step 2 (Common Issues).
    """
    session = Session.query.get(str(id))
    if not session:
        return jsonify({'error': 'Session not found'}), 404

    # RBAC: Admin can analyze any, Facilitator can analyze own sessions only
    if not is_session_owner(g.user, session):
        return jsonify({'error': 'Access denied - You can only analyze your own sessions'}), 403
        
    # We need the raw responses for this session to send to OpenAI.
    # Since we don't store raw responses in DB (per schema), we must fetch from Sheets again
    # OR we should have stored them.
    # The requirement says "App fetches latest responses from Google Sheets via API".
    # So we fetch all, filter by session_id.
    
    try:
        spreadsheet_id = os.environ.get('GOOGLE_SHEETS_SPREADSHEET_ID')
        all_responses = fetch_survey_responses(spreadsheet_id)
        session_responses = [r for r in all_responses if r['session_id'] == session.session_id]
        
        if not session_responses:
            return jsonify({'error': 'No responses found for this session in Google Sheets'}), 400
            
        # Step 1: Analyze 4 questions
        questions = [
            ("What did you learn in this session?", [r['learned'] for r in session_responses if r['learned']]),
            ("How can you apply what you learned?", [r['apply'] for r in session_responses if r['apply']]),
            ("What more do you need to learn or practice?", [r['need_to_learn'] for r in session_responses if r['need_to_learn']]),
            ("Additional comments or suggestions?", [r['comments'] for r in session_responses if r['comments']])
        ]
        
        # Clear old analyses
        QuestionAnalysis.query.filter_by(session_id=session.id).delete()
        CommonIssue.query.filter_by(session_id=session.id).delete()
        
        analysis_results = []
        
        for q_label, responses in questions:
            if not responses: 
                continue
            
            # Analyze
            analysis_text = analyze_question(q_label, responses)
            
            # Save
            qa = QuestionAnalysis(
                session_id=session.id,
                question_label=q_label,
                question_text=q_label,
                analysis_text=analysis_text
            )
            db.session.add(qa)
            analysis_results.append(analysis_text)
            
        # Step 2: Common Issues
        if analysis_results:
            common_issues_text = generate_common_issues_table(analysis_results)
            
            # Parse the table? The requirement says "Create a common issue table...".
            # The AI returns text. We store it?
            # Schema says: `common_issue` and `evidence_signal` columns.
            # So we need to PARSE the AI output into rows.
            # The prompt asks for a table. "Format as a table with...".
            # We might need structured output or post-processing.
            # For MVP, let's try to parse the markdown table or just store the text if schema allowed text.
            # Schema: `common_issues` table has `common_issue` (text) and `evidence_signal` (text).
            # So we MUST parse.
            
            # Simple parsing of markdown table
            # Assuming AI follows instructions and outputs | Col 1 | Col 2 |
            
            lines = common_issues_text.strip().split('\n')
            display_idx = 1
            for line in lines:
                if '|' in line and '---' not in line:
                    parts = [p.strip() for p in line.split('|') if p.strip()]
                    if len(parts) >= 2:
                        # Skip header if it matches "Common Issue"
                        if "Common Issue" in parts[0]: 
                            continue
                            
                        issue = parts[0]
                        signal = parts[1]
                        
                        ci = CommonIssue(
                            session_id=session.id,
                            common_issue=issue,
                            evidence_signal=signal,
                            display_order=display_idx
                        )
                        db.session.add(ci)
                        display_idx += 1
        
        session.status = "analyzed"
        session.analyzed_at = datetime.utcnow()  # Record when analysis was completed
        db.session.commit()
        
        return jsonify({'message': 'Analysis complete'})

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/<uuid:id>/export/pdf', methods=['GET', 'OPTIONS'])
@require_auth
def export_pdf(id):
    """
    Export session analysis as PDF report.
    Returns a downloadable PDF file.
    """
    session = Session.query.get(str(id))
    if not session:
        return jsonify({'error': 'Session not found'}), 404

    # RBAC: Check if user can access this session
    if not can_access_session(g.user, session):
        return jsonify({'error': 'Access denied - You do not have access to this session'}), 403

    # Check if session has been analyzed
    if session.status != 'analyzed':
        return jsonify({'error': 'Session has not been analyzed yet. Please run analysis first.'}), 400

    try:
        pdf_bytes = generate_pdf_report(session)

        # Use session name for filename, fallback to session_id
        logger.debug(f"Session name: '{session.session_name}', Session ID: '{session.session_id}'")
        safe_name = (session.session_name or session.session_id or 'report')
        # Sanitize filename: remove/replace invalid characters
        safe_name = "".join(c if c.isalnum() or c in (' ', '-', '_') else '_' for c in safe_name)
        safe_name = safe_name.strip().replace(' ', '_')[:50]  # Limit length
        filename = f"{safe_name}_report.pdf"
        logger.info(f"Generated PDF export for session {id}, filename: {filename}")

        return Response(
            pdf_bytes,
            mimetype='application/pdf',
            headers={
                'Content-Disposition': f'attachment; filename="{filename}"',
                'Content-Length': str(len(pdf_bytes))
            }
        )

    except Exception as e:
        logger.exception(f"PDF export failed for session {id}: {e}")
        return jsonify({'error': f'Failed to generate PDF: {str(e)}'}), 500


@bp.route('/<uuid:id>/export/excel', methods=['GET', 'OPTIONS'])
@require_auth
def export_excel(id):
    """
    Export session analysis as Excel spreadsheet.
    Returns a downloadable XLSX file.
    """
    session = Session.query.get(str(id))
    if not session:
        return jsonify({'error': 'Session not found'}), 404

    # RBAC: Check if user can access this session
    if not can_access_session(g.user, session):
        return jsonify({'error': 'Access denied - You do not have access to this session'}), 403

    # Check if session has been analyzed
    if session.status != 'analyzed':
        return jsonify({'error': 'Session has not been analyzed yet. Please run analysis first.'}), 400

    try:
        excel_bytes = generate_excel_report(session)

        # Use session name for filename, fallback to session_id
        logger.debug(f"Session name: '{session.session_name}', Session ID: '{session.session_id}'")
        safe_name = (session.session_name or session.session_id or 'report')
        # Sanitize filename: remove/replace invalid characters
        safe_name = "".join(c if c.isalnum() or c in (' ', '-', '_') else '_' for c in safe_name)
        safe_name = safe_name.strip().replace(' ', '_')[:50]  # Limit length
        filename = f"{safe_name}_report.xlsx"
        logger.info(f"Generated Excel export for session {id}, filename: {filename}")

        return Response(
            excel_bytes,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            headers={
                'Content-Disposition': f'attachment; filename="{filename}"',
                'Content-Length': str(len(excel_bytes))
            }
        )

    except Exception as e:
        logger.exception(f"Excel export failed for session {id}: {e}")
        return jsonify({'error': f'Failed to generate Excel: {str(e)}'}), 500


@bp.route('/<uuid:id>', methods=['DELETE', 'OPTIONS'])
@require_auth
@require_role('admin')
def delete_session(id):
    """
    Delete a session and all related data.
    Admin only.
    """
    session = Session.query.get(str(id))
    if not session:
        return jsonify({'error': 'Session not found'}), 404

    try:
        session_id = session.session_id
        db.session.delete(session)
        db.session.commit()

        logger.info(f"Session {id} ({session_id}) deleted by user {g.user.id}")
        return jsonify({'message': f'Session {session_id} deleted successfully'})

    except Exception as e:
        db.session.rollback()
        logger.exception(f"Failed to delete session {id}: {e}")
        return jsonify({'error': f'Failed to delete session: {str(e)}'}), 500
