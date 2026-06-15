"""
Analysis orchestrator service for InsightPulse.
Provides generator-based analysis with progress yields for SSE streaming.
"""
import os
import json
import uuid
import hashlib
import logging
from datetime import datetime, timedelta
from typing import Generator, Dict, Any, List, Optional
from sqlalchemy import text
from models.database import db, Session, AnalysisCache
from services.google_sheets_service import fetch_survey_responses
from services.openai_service import analyze_question, generate_common_issues_table
import sentry_sdk

logger = logging.getLogger('insightpulse.analysis_orchestrator')

# Progress step definitions
PROGRESS_STEPS = {
    'fetching_sheets': {'min': 5, 'max': 10, 'message': 'Connecting to Google Sheets...'},
    'processing_data': {'min': 10, 'max': 15, 'message': 'Processing {n} responses...'},
    'analyzing_question': {'min': 15, 'max': 75, 'message': 'Analyzing: {question_name} ({current}/{total})'},
    'generating_issues': {'min': 75, 'max': 90, 'message': 'Identifying common themes...'},
    'saving_results': {'min': 90, 'max': 95, 'message': 'Saving analysis results...'},
    'complete': {'min': 100, 'max': 100, 'message': 'Analysis complete!'},
}


def emit_progress(step: str, progress: int, message: str = None,
                  current: int = None, total: int = None, **extra) -> Dict[str, Any]:
    """Create a progress event dictionary."""
    event = {
        'step': step,
        'progress': progress,
        'message': message or PROGRESS_STEPS.get(step, {}).get('message', step),
    }
    if current is not None:
        event['current'] = current
    if total is not None:
        event['total'] = total
    event.update(extra)
    return event


def emit_error(error_message: str, code: str = 'ANALYSIS_ERROR') -> Dict[str, Any]:
    """Create an error event dictionary."""
    return {
        'error': error_message,
        'code': code,
    }


def compute_input_hash(responses: List[Dict]) -> str:
    """
    Compute a hash of the input data for caching purposes.
    Excludes non-deterministic fields like fetch timestamps.
    """
    # Sort and normalize the data
    normalized = []
    for r in responses:
        # Include only the fields that affect analysis
        normalized.append({
            'session_id': r.get('session_id', ''),
            'learned': r.get('learned', ''),
            'apply': r.get('apply', ''),
            'need_to_learn': r.get('need_to_learn', ''),
            'comments': r.get('comments', ''),
        })

    # Sort by session_id for consistency
    normalized.sort(key=lambda x: x.get('session_id', ''))

    # Create hash
    data_str = json.dumps(normalized, sort_keys=True)
    return hashlib.sha256(data_str.encode()).hexdigest()


def check_cache(session_id: str, input_hash: str) -> Optional[AnalysisCache]:
    """Check if a valid cache entry exists for this session and input hash."""
    try:
        cache = AnalysisCache.query.filter_by(
            session_id=session_id,
            input_hash=input_hash
        ).first()

        if cache and cache.expires_at > datetime.utcnow():
            logger.info(f"Cache hit for session {session_id}")
            return cache

        if cache:
            # Cache expired, delete it in a separate transaction
            try:
                db.session.delete(cache)
                db.session.commit()
                logger.info(f"Cache expired for session {session_id}")
            except Exception as e:
                logger.warning(f"Failed to delete expired cache: {e}")
                db.session.remove()  # Use remove() for clean state
                # Continue anyway - not critical

        return None
    except Exception as e:
        logger.warning(f"Cache check failed: {e}")
        db.session.remove()  # Use remove() for clean state
        return None


def create_cache_entry(session_id: str, input_hash: str) -> Optional[AnalysisCache]:
    """Create a new cache entry after successful analysis."""
    try:
        ttl_days = int(os.environ.get('ANALYSIS_CACHE_TTL_DAYS', 7))
        expires_at = datetime.utcnow() + timedelta(days=ttl_days)

        cache = AnalysisCache(
            session_id=session_id,
            input_hash=input_hash,
            expires_at=expires_at
        )
        db.session.add(cache)
        # Don't commit here - let the main transaction handle it
        db.session.flush()
        logger.info(f"Created cache entry for session {session_id}, expires {expires_at}")
        return cache
    except Exception as e:
        logger.warning(f"Failed to create cache entry: {e}")
        # Don't rollback here - the main transaction will handle it
        return None


