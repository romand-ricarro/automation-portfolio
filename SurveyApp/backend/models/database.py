from datetime import datetime
import uuid
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import text

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("uuid_generate_v4()"))
    email = db.Column(db.String(255), unique=True, nullable=False)
    name = db.Column(db.String(255))
    profile_picture_url = db.Column(db.Text)
    role = db.Column(db.String(50), nullable=False) # 'admin', 'facilitator', 'viewer'
    last_login_at = db.Column(db.DateTime)
    is_active = db.Column(db.Boolean, default=True)
    deleted_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': str(self.id),
            'email': self.email,
            'name': self.name,
            'profile_picture_url': self.profile_picture_url,
            'role': self.role,
            'last_login_at': self.last_login_at.isoformat() if self.last_login_at else None,
            'is_active': self.is_active,
            'deleted_at': self.deleted_at.isoformat() if self.deleted_at else None,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

class Session(db.Model):
    __tablename__ = 'sessions'

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("uuid_generate_v4()"))
    session_id = db.Column(db.String(100), unique=True, nullable=False) # The concise ID e.g. "GBLr335E"
    session_name = db.Column(db.String(255))
    session_date = db.Column(db.Date, nullable=False)
    facilitator_name = db.Column(db.String(255))
    num_responses = db.Column(db.Integer)
    status = db.Column(db.String(50), default='pending')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_by = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id'))
    analyzed_at = db.Column(db.DateTime)  # Timestamp of last AI analysis

    # Relationships
    creator = db.relationship('User', backref='created_sessions')
    analyses = db.relationship('QuestionAnalysis', backref='session', cascade='all, delete-orphan')
    common_issues = db.relationship('CommonIssue', backref='session', cascade='all, delete-orphan')
    action_items = db.relationship('ActionItem', backref='session', cascade='all, delete-orphan')
    ratings = db.relationship('SessionRating', backref='session', uselist=False, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': str(self.id),
            'session_id': self.session_id,
            'session_name': self.session_name,
            'session_date': self.session_date.isoformat() if self.session_date else None,
            'facilitator_name': self.facilitator_name,
            'num_responses': self.num_responses,
            'status': self.status,
            'created_at': self.created_at.isoformat(),
            'created_by': str(self.created_by) if self.created_by else None,
            'ratings': self.ratings.to_dict() if self.ratings else None,
            'common_issues': [ci.to_dict() for ci in self.common_issues],
            'analyzed_at': self.analyzed_at.isoformat() if self.analyzed_at else None
        }

class QuestionAnalysis(db.Model):
    __tablename__ = 'question_analyses'

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("uuid_generate_v4()"))
    session_id = db.Column(UUID(as_uuid=True), db.ForeignKey('sessions.id', ondelete='CASCADE'))
    question_label = db.Column(db.String(100), nullable=False)
    question_text = db.Column(db.Text, nullable=False)
    analysis_text = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': str(self.id),
            'session_id': str(self.session_id),
            'question_label': self.question_label,
            'question_text': self.question_text,
            'analysis_text': self.analysis_text,
            'created_at': self.created_at.isoformat()
        }

class CommonIssue(db.Model):
    __tablename__ = 'common_issues'

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("uuid_generate_v4()"))
    session_id = db.Column(UUID(as_uuid=True), db.ForeignKey('sessions.id', ondelete='CASCADE'))
    common_issue = db.Column(db.Text, nullable=False)
    evidence_signal = db.Column(db.Text, nullable=False)
    display_order = db.Column(db.Integer)
    status = db.Column(db.String(20), default='pending')  # 'pending', 'acknowledged'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': str(self.id),
            'session_id': str(self.session_id),
            'common_issue': self.common_issue,
            'evidence_signal': self.evidence_signal,
            'display_order': self.display_order,
            'status': self.status or 'pending',
            'created_at': self.created_at.isoformat()
        }

class ActionItem(db.Model):
    __tablename__ = 'action_items'

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("uuid_generate_v4()"))
    session_id = db.Column(UUID(as_uuid=True), db.ForeignKey('sessions.id', ondelete='CASCADE'))
    issue = db.Column(db.Text, nullable=False)
    action = db.Column(db.Text, nullable=False)
    priority = db.Column(db.String(20)) # 'High', 'Medium', 'Low'
    person_in_charge = db.Column(db.String(255))
    deadline = db.Column(db.Date)
    status = db.Column(db.String(50), default='Open') # 'Open', 'In Progress', 'Completed', 'On Hold'
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_by = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id'))
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_by = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id'))
    approved_at = db.Column(db.DateTime)  # NULL = not yet approved
    approved_by = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id'))

    creator = db.relationship('User', foreign_keys=[created_by])
    updater = db.relationship('User', foreign_keys=[updated_by])
    approver = db.relationship('User', foreign_keys=[approved_by])

    def to_dict(self):
        return {
            'id': str(self.id),
            'session_id': str(self.session_id),
            'issue': self.issue,
            'action': self.action,
            'priority': self.priority,
            'person_in_charge': self.person_in_charge,
            'deadline': self.deadline.isoformat() if self.deadline else None,
            'status': self.status,
            'notes': self.notes,
            'created_at': self.created_at.isoformat(),
            'created_by': str(self.created_by) if self.created_by else None,
            'updated_at': self.updated_at.isoformat(),
            'updated_by': str(self.updated_by) if self.updated_by else None,
            'approved_at': self.approved_at.isoformat() if self.approved_at else None,
            'approved_by': str(self.approved_by) if self.approved_by else None,
            'approver_name': self.approver.name if self.approver else None
        }

