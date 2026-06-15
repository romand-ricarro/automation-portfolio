"""
Centralized logging configuration for InsightPulse.
Provides structured logging with correlation IDs for request tracing.
"""
import logging
import uuid
from functools import wraps
from flask import g, request
import sentry_sdk


def setup_logging(app):
    """Configure logging for the Flask application."""
    log_level = logging.DEBUG if app.debug else logging.INFO

    # Configure root logger
    logging.basicConfig(
        level=log_level,
        format='%(asctime)s [%(levelname)s] %(name)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )

    # Reduce noise from third-party libraries
    logging.getLogger('urllib3').setLevel(logging.WARNING)
    logging.getLogger('httpx').setLevel(logging.WARNING)

    return logging.getLogger('insightpulse')


def get_correlation_id():
    """Get or create a correlation ID for the current request."""
    if not hasattr(g, 'correlation_id'):
        g.correlation_id = str(uuid.uuid4())[:8]
    return g.correlation_id


def get_logger(name='insightpulse'):
    """Get a logger instance with the given name."""
    return logging.getLogger(name)


class RequestLogger:
    """Context manager for logging request/response pairs."""

    def __init__(self, logger, endpoint):
        self.logger = logger
        self.endpoint = endpoint
        self.correlation_id = get_correlation_id()

    def __enter__(self):
        self.logger.info(
            f"[{self.correlation_id}] {request.method} {self.endpoint} - Start"
        )
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type:
            self.logger.error(
                f"[{self.correlation_id}] {request.method} {self.endpoint} - "
                f"Error: {exc_val}"
            )
        else:
            self.logger.info(
                f"[{self.correlation_id}] {request.method} {self.endpoint} - Complete"
            )
        return False


def log_api_call(logger):
    """Decorator to log API endpoint calls."""
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            correlation_id = get_correlation_id()
            endpoint = request.path

            logger.info(
                f"[{correlation_id}] {request.method} {endpoint} - "
                f"User: {getattr(g, 'user', None) and g.user.id or 'anonymous'}"
            )

            try:
                result = f(*args, **kwargs)
                logger.debug(f"[{correlation_id}] {request.method} {endpoint} - Success")
                return result
            except Exception as e:
                logger.error(
                    f"[{correlation_id}] {request.method} {endpoint} - "
                    f"Error: {str(e)}"
                )
                raise
        return wrapper
    return decorator


def log_external_call(service_name):
    """Decorator to log external service calls (OpenAI, Google Sheets)."""
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            logger = get_logger('insightpulse.external')
            correlation_id = get_correlation_id() if hasattr(g, 'correlation_id') else 'N/A'

            logger.info(f"[{correlation_id}] {service_name} call - Start")

            try:
                result = f(*args, **kwargs)
                logger.info(f"[{correlation_id}] {service_name} call - Success")
                return result
            except Exception as e:
                logger.error(f"[{correlation_id}] {service_name} call - Error: {str(e)}")
                sentry_sdk.capture_exception(e)
                raise
        return wrapper
    return decorator
