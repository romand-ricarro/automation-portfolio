"""
Comprehensive API tests for InsightPulse
Tests all API endpoints with proper authentication and role-based access
"""
import pytest
import json
from unittest.mock import patch, MagicMock, Mock
from datetime import datetime, date
import uuid
from models.database import db, Session, User, ActionItem, QuestionAnalysis, CommonIssue, SessionRating


# ============================================================================
# FIXTURES - Authentication and Test Data
# ============================================================================

@pytest.fixture
def mock_auth(app):
    """Mock authentication decorator to bypass Supabase auth"""
    with patch('services.auth_service.supabase') as mock_supabase:
        # Mock successful authentication
        mock_user_response = MagicMock()
        mock_user_response.user.id = 'test-supabase-id'
        mock_user_response.user.email = 'test@example.com'
        mock_supabase.auth.get_user.return_value = mock_user_response
        yield mock_supabase


@pytest.fixture
def admin_user(app):
    """Create admin user for testing"""
    with app.app_context():
        user = User(
            id=uuid.uuid4(),  # Pass UUID object, not string
            email='admin@example.com',
            name='Admin User',
            role='admin'
        )
        db.session.add(user)
        db.session.commit()
        db.session.refresh(user)
        yield user


@pytest.fixture
def facilitator_user(app):
    """Create facilitator user for testing"""
    with app.app_context():
        user = User(
            id=uuid.uuid4(),
            email='facilitator@example.com',
            name='Facilitator User',
            role='facilitator'
        )
        db.session.add(user)
        db.session.commit()
        db.session.refresh(user)
        yield user


@pytest.fixture
def viewer_user(app):
    """Create viewer user for testing"""
    with app.app_context():
        user = User(
            id=uuid.uuid4(),
            email='viewer@example.com',
            name='Viewer User',
            role='viewer'
        )
        db.session.add(user)
        db.session.commit()
        db.session.refresh(user)
        yield user


@pytest.fixture
def sample_session(app, admin_user):
    """Create a sample session for testing"""
    with app.app_context():
        session = Session(
            id=uuid.uuid4(),
            session_id='TEST001',
            session_name='Test Session',
            session_date=date.today(),
            facilitator_name='John Doe',
            num_responses=10,
            status='pending',
            created_by=admin_user.id
        )
        db.session.add(session)
        db.session.commit()
        db.session.refresh(session)
        yield session


@pytest.fixture
def sample_action_item(app, sample_session, admin_user):
    """Create a sample action item for testing"""
    with app.app_context():
        item = ActionItem(
            id=uuid.uuid4(),
            session_id=sample_session.id,
            issue='Test Issue',
            action='Test Action',
            priority='High',
            status='Open',
            person_in_charge='Test Person',
            created_by=admin_user.id,
            updated_by=admin_user.id
        )
        db.session.add(item)
        db.session.commit()
        db.session.refresh(item)
        yield item


@pytest.fixture
def sample_rating(app, sample_session):
    """Create sample ratings for testing"""
    with app.app_context():
        rating = SessionRating(
            id=uuid.uuid4(),
            session_id=sample_session.id,
            facilitator_understanding=4.5,
            learning_mechanics=4.0,
            qa_support=4.2,
            problem_articulation=4.3,
            session_pace=4.1,
            tools_helpfulness=4.4,
            repeatability=4.6,
            learning_objectives=4.3,
            overall_quality=4.4
        )
        db.session.add(rating)
        db.session.commit()
        db.session.refresh(rating)
        yield rating


def create_auth_header(user):
    """Helper to create authorization header"""
    return {'Authorization': f'Bearer mock-token-{user.email}'}


def mock_g_user(user):
    """Mock Flask's g.user object"""
    return patch('flask.g', **{'user': user})


# ============================================================================
# SESSION TESTS
# ============================================================================

