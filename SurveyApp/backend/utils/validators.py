"""
Custom validators and validation utilities for InsightPulse.
"""
from functools import wraps
from flask import request, jsonify
from marshmallow import ValidationError
from markupsafe import escape
import re
import logging

logger = logging.getLogger('insightpulse.validators')


def validate_request(schema_class):
    """
    Decorator to validate request JSON against a Marshmallow schema.

    Usage:
        @validate_request(MySchema)
        def my_endpoint():
            # request.validated_data contains the validated data
            pass
    """
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            schema = schema_class()
            json_data = request.get_json() or {}

            try:
                validated_data = schema.load(json_data)
                request.validated_data = validated_data
            except ValidationError as err:
                logger.info(f"Validation failed: {err.messages}")
                return jsonify({
                    'error': 'Validation failed',
                    'details': err.messages
                }), 400

            return f(*args, **kwargs)
        return wrapper
    return decorator


def validate_google_sheets_id(spreadsheet_id):
    """
    Validate a Google Sheets spreadsheet ID format.

    Returns:
        tuple: (is_valid: bool, error_message: str or None)
    """
    if not spreadsheet_id:
        return False, 'Spreadsheet ID is required.'

    # Google Sheets IDs are typically 44 characters, alphanumeric with hyphens/underscores
    pattern = r'^[a-zA-Z0-9_-]{20,60}$'
    if not re.match(pattern, spreadsheet_id):
        return False, 'Invalid spreadsheet ID format. Please check the Google Sheets URL.'

    return True, None


def sanitize_html(text):
    """
    Sanitize text to prevent XSS attacks.
    Escapes HTML special characters.
    """
    if text is None:
        return None
    return str(escape(text))


def sanitize_dict(data, fields_to_sanitize):
    """
    Sanitize specified fields in a dictionary.

    Args:
        data: Dictionary containing data
        fields_to_sanitize: List of field names to sanitize

    Returns:
        Dictionary with sanitized fields
    """
    sanitized = data.copy()
    for field in fields_to_sanitize:
        if field in sanitized and sanitized[field] is not None:
            sanitized[field] = sanitize_html(sanitized[field])
    return sanitized


def get_friendly_sheets_error(error_message):
    """
    Convert Google Sheets API errors to user-friendly messages.
    """
    error_lower = str(error_message).lower()

    if 'not found' in error_lower or '404' in error_lower:
        return 'Could not access spreadsheet. Please check the ID and sharing permissions.'

    if 'permission' in error_lower or '403' in error_lower:
        return 'Permission denied. Please ensure the service account has access to the spreadsheet.'

    if 'invalid' in error_lower:
        return 'Invalid spreadsheet ID format. Please check the Google Sheets URL.'

    if 'quota' in error_lower or 'rate' in error_lower:
        return 'Google Sheets API rate limit exceeded. Please try again later.'

    # Default message
    return f'Error accessing Google Sheets: {error_message}'
