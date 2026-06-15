"""
Service layer tests for InsightPulse
Tests authentication, OpenAI, and Google Sheets services
"""
import pytest
from unittest.mock import patch, MagicMock, Mock
from services import auth_service, openai_service, google_sheets_service
from models.database import User, db
import uuid


# ============================================================================
# AUTH SERVICE TESTS
# ============================================================================

class TestAuthService:

    @patch('services.auth_service.supabase')
    def test_require_auth_success(self, mock_supabase, app, admin_user):
        """Test successful authentication with valid token"""
        with app.app_context():
            # Mock Supabase response
            mock_user_response = MagicMock()
            mock_user_response.user.id = admin_user.supabase_user_id
            mock_user_response.user.email = admin_user.email
            mock_supabase.auth.get_user.return_value = mock_user_response

            # Mock database user lookup
            with patch.object(User.query, 'filter_by') as mock_filter:
                mock_filter.return_value.first.return_value = admin_user

                # Create mock request with authorization header
                with app.test_request_context(
                    headers={'Authorization': 'Bearer valid-token'}
                ):
                    from flask import g

                    # Call the decorated function
                    @auth_service.require_auth
                    def protected_route():
                        return {'user': g.user.email}

                    result = protected_route()
                    assert result['user'] == admin_user.email

    @patch('services.auth_service.supabase')
    def test_require_auth_no_token(self, mock_supabase, app):
        """Test authentication fails without token"""
        with app.app_context():
            with app.test_request_context():
                @auth_service.require_auth
                def protected_route():
                    return {'success': True}

                result = protected_route()
                # Should return 401 response
                assert result[1] == 401

    @patch('services.auth_service.supabase')
    def test_require_auth_invalid_token(self, mock_supabase, app):
        """Test authentication fails with invalid token"""
        with app.app_context():
            # Mock Supabase to raise exception
            mock_supabase.auth.get_user.side_effect = Exception('Invalid token')

            with app.test_request_context(
                headers={'Authorization': 'Bearer invalid-token'}
            ):
                @auth_service.require_auth
                def protected_route():
                    return {'success': True}

                result = protected_route()
                assert result[1] == 401

    @patch('services.auth_service.supabase')
    def test_require_role_admin_success(self, mock_supabase, app, admin_user):
        """Test role-based access for admin"""
        with app.app_context():
            with app.test_request_context():
                from flask import g
                g.user = admin_user

                @auth_service.require_role('admin')
                def admin_only_route():
                    return {'success': True}

                result = admin_only_route()
                assert result['success'] is True

    @patch('services.auth_service.supabase')
    def test_require_role_facilitator_fails_for_viewer(self, mock_supabase, app, viewer_user):
        """Test role-based access blocks viewer from facilitator route"""
        with app.app_context():
            with app.test_request_context():
                from flask import g
                g.user = viewer_user

                @auth_service.require_role('facilitator')
                def facilitator_route():
                    return {'success': True}

                result = facilitator_route()
                assert result[1] == 403

    @patch('services.auth_service.supabase')
    def test_require_role_admin_access_to_facilitator_route(self, mock_supabase, app, admin_user):
        """Test that admin can access facilitator routes"""
        with app.app_context():
            with app.test_request_context():
                from flask import g
                g.user = admin_user

                @auth_service.require_role('facilitator')
                def facilitator_route():
                    return {'success': True}

                result = facilitator_route()
                assert result['success'] is True


# ============================================================================
# OPENAI SERVICE TESTS
# ============================================================================