def run_analysis_with_progress(session: Session, force: bool = False) -> Generator[Dict[str, Any], None, None]:
    """
    Run AI analysis on a session with progress events.

    Yields progress events that can be streamed via SSE.

    Args:
        session: The Session object to analyze
        force: If True, bypass cache and run fresh analysis

    Yields:
        Progress event dictionaries with step, progress, message
    """
    # Ensure we start with a clean transaction state
    try:
        db.session.rollback()
    except Exception:
        pass  # Ignore if no transaction to rollback

    # IMPORTANT: Capture session identifiers as local variables BEFORE any DB operations
    # This prevents ORM lazy loading issues after transaction rollbacks
    session_pk = session.id
    session_sid = session.session_id
    logger.info(f"Starting analysis for session pk={session_pk}, session_id={session_sid}")

    try:
        # Step 1: Fetch from Google Sheets
        yield emit_progress('fetching_sheets', 5, 'Connecting to Google Sheets...')

        spreadsheet_id = os.environ.get('GOOGLE_SHEETS_SPREADSHEET_ID')
        if not spreadsheet_id:
            yield emit_error('Google Sheets spreadsheet ID not configured', 'CONFIG_ERROR')
            return

        try:
            all_responses = fetch_survey_responses(spreadsheet_id)
        except Exception as e:
            logger.error(f"Failed to fetch from Google Sheets: {e}")
            sentry_sdk.capture_exception(e)
            yield emit_error(f'Failed to connect to Google Sheets: {str(e)}', 'SHEETS_ERROR')
            return

        yield emit_progress('fetching_sheets', 10, 'Fetching survey responses...')

        # Filter responses for this session
        session_responses = [r for r in all_responses if r['session_id'] == session_sid]

        if not session_responses:
            yield emit_error('No responses found for this session in Google Sheets', 'NO_DATA_ERROR')
            return

        # Step 2: Process data
        yield emit_progress('processing_data', 12,
                           f'Processing {len(session_responses)} responses...',
                           n=len(session_responses))

        # Check cache (unless force=True)
        input_hash = compute_input_hash(session_responses)

        if not force:
            cache = check_cache(str(session_pk), input_hash)
            if cache:
                yield emit_progress('complete', 100, 'Analysis complete! (cached result)',
                                   cached=True, cached_at=cache.created_at.isoformat())
                return

        yield emit_progress('processing_data', 15, 'Preparing questions for analysis...')

        # Close session to ensure clean transaction state before analysis operations
        try:
            db.session.remove()
        except Exception as e:
            logger.warning(f"Failed to close session before analysis operations: {e}")

        # Define questions to analyze
        questions = [
            ('learned', 'What did you learn in this session?',
             [r['learned'] for r in session_responses if r.get('learned')]),
            ('apply', 'How can you apply what you learned?',
             [r['apply'] for r in session_responses if r.get('apply')]),
            ('need_to_learn', 'What more do you need to learn or practice?',
             [r['need_to_learn'] for r in session_responses if r.get('need_to_learn')]),
            ('comments', 'Additional comments or suggestions?',
             [r['comments'] for r in session_responses if r.get('comments')]),
        ]

        # Filter out questions with no responses
        questions_with_data = [(label, text, responses) for label, text, responses in questions if responses]
        total_questions = len(questions_with_data)

        if total_questions == 0:
            yield emit_error('No open-ended responses found to analyze', 'NO_DATA_ERROR')
            return

        # Clear old analyses using raw SQL with fresh connection
        try:
            with db.engine.connect() as conn:
                conn.execute(
                    text("DELETE FROM question_analyses WHERE session_id = :session_id"),
                    {'session_id': str(session_pk)}
                )
                conn.execute(
                    text("DELETE FROM common_issues WHERE session_id = :session_id"),
                    {'session_id': str(session_pk)}
                )
                conn.commit()
            logger.info(f"Cleared old analyses for session {session_pk}")
        except Exception as e:
            logger.error(f"Failed to clear old analyses: {e}")
            sentry_sdk.capture_exception(e)
            yield emit_error(f'Database error: {str(e)}', 'DB_ERROR')
            return

        # Step 3: Analyze each question
        analysis_results = []
        progress_per_question = 60 // total_questions  # Distribute 60% across questions

        for idx, (label, question_text, responses) in enumerate(questions_with_data):
            current = idx + 1
            base_progress = 15 + (idx * progress_per_question)

            yield emit_progress('analyzing_question', base_progress,
                               f'Analyzing: {question_text}',
                               current=current, total=total_questions,
                               question_name=question_text)

            try:
                analysis_text = analyze_question(question_text, responses)
            except Exception as e:
                logger.error(f"OpenAI analysis failed for question '{label}': {e}")
                sentry_sdk.capture_exception(e)
                yield emit_error(f'AI analysis failed: {str(e)}', 'OPENAI_ERROR')
                return

            # Save the analysis using raw SQL with fresh connection
            try:
                with db.engine.connect() as conn:
                    conn.execute(
                        text("""
                            INSERT INTO question_analyses
                            (id, session_id, question_label, question_text, analysis_text, created_at)
                            VALUES (:id, :session_id, :question_label, :question_text, :analysis_text, :created_at)
                        """),
                        {
                            'id': str(uuid.uuid4()),
                            'session_id': str(session_pk),
                            'question_label': label,
                            'question_text': question_text,
                            'analysis_text': analysis_text,
                            'created_at': datetime.utcnow()
                        }
                    )
                    conn.commit()
                analysis_results.append(analysis_text)
                logger.info(f"Saved analysis for '{label}'")
            except Exception as e:
                logger.error(f"Failed to save analysis for '{label}': {e}")
                sentry_sdk.capture_exception(e)
                yield emit_error(f'Failed to save analysis: {str(e)}', 'DB_ERROR')
                return

            yield emit_progress('analyzing_question', base_progress + progress_per_question - 5,
                               f'Completed: {question_text}',
                               current=current, total=total_questions)

        # Step 4: Generate common issues
        yield emit_progress('generating_issues', 78, 'Identifying common themes...')

        # Close session to return connection to pool and ensure fresh state
        # This is more reliable than rollback for ensuring clean transaction state
        try:
            db.session.remove()
        except Exception as e:
            logger.warning(f"Failed to close session before common issues: {e}")

        if analysis_results:
            try:
                common_issues_text = generate_common_issues_table(analysis_results)
            except Exception as e:
                logger.error(f"OpenAI common issues generation failed: {e}")
                sentry_sdk.capture_exception(e)
                yield emit_error(f'Failed to generate common issues: {str(e)}', 'OPENAI_ERROR')
                return

            yield emit_progress('generating_issues', 85, 'Parsing common issues...')

            # Parse the markdown table and collect data
            lines = common_issues_text.strip().split('\n')
            common_issues_data = []
            display_idx = 1

            for line in lines:
                if '|' in line and '---' not in line:
                    parts = [p.strip() for p in line.split('|') if p.strip()]
                    if len(parts) >= 2:
                        # Skip header
                        if 'Common Issue' in parts[0] or 'Issue' == parts[0]:
                            continue
                        common_issues_data.append({
                            'common_issue': parts[0],
                            'evidence_signal': parts[1],
                            'display_order': display_idx
                        })
                        display_idx += 1

            # Use raw SQL with a fresh connection to avoid transaction state issues
            if common_issues_data:
                try:
                    # Get a fresh connection directly from the engine
                    with db.engine.connect() as conn:
                        for ci_data in common_issues_data:
                            conn.execute(
                                text("""
                                    INSERT INTO common_issues
                                    (id, session_id, common_issue, evidence_signal, display_order, created_at)
                                    VALUES (:id, :session_id, :common_issue, :evidence_signal, :display_order, :created_at)
                                """),
                                {
                                    'id': str(uuid.uuid4()),
                                    'session_id': str(session_pk),
                                    'common_issue': ci_data['common_issue'],
                                    'evidence_signal': ci_data['evidence_signal'],
                                    'display_order': ci_data['display_order'],
                                    'created_at': datetime.utcnow()
                                }
                            )
                        conn.commit()
                    logger.info(f"Saved {len(common_issues_data)} common issues using raw SQL")
                except Exception as e:
                    logger.error(f"Failed to save common issues: {e}")
                    sentry_sdk.capture_exception(e)
                    yield emit_error(f'Failed to save common issues: {str(e)}', 'DB_ERROR')
                    return

        # Step 5: Save results
        yield emit_progress('saving_results', 92, 'Saving analysis results...')

        try:
            # Use raw SQL with fresh connection to update session status
            with db.engine.connect() as conn:
                # Update session status
                conn.execute(
                    text("""
                        UPDATE sessions
                        SET status = :status, analyzed_at = :analyzed_at
                        WHERE id = :session_id
                    """),
                    {
                        'status': 'analyzed',
                        'analyzed_at': datetime.utcnow(),
                        'session_id': str(session_pk)
                    }
                )

                # Create cache entry (delete existing first, then insert)
                ttl_days = int(os.environ.get('ANALYSIS_CACHE_TTL_DAYS', 7))
                expires_at = datetime.utcnow() + timedelta(days=ttl_days)
                # Delete any existing cache entry for this session
                conn.execute(
                    text("DELETE FROM analysis_cache WHERE session_id = :session_id"),
                    {'session_id': str(session_pk)}
                )
                conn.execute(
                    text("""
                        INSERT INTO analysis_cache (id, session_id, input_hash, expires_at, created_at)
                        VALUES (:id, :session_id, :input_hash, :expires_at, :created_at)
                    """),
                    {
                        'id': str(uuid.uuid4()),
                        'session_id': str(session_pk),
                        'input_hash': input_hash,
                        'expires_at': expires_at,
                        'created_at': datetime.utcnow()
                    }
                )

                conn.commit()
            logger.info(f"Updated session {session_pk} status to 'analyzed'")
        except Exception as e:
            logger.error(f"Failed to commit analysis results: {e}")
            sentry_sdk.capture_exception(e)
            yield emit_error(f'Failed to save results: {str(e)}', 'DB_ERROR')
            return

        yield emit_progress('saving_results', 98, 'Finalizing...')

        # Complete
        yield emit_progress('complete', 100, 'Analysis complete!',
                           session_id=str(session_pk), status='completed')

    except Exception as e:
        logger.exception(f"Analysis orchestration failed: {e}")
        sentry_sdk.capture_exception(e)
        try:
            db.session.remove()
        except Exception:
            pass
        yield emit_error(f'Analysis failed: {str(e)}', 'UNKNOWN_ERROR')
