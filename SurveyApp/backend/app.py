# InsightPulse Backend Application
from flask import Flask, g
from flask_cors import CORS
from flask_migrate import Migrate
import os
from dotenv import load_dotenv
import sentry_sdk
from sentry_sdk.integrations.flask import FlaskIntegration

# Load environment variables
load_dotenv()


def init_sentry(app):
    """Initialize Sentry for error tracking."""
    sentry_dsn = os.environ.get('SENTRY_DSN')
    if sentry_dsn:
        sentry_sdk.init(
            dsn=sentry_dsn,
            integrations=[FlaskIntegration()],
            environment=os.environ.get('FLASK_ENV', 'development'),
            traces_sample_rate=0.1,  # 10% of transactions for performance monitoring
            send_default_pii=False,  # Don't send personally identifiable information
        )
        app.logger.info("Sentry initialized successfully")


def init_rate_limiter(app):
    """Initialize Flask-Limiter for rate limiting."""
    from flask_limiter import Limiter
    from flask_limiter.util import get_remote_address

    def get_user_identifier():
        """Get user ID if authenticated, otherwise use IP address."""
        if hasattr(g, 'user') and g.user:
            return f"user:{g.user.id}"
        return get_remote_address()

    limiter = Limiter(
        app=app,
        key_func=get_user_identifier,
        default_limits=["200 per day", "50 per hour"],
        storage_uri="memory://",
    )

    # Store limiter on app for use in blueprints
    app.limiter = limiter

    return limiter


def create_app(test_config=None):
    app = Flask(__name__)

    # Initialize Sentry (before anything else, unless testing)
    if not test_config:
        init_sentry(app)

    # Configure CORS
    dev_origins = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174"
    ]
    frontend_url = os.environ.get('FRONTEND_URL')
    if frontend_url:
        dev_origins.append(frontend_url)

    CORS(app, resources={r"/*": {"origins": dev_origins}}, supports_credentials=True)

    # Configuration
    if test_config:
        app.config.from_mapping(
            SECRET_KEY=os.environ.get('FLASK_SECRET_KEY', 'dev'),
            SQLALCHEMY_TRACK_MODIFICATIONS=False,
            RATELIMIT_ENABLED=False,  # Disable rate limiting in tests
        )
        app.config.update(test_config)
    else:
        app.config.from_mapping(
            SECRET_KEY=os.environ.get('FLASK_SECRET_KEY', 'dev'),
            SQLALCHEMY_DATABASE_URI=os.environ.get('DATABASE_URL'),
            SQLALCHEMY_TRACK_MODIFICATIONS=False,
        )

    # Initialize rate limiter (after config)
    if not test_config or test_config.get('RATELIMIT_ENABLED') is not False:
        init_rate_limiter(app)

    from models.database import db
    db.init_app(app)

    # Only use migrations in non-test mode
    if not test_config:
        Migrate(app, db)

    # Request hooks for logging and Sentry context
    @app.before_request
    def before_request():
        """Set up request context for logging and error tracking."""
        import uuid
        g.correlation_id = str(uuid.uuid4())[:8]

        # Add user context to Sentry if authenticated
        if hasattr(g, 'user') and g.user:
            sentry_sdk.set_user({
                "id": str(g.user.id),
                "email": g.user.email,
                "role": g.user.role
            })

    @app.after_request
    def after_request(response):
        """Add correlation ID to response headers."""
        if hasattr(g, 'correlation_id'):
            response.headers['X-Correlation-ID'] = g.correlation_id
        return response

    # Error handlers
    @app.errorhandler(429)
    def ratelimit_handler(e):
        """Handle rate limit exceeded errors."""
        return {
            'error': 'Rate limit exceeded',
            'retry_after': e.description
        }, 429

    @app.errorhandler(500)
    def internal_error_handler(e):
        """Handle internal server errors."""
        sentry_sdk.capture_exception(e)
        return {
            'error': 'Internal server error',
            'correlation_id': getattr(g, 'correlation_id', None)
        }, 500

    # Health check
    @app.route('/health')
    def health_check():
        return {'status': 'healthy'}

    # Register blueprints
    from api import sessions, analyses, action_items, users, dashboard, prompts, notifications
    app.register_blueprint(sessions.bp)
    app.register_blueprint(analyses.bp)
    app.register_blueprint(action_items.bp)
    app.register_blueprint(users.bp)
    app.register_blueprint(dashboard.bp)
    app.register_blueprint(prompts.bp)
    app.register_blueprint(notifications.bp)

    # Apply rate limits to specific endpoints (after blueprints are registered)
    if hasattr(app, 'limiter'):
        limiter = app.limiter

        # Expensive operations - Google Sheets import
        limiter.limit("5 per minute")(
            app.view_functions.get('sessions.import_surveys')
        )

        # Very expensive operations - AI analysis
        limiter.limit("3 per minute")(
            app.view_functions.get('sessions.run_analysis')
        )

        # Read operations - higher limits
        for endpoint in ['sessions.list_sessions', 'sessions.session_detail',
                         'analyses.get_question_analyses', 'analyses.get_common_issues',
                         'analyses.get_session_ratings', 'dashboard.get_dashboard_stats',
                         'dashboard.get_facilitator_performance', 'dashboard.get_facilitator_history',
                         'action_items.list_action_items', 'users.list_users', 'users.get_current_user']:
            view_func = app.view_functions.get(endpoint)
            if view_func:
                limiter.limit("60 per minute")(view_func)

        # Write operations - moderate limits
        for endpoint in ['action_items.create_action_item', 'action_items.update_action_item',
                         'action_items.delete_action_item', 'users.update_user_role',
                         'users.update_user_access', 'users.delete_user', 'users.create_bulk_users']:
            view_func = app.view_functions.get(endpoint)
            if view_func:
                limiter.limit("30 per minute")(view_func)

    return app

app = create_app()

if __name__ == '__main__':
    app.run(debug=True, port=8000)