class TestOpenAIService:

    @patch('services.openai_service.client')
    def test_analyze_question_success(self, mock_openai_client):
        """Test successful question analysis"""
        # Mock OpenAI response
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = "Students learned about testing methodologies."
        mock_openai_client.chat.completions.create.return_value = mock_response

        question = "What did you learn?"
        responses = ["I learned about unit testing", "I learned about integration testing"]

        result = openai_service.analyze_question(question, responses)

        assert "Students learned about testing methodologies" in result
        assert mock_openai_client.chat.completions.create.called

    @patch('services.openai_service.client')
    def test_analyze_question_with_retry(self, mock_openai_client):
        """Test question analysis with retry on failure"""
        # First call fails, second succeeds
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = "Success on retry"

        mock_openai_client.chat.completions.create.side_effect = [
            Exception("API Error"),
            mock_response
        ]

        question = "What did you learn?"
        responses = ["Test response"]

        result = openai_service.analyze_question(question, responses)

        assert "Success on retry" in result
        assert mock_openai_client.chat.completions.create.call_count == 2

    @patch('services.openai_service.client')
    def test_generate_common_issues_table_success(self, mock_openai_client):
        """Test successful common issues table generation"""
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = """
| Common Issue | Evidence/Signal |
|--------------|----------------|
| Time management | Multiple mentions of time constraints |
| Tool complexity | Students found tools difficult |
"""
        mock_openai_client.chat.completions.create.return_value = mock_response

        analyses = [
            "Students struggled with time management",
            "Tools were too complex for beginners"
        ]

        result = openai_service.generate_common_issues_table(analyses)

        assert "Time management" in result
        assert "Tool complexity" in result

    @patch('services.openai_service.client')
    def test_analyze_question_empty_responses(self, mock_openai_client):
        """Test analyzing question with empty responses"""
        # Should handle empty responses gracefully
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = "No responses to analyze."
        mock_openai_client.chat.completions.create.return_value = mock_response

        question = "What did you learn?"
        responses = []

        result = openai_service.analyze_question(question, responses)

        # Should still call OpenAI (or handle gracefully)
        assert result is not None


# ============================================================================
# GOOGLE SHEETS SERVICE TESTS
# ============================================================================

class TestGoogleSheetsService:

    @patch('services.google_sheets_service.gspread.service_account_from_dict')
    def test_fetch_survey_responses_success(self, mock_gspread):
        """Test successful fetch from Google Sheets"""
        # Mock gspread client and worksheet
        mock_client = MagicMock()
        mock_spreadsheet = MagicMock()
        mock_worksheet = MagicMock()

        mock_gspread.return_value = mock_client
        mock_client.open_by_key.return_value = mock_spreadsheet
        mock_spreadsheet.get_worksheet.return_value = mock_worksheet

        # Mock worksheet data (header + rows)
        mock_worksheet.get_all_values.return_value = [
            # Header row
            ['Timestamp', 'Email', 'Session Date', 'Session ID', 'Facilitator Name',
             'What did you learn?', 'How can you apply?', 'What more do you need?', 'Comments',
             'Understanding', 'Mechanics', 'QA Support', 'Articulation', 'Pace',
             'Tools', 'Repeatability', 'Objectives', 'Quality'],
            # Data row
            ['2024-01-15 10:00', 'test@example.com', '2024-01-15', 'TEST001', 'John Doe',
             'Learned testing', 'Will apply at work', 'Need more practice', 'Great session',
             '5', '4', '5', '4', '4', '5', '5', '4', '5']
        ]

        with patch.dict('os.environ', {
            'GOOGLE_SHEETS_CREDENTIALS': '{"type": "service_account", "project_id": "test"}'
        }):
            responses = google_sheets_service.fetch_survey_responses('test-sheet-id')

            assert len(responses) == 1
            assert responses[0]['session_id'] == 'TEST001'
            assert responses[0]['facilitator_name'] == 'John Doe'
            assert responses[0]['learned'] == 'Learned testing'

    @patch('services.google_sheets_service.gspread.service_account_from_dict')
    def test_fetch_survey_responses_empty_sheet(self, mock_gspread):
        """Test fetch from empty Google Sheets"""
        mock_client = MagicMock()
        mock_spreadsheet = MagicMock()
        mock_worksheet = MagicMock()

        mock_gspread.return_value = mock_client
        mock_client.open_by_key.return_value = mock_spreadsheet
        mock_spreadsheet.get_worksheet.return_value = mock_worksheet

        # Only header row
        mock_worksheet.get_all_values.return_value = [
            ['Timestamp', 'Email', 'Session Date', 'Session ID', 'Facilitator Name',
             'Question 1', 'Question 2', 'Question 3', 'Question 4',
             'Rating 1', 'Rating 2', 'Rating 3', 'Rating 4', 'Rating 5',
             'Rating 6', 'Rating 7', 'Rating 8', 'Rating 9']
        ]

        with patch.dict('os.environ', {
            'GOOGLE_SHEETS_CREDENTIALS': '{"type": "service_account", "project_id": "test"}'
        }):
            responses = google_sheets_service.fetch_survey_responses('test-sheet-id')

            assert len(responses) == 0

    @patch('services.google_sheets_service.gspread.service_account_from_dict')
    def test_fetch_survey_responses_api_error(self, mock_gspread):
        """Test handling of Google Sheets API error"""
        mock_gspread.side_effect = Exception('API Error')

        with patch.dict('os.environ', {
            'GOOGLE_SHEETS_CREDENTIALS': '{"type": "service_account", "project_id": "test"}'
        }):
            with pytest.raises(Exception):
                google_sheets_service.fetch_survey_responses('test-sheet-id')

    @patch('services.google_sheets_service.gspread.service_account_from_dict')
    def test_fetch_survey_responses_malformed_data(self, mock_gspread):
        """Test handling of malformed data from Google Sheets"""
        mock_client = MagicMock()
        mock_spreadsheet = MagicMock()
        mock_worksheet = MagicMock()

        mock_gspread.return_value = mock_client
        mock_client.open_by_key.return_value = mock_spreadsheet
        mock_spreadsheet.get_worksheet.return_value = mock_worksheet

        # Malformed data - missing columns
        mock_worksheet.get_all_values.return_value = [
            ['Timestamp', 'Email'],  # Too few columns
            ['2024-01-15', 'test@example.com']
        ]

        with patch.dict('os.environ', {
            'GOOGLE_SHEETS_CREDENTIALS': '{"type": "service_account", "project_id": "test"}'
        }):
            responses = google_sheets_service.fetch_survey_responses('test-sheet-id')

            # Should handle gracefully, possibly returning empty or partial data
            # Depending on implementation
            assert isinstance(responses, list)


