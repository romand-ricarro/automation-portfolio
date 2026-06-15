"""
Tests for InsightPulse validation utilities.
"""
import pytest

# Add backend to path
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.validators import (
    validate_google_sheets_id,
    sanitize_html,
    sanitize_dict,
    get_friendly_sheets_error,
)


class TestGoogleSheetsValidation:
    """Tests for Google Sheets ID validation."""

    def test_valid_spreadsheet_id(self):
        """Test valid spreadsheet IDs."""
        valid_ids = [
            '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
            'abc123def456ghi789jkl012mno345pqr678stu901',
            '1234567890123456789012345678901234567890',
        ]
        for sheet_id in valid_ids:
            is_valid, error = validate_google_sheets_id(sheet_id)
            assert is_valid is True, f"Expected {sheet_id} to be valid"
            assert error is None

    def test_invalid_spreadsheet_id_too_short(self):
        """Test spreadsheet ID that's too short."""
        is_valid, error = validate_google_sheets_id('abc123')
        assert is_valid is False
        assert error is not None
        assert 'format' in error.lower()

    def test_invalid_spreadsheet_id_special_chars(self):
        """Test spreadsheet ID with invalid characters."""
        is_valid, error = validate_google_sheets_id('abc123!@#$%^&*()')
        assert is_valid is False
        assert error is not None

    def test_empty_spreadsheet_id(self):
        """Test empty spreadsheet ID."""
        is_valid, error = validate_google_sheets_id('')
        assert is_valid is False
        assert 'required' in error.lower()

    def test_none_spreadsheet_id(self):
        """Test None spreadsheet ID."""
        is_valid, error = validate_google_sheets_id(None)
        assert is_valid is False
        assert 'required' in error.lower()


class TestSanitization:
    """Tests for HTML sanitization functions."""

    def test_sanitize_html_script_tag(self):
        """Test script tag is escaped."""
        result = sanitize_html('<script>alert("xss")</script>')
        assert '<script>' not in result
        assert '&lt;script&gt;' in result

    def test_sanitize_html_img_onerror(self):
        """Test img onerror is escaped."""
        result = sanitize_html('<img src="x" onerror="alert(1)">')
        assert '<img' not in result
        assert '&lt;img' in result

    def test_sanitize_html_none(self):
        """Test None input returns None."""
        result = sanitize_html(None)
        assert result is None

    def test_sanitize_html_safe_text(self):
        """Test normal text is unchanged."""
        result = sanitize_html('Hello, World!')
        assert result == 'Hello, World!'

    def test_sanitize_html_ampersand(self):
        """Test ampersand is escaped."""
        result = sanitize_html('Tom & Jerry')
        assert '&amp;' in result

    def test_sanitize_dict_specific_fields(self):
        """Test sanitizing specific fields in a dictionary."""
        data = {
            'title': '<script>bad</script>',
            'description': 'Normal text',
            'count': 42
        }
        result = sanitize_dict(data, ['title', 'description'])
        assert '&lt;script&gt;' in result['title']
        assert result['description'] == 'Normal text'
        assert result['count'] == 42

    def test_sanitize_dict_missing_field(self):
        """Test sanitizing a field that doesn't exist."""
        data = {'title': 'Test'}
        result = sanitize_dict(data, ['title', 'nonexistent'])
        assert result['title'] == 'Test'
        assert 'nonexistent' not in result


class TestFriendlyErrors:
    """Tests for user-friendly error messages."""

    def test_not_found_error(self):
        """Test 404 not found error message."""
        result = get_friendly_sheets_error('Spreadsheet not found: 404')
        assert 'access' in result.lower()
        assert 'check' in result.lower()

    def test_permission_error(self):
        """Test permission denied error message."""
        result = get_friendly_sheets_error('Permission denied: 403')
        assert 'permission' in result.lower()
        assert 'service account' in result.lower()

    def test_invalid_error(self):
        """Test invalid ID error message."""
        result = get_friendly_sheets_error('Invalid spreadsheet ID')
        assert 'invalid' in result.lower()
        assert 'url' in result.lower()

    def test_quota_error(self):
        """Test rate limit/quota error message."""
        result = get_friendly_sheets_error('Quota exceeded')
        assert 'rate limit' in result.lower()
        assert 'later' in result.lower()

    def test_unknown_error(self):
        """Test unknown error falls back to generic message."""
        result = get_friendly_sheets_error('Something weird happened')
        assert 'error' in result.lower()
        assert 'Something weird happened' in result
