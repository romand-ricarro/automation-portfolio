"""
Validation schemas for Session API endpoints.
"""
from marshmallow import Schema, fields, validate, ValidationError
import re


def validate_spreadsheet_id_format(value):
    """Validate Google Sheets ID format."""
    if value is None:
        return  # Will use environment variable
    # Google Sheets IDs are alphanumeric with possible hyphens/underscores
    pattern = r'^[a-zA-Z0-9_-]{20,60}$'
    if not re.match(pattern, value):
        raise ValidationError(
            'Invalid format. Expected Google Sheets ID (alphanumeric, 20-60 characters).'
        )


class SessionImportSchema(Schema):
    """Schema for POST /api/sessions/import"""
    spreadsheet_id = fields.String(
        load_default=None,
        validate=validate_spreadsheet_id_format,
        metadata={'description': 'Google Sheets spreadsheet ID'}
    )
    sheet_name = fields.String(
        load_default=None,
        validate=validate.Length(max=100),
        metadata={'description': 'Optional sheet name to import from'}
    )


class SessionUpdateSchema(Schema):
    """Schema for PATCH /api/sessions/<id>"""
    session_name = fields.String(
        validate=validate.Length(min=1, max=200),
        metadata={'description': 'Session display name'}
    )
    facilitator_name = fields.String(
        validate=validate.Length(max=200),
        metadata={'description': 'Facilitator name'}
    )
    status = fields.String(
        validate=validate.OneOf(['pending', 'analyzing', 'analyzed', 'error']),
        metadata={'description': 'Session status'}
    )
