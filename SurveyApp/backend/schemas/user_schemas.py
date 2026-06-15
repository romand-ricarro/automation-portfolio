"""
Validation schemas for User API endpoints.
"""
from marshmallow import Schema, fields, validate


class UserRoleUpdateSchema(Schema):
    """Schema for PUT /api/users/<id>/role"""
    role = fields.String(
        required=True,
        validate=validate.OneOf(['admin', 'facilitator', 'viewer']),
        metadata={'description': 'User role'}
    )


class UserAccessUpdateSchema(Schema):
    """Schema for PUT /api/users/<id>/access"""
    is_active = fields.Boolean(
        required=True,
        metadata={'description': 'Whether user is active'}
    )


class UserNameUpdateSchema(Schema):
    """Schema for PUT /api/users/<id>/name"""
    name = fields.String(
        required=True,
        validate=validate.Length(min=1, max=255),
        metadata={'description': 'User display name (must match facilitator name in surveys)'}
    )


class UserBulkCreateSchema(Schema):
    """Schema for POST /api/users/bulk"""
    emails = fields.List(
        fields.Email(),
        required=True,
        validate=validate.Length(min=1, max=100),
        metadata={'description': 'List of email addresses'}
    )
    role = fields.String(
        load_default='viewer',
        validate=validate.OneOf(['admin', 'facilitator', 'viewer']),
        metadata={'description': 'Role to assign to all users'}
    )
