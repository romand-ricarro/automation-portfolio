import pytest
import os
import sys
from unittest.mock import patch, MagicMock
from datetime import datetime
import uuid

# Add backend to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Set test environment before importing app
os.environ['TESTING'] = 'true'
os.environ['DATABASE_URL'] = 'sqlite:///:memory:'

from app import create_app
from models.database import db, User, Session, ActionItem, SessionRating, QuestionAnalysis, CommonIssue

@pytest.fixture
def app():
    """Create application for testing with in-memory SQLite database."""
    # Config for testing - override any .env settings
    test_config = {
        'TESTING': True,
        'SQLALCHEMY_DATABASE_URI': 'sqlite:///:memory:',
        'SQLALCHEMY_TRACK_MODIFICATIONS': False,
        'WTF_CSRF_ENABLED': False,
    }

    app = create_app(test_config)

    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()

@pytest.fixture
def client(app):
    """Test client for making requests."""
    return app.test_client()

@pytest.fixture
def runner(app):
    """CLI test runner."""
    return app.test_cli_runner()

@pytest.fixture
def admin_user(app):
    """Create an admin user for testing."""
    with app.app_context():
        user = User(
            id=uuid.uuid4(),
            email='admin@test.com',
            name='Admin User',
            role='admin',
            created_at=datetime.utcnow()
        )
        db.session.add(user)
        db.session.commit()
        db.session.refresh(user)
        return user

@pytest.fixture
def facilitator_user(app):
    """Create a facilitator user for testing."""
    with app.app_context():
        user = User(
            id=uuid.uuid4(),
            email='facilitator@test.com',
            name='Facilitator User',
            role='facilitator',
            created_at=datetime.utcnow()
        )
        db.session.add(user)
        db.session.commit()
        db.session.refresh(user)
        return user

@pytest.fixture
def viewer_user(app):
    """Create a viewer user for testing."""
    with app.app_context():
        user = User(
            id=uuid.uuid4(),
            email='viewer@test.com',
            name='Viewer User',
            role='viewer',
            created_at=datetime.utcnow()
        )
        db.session.add(user)
        db.session.commit()
        db.session.refresh(user)
        return user

@pytest.fixture
def sample_session(app, admin_user):
    """Create a sample session for testing."""
    with app.app_context():
        # Refresh admin_user in current session
        user = db.session.get(User, admin_user.id)
        session = Session(
            id=uuid.uuid4(),
            session_id='TEST001',
            session_name='Test Session',
            session_date=datetime.utcnow().date(),
            facilitator_name='Test Facilitator',
            num_responses=10,
            status='pending',
            created_by=user.id,
            created_at=datetime.utcnow()
        )
        db.session.add(session)
        db.session.commit()
        db.session.refresh(session)
        return session

@pytest.fixture
def sample_rating(app, sample_session):
    """Create a sample session rating for testing."""
    with app.app_context():
        # Refresh session in current context
        session = db.session.get(Session, sample_session.id)
        rating = SessionRating(
            id=uuid.uuid4(),
            session_id=session.id,
            overall_quality=4.5,
            repeatability=4.0,
            facilitator_understanding=4.2,
            content_quality=4.3,
            learning_mechanics=4.1,
            qa_support=4.0,
            problem_articulation=3.9,
            session_pace=4.4,
            tools_helpfulness=4.2,
            created_at=datetime.utcnow()
        )
        db.session.add(rating)
        db.session.commit()
        db.session.refresh(rating)
        return rating

@pytest.fixture
def sample_action_item(app, sample_session, admin_user):
    """Create a sample action item for testing."""
    with app.app_context():
        session = db.session.get(Session, sample_session.id)
        user = db.session.get(User, admin_user.id)
        action_item = ActionItem(
            id=uuid.uuid4(),
            session_id=session.id,
            issue='Test Issue',
            action='Test Action',
            priority='High',
            status='Open',
            person_in_charge='Test Person',
            created_by=user.id,
            created_at=datetime.utcnow()
        )
        db.session.add(action_item)
        db.session.commit()
        db.session.refresh(action_item)
        return action_item

@pytest.fixture
def mock_supabase_auth():
    """Mock Supabase authentication."""
    with patch('services.auth_service.supabase') as mock_supabase:
        mock_supabase.auth.get_user.return_value = MagicMock(
            user=MagicMock(
                id='test-user-id',
                email='admin@test.com',
                user_metadata={'name': 'Admin User', 'avatar_url': None}
            )
        )
        yield mock_supabase