# ============================================================================
# DATABASE MODEL TESTS
# ============================================================================

class TestDatabaseModels:

    def test_user_to_dict(self, app, admin_user):
        """Test User model to_dict method"""
        with app.app_context():
            user_dict = admin_user.to_dict()
            assert user_dict['email'] == admin_user.email
            assert user_dict['role'] == 'admin'
            assert 'id' in user_dict

    def test_session_to_dict(self, app, sample_session):
        """Test Session model to_dict method"""
        with app.app_context():
            session_dict = sample_session.to_dict()
            assert session_dict['session_id'] == 'TEST001'
            assert session_dict['session_name'] == 'Test Session'
            assert session_dict['num_responses'] == 10

    def test_action_item_to_dict(self, app, sample_action_item):
        """Test ActionItem model to_dict method"""
        with app.app_context():
            item_dict = sample_action_item.to_dict()
            assert item_dict['issue'] == 'Test Issue'
            assert item_dict['action'] == 'Test Action'
            assert item_dict['priority'] == 'High'

    def test_session_rating_to_dict(self, app, sample_rating):
        """Test SessionRating model to_dict method"""
        with app.app_context():
            rating_dict = sample_rating.to_dict()
            assert rating_dict['repeatability'] == 4.6
            assert rating_dict['overall_quality'] == 4.4


# ============================================================================
# UTILITY TESTS
# ============================================================================

class TestUtilities:

    def test_parse_session_date_various_formats(self, app):
        """Test date parsing with various formats"""
        from api.sessions import parse_session_date
        from datetime import date

        # YYYY-MM-DD format
        result1 = parse_session_date('2024-01-15')
        assert result1 == date(2024, 1, 15)

        # MM/DD/YYYY format
        result2 = parse_session_date('01/15/2024')
        assert result2 == date(2024, 1, 15)

        # DD/MM/YYYY format
        result3 = parse_session_date('15/01/2024')
        assert result3 == date(2024, 1, 15)

        # Invalid format - should default to today
        result4 = parse_session_date('invalid-date')
        assert isinstance(result4, date)

        # Empty string - should default to today
        result5 = parse_session_date('')
        assert isinstance(result5, date)