class TestSessionsAPI:

    def test_list_sessions_unauthorized(self, client):
        """Test listing sessions without authentication"""
        response = client.get('/api/sessions')
        assert response.status_code == 401

    def test_list_sessions_success(self, client, mock_auth, admin_user, sample_session):
        """Test listing sessions with authentication"""
        with mock_g_user(admin_user):
            with patch('services.auth_service.User.query') as mock_query:
                mock_query.filter_by.return_value.first.return_value = admin_user

                response = client.get(
                    '/api/sessions',
                    headers=create_auth_header(admin_user)
                )
                assert response.status_code == 200
                data = response.get_json()
                assert isinstance(data, list)

    def test_get_session_detail(self, client, mock_auth, admin_user, sample_session):
        """Test getting a specific session"""
        with mock_g_user(admin_user):
            with patch('services.auth_service.User.query') as mock_query:
                mock_query.filter_by.return_value.first.return_value = admin_user

                response = client.get(
                    f'/api/sessions/{sample_session.id}',
                    headers=create_auth_header(admin_user)
                )
                assert response.status_code == 200
                data = response.get_json()
                assert data['session_id'] == 'TEST001'

    def test_get_session_not_found(self, client, mock_auth, admin_user):
        """Test getting non-existent session"""
        with mock_g_user(admin_user):
            with patch('services.auth_service.User.query') as mock_query:
                mock_query.filter_by.return_value.first.return_value = admin_user

                fake_id = str(uuid.uuid4())
                response = client.get(
                    f'/api/sessions/{fake_id}',
                    headers=create_auth_header(admin_user)
                )
                assert response.status_code == 404

    def test_update_session_as_admin(self, client, mock_auth, admin_user, sample_session):
        """Test updating session as admin"""
        with mock_g_user(admin_user):
            with patch('services.auth_service.User.query') as mock_query:
                mock_query.filter_by.return_value.first.return_value = admin_user

                response = client.patch(
                    f'/api/sessions/{sample_session.id}',
                    headers=create_auth_header(admin_user),
                    json={'session_name': 'Updated Session Name'}
                )
                assert response.status_code == 200
                data = response.get_json()
                assert data['session_name'] == 'Updated Session Name'

    def test_update_session_as_viewer_fails(self, client, mock_auth, viewer_user, sample_session):
        """Test that viewer cannot update session"""
        with mock_g_user(viewer_user):
            with patch('services.auth_service.User.query') as mock_query:
                mock_query.filter_by.return_value.first.return_value = viewer_user

                response = client.patch(
                    f'/api/sessions/{sample_session.id}',
                    headers=create_auth_header(viewer_user),
                    json={'session_name': 'Should Fail'}
                )
                assert response.status_code == 403


# ============================================================================
# ACTION ITEMS TESTS
# ============================================================================

class TestActionItemsAPI:

    def test_list_action_items(self, client, mock_auth, admin_user, sample_action_item):
        """Test listing action items"""
        with mock_g_user(admin_user):
            with patch('services.auth_service.User.query') as mock_query:
                mock_query.filter_by.return_value.first.return_value = admin_user

                response = client.get(
                    '/api/action-items',
                    headers=create_auth_header(admin_user)
                )
                assert response.status_code == 200
                data = response.get_json()
                assert isinstance(data, list)

    def test_list_action_items_with_filters(self, client, mock_auth, admin_user, sample_action_item):
        """Test listing action items with filters"""
        with mock_g_user(admin_user):
            with patch('services.auth_service.User.query') as mock_query:
                mock_query.filter_by.return_value.first.return_value = admin_user

                response = client.get(
                    '/api/action-items?status=Open&priority=High',
                    headers=create_auth_header(admin_user)
                )
                assert response.status_code == 200

    def test_create_action_item_as_facilitator(self, client, mock_auth, facilitator_user, sample_session):
        """Test creating action item as facilitator"""
        with mock_g_user(facilitator_user):
            with patch('services.auth_service.User.query') as mock_query:
                mock_query.filter_by.return_value.first.return_value = facilitator_user

                item_data = {
                    'session_id': sample_session.id,
                    'issue': 'New Issue',
                    'action': 'New Action',
                    'priority': 'Medium',
                    'person_in_charge': 'Jane Doe',
                    'deadline': '2024-12-31'
                }

                response = client.post(
                    '/api/action-items',
                    headers=create_auth_header(facilitator_user),
                    json=item_data
                )
                assert response.status_code == 201
                data = response.get_json()
                assert data['issue'] == 'New Issue'

    def test_create_action_item_missing_fields(self, client, mock_auth, facilitator_user):
        """Test creating action item with missing required fields"""
        with mock_g_user(facilitator_user):
            with patch('services.auth_service.User.query') as mock_query:
                mock_query.filter_by.return_value.first.return_value = facilitator_user

                incomplete_data = {
                    'issue': 'Incomplete Item'
                    # Missing session_id, action, priority
                }

                response = client.post(
                    '/api/action-items',
                    headers=create_auth_header(facilitator_user),
                    json=incomplete_data
                )
                assert response.status_code == 400

    def test_create_action_item_as_viewer_fails(self, client, mock_auth, viewer_user, sample_session):
        """Test that viewer cannot create action items"""
        with mock_g_user(viewer_user):
            with patch('services.auth_service.User.query') as mock_query:
                mock_query.filter_by.return_value.first.return_value = viewer_user

                item_data = {
                    'session_id': sample_session.id,
                    'issue': 'Should Fail',
                    'action': 'Should Fail',
                    'priority': 'Low'
                }

                response = client.post(
                    '/api/action-items',
                    headers=create_auth_header(viewer_user),
                    json=item_data
                )
                assert response.status_code == 403

    def test_update_action_item(self, client, mock_auth, facilitator_user, sample_action_item):
        """Test updating an action item"""
        with mock_g_user(facilitator_user):
            with patch('services.auth_service.User.query') as mock_query:
                mock_query.filter_by.return_value.first.return_value = facilitator_user

                update_data = {
                    'status': 'In Progress',
                    'notes': 'Working on it'
                }

                response = client.put(
                    f'/api/action-items/{sample_action_item.id}',
                    headers=create_auth_header(facilitator_user),
                    json=update_data
                )
                assert response.status_code == 200
                data = response.get_json()
                assert data['status'] == 'In Progress'

    def test_delete_action_item(self, client, mock_auth, facilitator_user, sample_action_item):
        """Test deleting an action item"""
        with mock_g_user(facilitator_user):
            with patch('services.auth_service.User.query') as mock_query:
                mock_query.filter_by.return_value.first.return_value = facilitator_user

                response = client.delete(
                    f'/api/action-items/{sample_action_item.id}',
                    headers=create_auth_header(facilitator_user)
                )
                assert response.status_code == 200


