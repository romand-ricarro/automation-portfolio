"""
Tests for InsightPulse validation schemas.
"""
import pytest
from datetime import date
import uuid
from marshmallow import ValidationError

# Add backend to path
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from schemas import (
    SessionUpdateSchema,
    ActionItemCreateSchema,
    ActionItemUpdateSchema,
    UserRoleUpdateSchema,
    UserAccessUpdateSchema,
    UserBulkCreateSchema,
)
from schemas.session_schemas import SessionImportSchema


class TestSessionSchemas:
    """Tests for session-related validation schemas."""

    def test_session_import_valid_spreadsheet_id(self):
        """Test valid Google Sheets spreadsheet ID."""
        schema = SessionImportSchema()
        data = {'spreadsheet_id': '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms'}
        result = schema.load(data)
        assert result['spreadsheet_id'] == '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms'

    def test_session_import_invalid_spreadsheet_id_too_short(self):
        """Test invalid spreadsheet ID that's too short."""
        schema = SessionImportSchema()
        data = {'spreadsheet_id': 'abc123'}
        with pytest.raises(ValidationError) as exc_info:
            schema.load(data)
        assert 'spreadsheet_id' in exc_info.value.messages

    def test_session_import_invalid_spreadsheet_id_special_chars(self):
        """Test invalid spreadsheet ID with special characters."""
        schema = SessionImportSchema()
        # Special chars make it invalid
        data = {'spreadsheet_id': 'abc!@#$%^&*()defghijklmnop'}
        with pytest.raises(ValidationError) as exc_info:
            schema.load(data)
        assert 'spreadsheet_id' in exc_info.value.messages

    def test_session_import_empty_allows_env_fallback(self):
        """Test that empty spreadsheet_id is allowed (uses env var)."""
        schema = SessionImportSchema()
        data = {}
        result = schema.load(data)
        assert result.get('spreadsheet_id') is None

    def test_session_update_valid(self):
        """Test valid session update data."""
        schema = SessionUpdateSchema()
        data = {
            'session_name': 'Updated Session Name',
            'status': 'analyzed'
        }
        result = schema.load(data)
        assert result['session_name'] == 'Updated Session Name'
        assert result['status'] == 'analyzed'

    def test_session_update_invalid_status(self):
        """Test invalid session status."""
        schema = SessionUpdateSchema()
        data = {'status': 'invalid_status'}
        with pytest.raises(ValidationError) as exc_info:
            schema.load(data)
        assert 'status' in exc_info.value.messages

    def test_session_update_name_too_long(self):
        """Test session name exceeds max length."""
        schema = SessionUpdateSchema()
        data = {'session_name': 'x' * 201}
        with pytest.raises(ValidationError) as exc_info:
            schema.load(data)
        assert 'session_name' in exc_info.value.messages