class SessionRating(db.Model):
    __tablename__ = 'session_ratings'

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("uuid_generate_v4()"))
    session_id = db.Column(UUID(as_uuid=True), db.ForeignKey('sessions.id', ondelete='CASCADE'))
    facilitator_understanding = db.Column(db.Numeric(3,2))
    learning_mechanics = db.Column(db.Numeric(3,2))
    qa_support = db.Column(db.Numeric(3,2))
    problem_articulation = db.Column(db.Numeric(3,2))
    session_pace = db.Column(db.Numeric(3,2))
    tools_helpfulness = db.Column(db.Numeric(3,2))
    repeatability = db.Column(db.Numeric(3,2))
    learning_objectives = db.Column(db.Numeric(3,2))
    overall_quality = db.Column(db.Numeric(3,2))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': str(self.id),
            'session_id': str(self.session_id),
            'facilitator_understanding': float(self.facilitator_understanding) if self.facilitator_understanding else None,
            'learning_mechanics': float(self.learning_mechanics) if self.learning_mechanics else None,
            'qa_support': float(self.qa_support) if self.qa_support else None,
            'problem_articulation': float(self.problem_articulation) if self.problem_articulation else None,
            'session_pace': float(self.session_pace) if self.session_pace else None,
            'tools_helpfulness': float(self.tools_helpfulness) if self.tools_helpfulness else None,
            'repeatability': float(self.repeatability) if self.repeatability else None,
            'learning_objectives': float(self.learning_objectives) if self.learning_objectives else None,
            'overall_quality': float(self.overall_quality) if self.overall_quality else None,
            'created_at': self.created_at.isoformat()
        }


class AnalysisCache(db.Model):
    """Cache for AI analysis results to avoid redundant API calls."""
    __tablename__ = 'analysis_cache'

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("uuid_generate_v4()"))
    session_id = db.Column(UUID(as_uuid=True), db.ForeignKey('sessions.id', ondelete='CASCADE'), nullable=False)
    input_hash = db.Column(db.String(64), nullable=False, index=True)  # SHA-256 hash of input data
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime, nullable=False)

    # Relationship
    session = db.relationship('Session', backref=db.backref('analysis_cache', uselist=False, cascade='all, delete-orphan'))

    def to_dict(self):
        return {
            'id': str(self.id),
            'session_id': str(self.session_id),
            'input_hash': self.input_hash,
            'created_at': self.created_at.isoformat(),
            'expires_at': self.expires_at.isoformat(),
            'is_valid': self.expires_at > datetime.utcnow()
        }


class PromptTemplate(db.Model):
    """Customizable AI prompt templates."""
    __tablename__ = 'prompt_templates'

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("uuid_generate_v4()"))
    name = db.Column(db.String(100), nullable=False)
    slug = db.Column(db.String(50), unique=True, nullable=False, index=True)  # e.g., "question_analysis"
    template_content = db.Column(db.Text, nullable=False)
    version = db.Column(db.Integer, default=1, nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_by = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    creator = db.relationship('User', backref='created_prompts')
    versions = db.relationship('PromptTemplateVersion', backref='template', cascade='all, delete-orphan',
                               order_by='desc(PromptTemplateVersion.version)')

    def to_dict(self, include_versions=False):
        result = {
            'id': str(self.id),
            'name': self.name,
            'slug': self.slug,
            'template_content': self.template_content,
            'version': self.version,
            'is_active': self.is_active,
            'created_by': str(self.created_by) if self.created_by else None,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
        if include_versions:
            result['versions'] = [v.to_dict() for v in self.versions]
        return result


class PromptTemplateVersion(db.Model):
    """Version history for prompt templates."""
    __tablename__ = 'prompt_template_versions'

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("uuid_generate_v4()"))
    template_id = db.Column(UUID(as_uuid=True), db.ForeignKey('prompt_templates.id', ondelete='CASCADE'), nullable=False)
    version = db.Column(db.Integer, nullable=False)
    template_content = db.Column(db.Text, nullable=False)
    created_by = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    change_note = db.Column(db.String(500))

    # Relationships
    creator = db.relationship('User', backref='prompt_versions')

    def to_dict(self):
        return {
            'id': str(self.id),
            'template_id': str(self.template_id),
            'version': self.version,
            'template_content': self.template_content,
            'created_by': str(self.created_by) if self.created_by else None,
            'created_at': self.created_at.isoformat(),
            'change_note': self.change_note,
        }


class NotificationPreference(db.Model):
    """User notification preferences."""
    __tablename__ = 'notification_preferences'

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("uuid_generate_v4()"))
    user_id = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True)
    analysis_complete = db.Column(db.Boolean, default=True, nullable=False)
    action_item_assigned = db.Column(db.Boolean, default=True, nullable=False)
    action_item_reminder = db.Column(db.Boolean, default=True, nullable=False)
    weekly_digest = db.Column(db.Boolean, default=True, nullable=False)
    email_override = db.Column(db.String(255))  # Optional different email
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship
    user = db.relationship('User', backref=db.backref('notification_preferences', uselist=False, cascade='all, delete-orphan'))

    def to_dict(self):
        return {
            'id': str(self.id),
            'user_id': str(self.user_id),
            'analysis_complete': self.analysis_complete,
            'action_item_assigned': self.action_item_assigned,
            'action_item_reminder': self.action_item_reminder,
            'weekly_digest': self.weekly_digest,
            'email_override': self.email_override,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