# ============================================================================
# ANALYSES TESTS
# ============================================================================

class TestAnalysesAPI:

    def test_get_question_analyses(self, client, mock_auth, admin_user, sample_session):
        """Test getting question analyses for a session"""
        with mock_g_user(admin_user):
            with patch('services.auth_service.User.query') as mock_query:
                mock_query.filter_by.return_value.first.return_value = admin_user

                # Create sample analysis
                analysis = QuestionAnalysis(
                    session_id=sample_session.id,
                    question_label='What did you learn?',
                    question_text='What did you learn?',
                    analysis_text='Students learned about testing.'
                )
                db.session.add(analysis)
                db.session.commit()

                response = client.get(
                    f'/api/sessions/{sample_session.id}/analyses',
                    headers=create_auth_header(admin_user)
                )
                assert response.status_code == 200
                data = response.get_json()
                assert isinstance(data, list)

    def test_get_common_issues(self, client, mock_auth, admin_user, sample_session):
        """Test getting common issues for a session"""
        with mock_g_user(admin_user):
            with patch('services.auth_service.User.query') as mock_query:
                mock_query.filter_by.return_value.first.return_value = admin_user

                # Create sample common issue
                issue = CommonIssue(
                    session_id=sample_session.id,
                    common_issue='Time management',
                    evidence_signal='Multiple students mentioned time constraints',
                    display_order=1
                )
                db.session.add(issue)
                db.session.commit()

                response = client.get(
                    f'/api/sessions/{sample_session.id}/common-issues',
                    headers=create_auth_header(admin_user)
                )
                assert response.status_code == 200
                data = response.get_json()
                assert isinstance(data, list)

    def test_get_ratings(self, client, mock_auth, admin_user, sample_session, sample_rating):
        """Test getting ratings for a session"""
        with mock_g_user(admin_user):
            with patch('services.auth_service.User.query') as mock_query:
                mock_query.filter_by.return_value.first.return_value = admin_user

                response = client.get(
                    f'/api/sessions/{sample_session.id}/ratings',
                    headers=create_auth_header(admin_user)
                )
                assert response.status_code == 200
                data = response.get_json()
                assert 'repeatability' in data
                assert data['repeatability'] == 4.6


# ============================================================================
# DASHBOARD TESTS
# ============================================================================

class TestDashboardAPI:

    def test_get_dashboard_stats(self, client, mock_auth, admin_user, sample_session, sample_rating):
        """Test getting dashboard statistics"""
        with mock_g_user(admin_user):
            with patch('services.auth_service.User.query') as mock_query:
                mock_query.filter_by.return_value.first.return_value = admin_user

                response = client.get(
                    '/api/dashboard/stats',
                    headers=create_auth_header(admin_user)
                )
                assert response.status_code == 200
                data = response.get_json()
                assert 'total_sessions' in data
                assert 'open_action_items' in data
                assert 'average_repeatability' in data

    def test_get_facilitator_performance(self, client, mock_auth, admin_user, sample_session, sample_rating):
        """Test getting facilitator performance data"""
        with mock_g_user(admin_user):
            with patch('services.auth_service.User.query') as mock_query:
                mock_query.filter_by.return_value.first.return_value = admin_user

                response = client.get(
                    '/api/dashboard/facilitator-performance',
                    headers=create_auth_header(admin_user)
                )
                assert response.status_code == 200
                data = response.get_json()
                assert isinstance(data, list)