class TestActionItemSchemas:
    """Tests for action item validation schemas."""

    def test_create_action_item_valid(self):
        """Test valid action item creation."""
        schema = ActionItemCreateSchema()
        session_id = str(uuid.uuid4())
        data = {
            'session_id': session_id,
            'issue': 'Test issue',
            'action': 'Test action',
            'priority': 'High',
            'person_in_charge': 'John Doe',
            'deadline': '2024-12-31',
            'status': 'Open',
            'notes': 'Test notes'
        }
        result = schema.load(data)
        assert str(result['session_id']) == session_id
        assert result['issue'] == 'Test issue'
        assert result['priority'] == 'High'
        assert result['deadline'] == date(2024, 12, 31)

    def test_create_action_item_missing_required(self):
        """Test missing required fields."""
        schema = ActionItemCreateSchema()
        data = {'issue': 'Test issue'}
        with pytest.raises(ValidationError) as exc_info:
            schema.load(data)
        errors = exc_info.value.messages
        assert 'session_id' in errors
        assert 'action' in errors
        assert 'priority' in errors

    def test_create_action_item_invalid_priority(self):
        """Test invalid priority value."""
        schema = ActionItemCreateSchema()
        data = {
            'session_id': str(uuid.uuid4()),
            'issue': 'Test issue',
            'action': 'Test action',
            'priority': 'Critical'  # Invalid - should be High/Medium/Low
        }
        with pytest.raises(ValidationError) as exc_info:
            schema.load(data)
        assert 'priority' in exc_info.value.messages

    def test_create_action_item_invalid_status(self):
        """Test invalid status value."""
        schema = ActionItemCreateSchema()
        data = {
            'session_id': str(uuid.uuid4()),
            'issue': 'Test issue',
            'action': 'Test action',
            'priority': 'High',
            'status': 'Done'  # Invalid - should be Open/In Progress/Completed/On Hold
        }
        with pytest.raises(ValidationError) as exc_info:
            schema.load(data)
        assert 'status' in exc_info.value.messages

    def test_create_action_item_invalid_date_format(self):
        """Test invalid date format."""
        schema = ActionItemCreateSchema()
        data = {
            'session_id': str(uuid.uuid4()),
            'issue': 'Test issue',
            'action': 'Test action',
            'priority': 'High',
            'deadline': '31-12-2024'  # Wrong format
        }
        with pytest.raises(ValidationError) as exc_info:
            schema.load(data)
        assert 'deadline' in exc_info.value.messages

    def test_create_action_item_issue_too_long(self):
        """Test issue exceeds max length."""
        schema = ActionItemCreateSchema()
        data = {
            'session_id': str(uuid.uuid4()),
            'issue': 'x' * 501,
            'action': 'Test action',
            'priority': 'High'
        }
        with pytest.raises(ValidationError) as exc_info:
            schema.load(data)
        assert 'issue' in exc_info.value.messages

    def test_update_action_item_partial(self):
        """Test partial update is valid."""
        schema = ActionItemUpdateSchema()
        data = {'status': 'Completed'}
        result = schema.load(data)
        assert result['status'] == 'Completed'
        assert 'issue' not in result

    def test_update_action_item_empty_valid(self):
        """Test empty update is valid (no fields to update)."""
        schema = ActionItemUpdateSchema()
        data = {}
        result = schema.load(data)
        assert result == {}


class TestUserSchemas:
    """Tests for user-related validation schemas."""

    def test_role_update_valid(self):
        """Test valid role update."""
        schema = UserRoleUpdateSchema()
        for role in ['admin', 'facilitator', 'viewer']:
            result = schema.load({'role': role})
            assert result['role'] == role

    def test_role_update_invalid(self):
        """Test invalid role value."""
        schema = UserRoleUpdateSchema()
        with pytest.raises(ValidationError) as exc_info:
            schema.load({'role': 'superadmin'})
        assert 'role' in exc_info.value.messages

    def test_role_update_missing(self):
        """Test missing role field."""
        schema = UserRoleUpdateSchema()
        with pytest.raises(ValidationError) as exc_info:
            schema.load({})
        assert 'role' in exc_info.value.messages

    def test_access_update_valid(self):
        """Test valid access update."""
        schema = UserAccessUpdateSchema()
        result = schema.load({'is_active': True})
        assert result['is_active'] is True

        result = schema.load({'is_active': False})
        assert result['is_active'] is False

    def test_access_update_missing(self):
        """Test missing is_active field."""
        schema = UserAccessUpdateSchema()
        with pytest.raises(ValidationError) as exc_info:
            schema.load({})
        assert 'is_active' in exc_info.value.messages

    def test_bulk_create_valid(self):
        """Test valid bulk user creation."""
        schema = UserBulkCreateSchema()
        data = {
            'emails': ['user1@example.com', 'user2@example.com'],
            'role': 'viewer'
        }
        result = schema.load(data)
        assert len(result['emails']) == 2
        assert result['role'] == 'viewer'

    def test_bulk_create_default_role(self):
        """Test bulk create uses default role."""
        schema = UserBulkCreateSchema()
        data = {'emails': ['user@example.com']}
        result = schema.load(data)
        assert result['role'] == 'viewer'

    def test_bulk_create_invalid_email(self):
        """Test invalid email format."""
        schema = UserBulkCreateSchema()
        data = {'emails': ['not-an-email']}
        with pytest.raises(ValidationError) as exc_info:
            schema.load(data)
        assert 'emails' in exc_info.value.messages

    def test_bulk_create_empty_emails(self):
        """Test empty emails list."""
        schema = UserBulkCreateSchema()
        data = {'emails': []}
        with pytest.raises(ValidationError) as exc_info:
            schema.load(data)
        assert 'emails' in exc_info.value.messages

    def test_bulk_create_too_many_emails(self):
        """Test emails list exceeds maximum."""
        schema = UserBulkCreateSchema()
        data = {'emails': [f'user{i}@example.com' for i in range(101)]}
        with pytest.raises(ValidationError) as exc_info:
            schema.load(data)
        assert 'emails' in exc_info.value.messages
