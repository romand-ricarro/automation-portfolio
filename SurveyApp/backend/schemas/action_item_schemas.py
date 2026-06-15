"""
Validation schemas for Action Item API endpoints.
"""
from marshmallow import Schema, fields, validate
from markupsafe import escape


def sanitize_string(value):
    """Sanitize string to prevent XSS."""
    if value is None:
        return None
    return str(escape(value.strip()))


class ActionItemCreateSchema(Schema):
    """Schema for POST /api/action-items"""
    session_id = fields.UUID(
        required=True,
        metadata={'description': 'UUID of the associated session'}
    )
    issue = fields.String(
        required=True,
        validate=validate.Length(min=1, max=500),
        metadata={'description': 'Issue description'}
    )
    action = fields.String(
        required=True,
        validate=validate.Length(min=1, max=1000),
        metadata={'description': 'Action to take'}
    )
    priority = fields.String(
        required=True,
        validate=validate.OneOf(['High', 'Medium', 'Low']),
        metadata={'description': 'Priority level'}
    )
    person_in_charge = fields.String(
        load_default=None,
        validate=validate.Length(max=200),
        metadata={'description': 'Person responsible'}
    )
    deadline = fields.Date(
        load_default=None,
        format='%Y-%m-%d',
        metadata={'description': 'Due date in YYYY-MM-DD format'}
    )
    status = fields.String(
        load_default='Open',
        validate=validate.OneOf(['Open', 'In Progress', 'Completed', 'On Hold']),
        metadata={'description': 'Item status'}
    )
    notes = fields.String(
        load_default=None,
        validate=validate.Length(max=2000),
        metadata={'description': 'Additional notes'}
    )


class ActionItemUpdateSchema(Schema):
    """Schema for PUT /api/action-items/<id>"""
    issue = fields.String(
        validate=validate.Length(min=1, max=500),
        metadata={'description': 'Issue description'}
    )
    action = fields.String(
        validate=validate.Length(min=1, max=1000),
        metadata={'description': 'Action to take'}
    )
    priority = fields.String(
        validate=validate.OneOf(['High', 'Medium', 'Low']),
        metadata={'description': 'Priority level'}
    )
    person_in_charge = fields.String(
        allow_none=True,
        validate=validate.Length(max=200),
        metadata={'description': 'Person responsible'}
    )
    deadline = fields.Date(
        allow_none=True,
        format='%Y-%m-%d',
        metadata={'description': 'Due date in YYYY-MM-DD format'}
    )
    status = fields.String(
        validate=validate.OneOf(['Open', 'In Progress', 'Completed', 'On Hold']),
        metadata={'description': 'Item status'}
    )
    notes = fields.String(
        allow_none=True,
        validate=validate.Length(max=2000),
        metadata={'description': 'Additional notes'}
    )
