"""
Rate limiting configuration and decorators for InsightPulse.
"""
from functools import wraps
from flask import g, current_app, jsonify
import logging

logger = logging.getLogger('insightpulse.rate_limiter')

# Rate limit configurations by endpoint category
RATE_LIMITS = {
    # Expensive operations (Google Sheets + OpenAI)
    'import': '5 per minute',
    'analyze': '3 per minute',

    # Read operations
    'read': '60 per minute',

    # Write operations
    'write': '30 per minute',

    # Auth-related endpoints
    'auth': '10 per minute',
}


def get_limiter():
    """Get the limiter instance from the current app."""
    return getattr(current_app, 'limiter', None)


def apply_rate_limit(limit_key):
    """
    Decorator to apply rate limiting based on a category key.

    Usage:
        @apply_rate_limit('import')
        def my_expensive_endpoint():
            pass
    """
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            limiter = get_limiter()
            if limiter is None:
                # Rate limiting not configured, proceed without limit
                return f(*args, **kwargs)

            limit = RATE_LIMITS.get(limit_key, RATE_LIMITS['read'])

            # Apply the limit dynamically
            # Note: Flask-Limiter decorators are typically applied at import time,
            # but we can use limiter.limit() as a decorator factory
            limited_func = limiter.limit(limit)(f)
            return limited_func(*args, **kwargs)

        return wrapper
    return decorator


def exempt_admin(f):
    """
    Decorator to exempt admin users from rate limiting.

    Usage:
        @exempt_admin
        @limiter.limit("5 per minute")
        def my_endpoint():
            pass
    """
    @wraps(f)
    def wrapper(*args, **kwargs):
        limiter = get_limiter()
        if limiter and hasattr(g, 'user') and g.user and g.user.role == 'admin':
            # Mark this request as exempt
            limiter.exempt(f)
        return f(*args, **kwargs)
    return wrapper


def log_rate_limit_hit(response):
    """Log when a rate limit is hit."""
    if response.status_code == 429:
        user_id = getattr(g, 'user', None) and g.user.id or 'anonymous'
        logger.warning(
            f"Rate limit exceeded - User: {user_id}, "
            f"Endpoint: {g.get('endpoint', 'unknown')}"
        )
    return response