# ============================================================================
# USERS TESTS
# ============================================================================

class TestUsersAPI:

    def test_list_users_as_admin(self, client, mock_auth, admin_user):
        """Test listing users as admin"""
        with mock_g_user(admin_user):
            with patch('services.auth_service.User.query') as mock_query:
                mock_query.filter_by.return_value.first.return_value = admin_user
                mock_query.all.return_value = [admin_user]

                response = client.get(
                    '/api/users',
                    headers=create_auth_header(admin_user)
                )
                assert response.status_code == 200

    def test_list_users_as_viewer_fails(self, client, mock_auth, viewer_user):
        """Test that viewer cannot list users"""
        with mock_g_user(viewer_user):
            with patch('services.auth_service.User.query') as mock_query:
                mock_query.filter_by.return_value.first.return_value = viewer_user

                response = client.get(
                    '/api/users',
                    headers=create_auth_header(viewer_user)
                )
                assert response.status_code == 403

    def test_update_user_role(self, client, mock_auth, admin_user, viewer_user):
        """Test updating user role as admin"""
        with mock_g_user(admin_user):
            with patch('services.auth_service.User.query') as mock_query:
                mock_query.filter_by.return_value.first.return_value = admin_user

                # Mock User.query.get for the target user
                with patch.object(User.query, 'get', return_value=viewer_user):
                    response = client.put(
                        f'/api/users/{viewer_user.id}/role',
                        headers=create_auth_header(admin_user),
                        json={'role': 'facilitator'}
                    )
                    assert response.status_code == 200

    def test_update_user_role_invalid(self, client, mock_auth, admin_user, viewer_user):
        """Test updating user role with invalid role"""
        with mock_g_user(admin_user):
            with patch('services.auth_service.User.query') as mock_query:
                mock_query.filter_by.return_value.first.return_value = admin_user

                response = client.put(
                    f'/api/users/{viewer_user.id}/role',
                    headers=create_auth_header(admin_user),
                    json={'role': 'invalid_role'}
                )
                assert response.status_code == 400

    def test_get_current_user(self, client, mock_auth, admin_user):
        """Test getting current user profile"""
        with mock_g_user(admin_user):
            with patch('services.auth_service.User.query') as mock_query:
                mock_query.filter_by.return_value.first.return_value = admin_user

                response = client.get(
                    '/api/users/me',
                    headers=create_auth_header(admin_user)
                )
                assert response.status_code == 200
                data = response.get_json()
                assert data['email'] == admin_user.email


# ============================================================================
# INTEGRATION TESTS
# ============================================================================

class TestIntegration:

    @patch('services.google_sheets_service.fetch_survey_responses')
    def test_import_and_analyze_workflow(self, mock_fetch, client, mock_auth, admin_user):
        """Test the complete workflow: import -> analyze -> view results"""
        with mock_g_user(admin_user):
            with patch('services.auth_service.User.query') as mock_query:
                mock_query.filter_by.return_value.first.return_value = admin_user

                # Mock Google Sheets data
                mock_fetch.return_value = [
                    {
                        'session_id': 'INT001',
                        'session_date': '2024-01-15',
                        'facilitator_name': 'Test Facilitator',
                        'learned': 'I learned testing',
                        'apply': 'I will apply it',
                        'need_to_learn': 'More practice needed',
                        'comments': 'Great session',
                        'facilitator_understanding': '5',
                        'learning_mechanics': '4',
                        'qa_support': '5',
                        'problem_articulation': '4',
                        'session_pace': '4',
                        'tools_helpfulness': '5',
                        'repeatability': '5',
                        'learning_objectives': '4',
                        'overall_quality': '5'
                    }
                ]

                # Step 1: Import
                with patch.dict('os.environ', {'GOOGLE_SHEETS_SPREADSHEET_ID': 'test-sheet-id'}):
                    response = client.post(
                        '/api/sessions/import',
                        headers=create_auth_header(admin_user)
                    )
                    assert response.status_code == 200
