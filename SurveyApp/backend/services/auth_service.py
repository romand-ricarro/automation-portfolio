import os
from datetime import datetime
from functools import wraps
from flask import request, jsonify, g
from supabase import create_client, Client
from models.database import User, db

# Initialize Supabase client
url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SERVICE_KEY")
supabase: Client = create_client(url, key)

def get_token_from_header():
    """Get JWT token from Authorization header."""
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        return None
    try:
        return auth_header.split(" ")[1]
    except IndexError:
        return None


def get_token_from_query():
    """Get JWT token from query parameter (for SSE connections)."""
    return request.args.get('token')

def require_auth(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Skip auth for CORS preflight requests
        if request.method == 'OPTIONS':
            return '', 204

        # Try header first, then query param (for SSE connections)
        token = get_token_from_header() or get_token_from_query()
        if not token:
            print("DEBUG: Missing authorization token in header")
            return jsonify({'error': 'Missing authorization token'}), 401
            
        try:
            # Verify token with Supabase
            print(f"DEBUG AUTH: Attempting to verify token (first 10 chars): {token[:10]}...")
            user_data = supabase.auth.get_user(token)
            
            if not user_data or not user_data.user:
                print(f"DEBUG AUTH: Verification failed. response: {user_data}")
                return jsonify({'error': 'Invalid token - retrieval failed'}), 401
            
            print(f"DEBUG AUTH: Token verified for email: {user_data.user.email}")
                
            # Get user email and name from Supabase metadata
            email = user_data.user.email
            supabase_name = None
            if user_data.user.user_metadata:
                supabase_name = user_data.user.user_metadata.get('full_name') or user_data.user.user_metadata.get('name')

            # Check if user exists in our DB
            user = User.query.filter_by(email=email).first()
            if not user:
                # Check if this is the very first user (bootstrap admin)
                is_first_user = User.query.count() == 0
                if is_first_user:
                    # Auto-create first user as admin (bootstrap)
                    print(f"DEBUG: First user detected, creating admin for {email}")
                    user = User(
                        email=email,
                        name=supabase_name,
                        role='admin',
                        is_active=True
                    )
                    db.session.add(user)
                    db.session.commit()
                    print("DEBUG: Bootstrap admin created successfully")
                else:
                    # User not pre-registered - reject access
                    print(f"DEBUG AUTH: User not registered in system: {email}")
                    return jsonify({'error': 'Access denied. Your account has not been registered. Please contact an administrator to request access.'}), 403
            else:
                print(f"DEBUG: User found in DB: {user.id}, is_active={user.is_active}, deleted_at={user.deleted_at}")

            # Check if user account is disabled or deleted
            if user.deleted_at:
                print(f"DEBUG AUTH: User account has been deleted: {email}")
                return jsonify({'error': 'Account has been deleted'}), 403

            if user.is_active is False:  # Explicitly check for False, not None
                print(f"DEBUG AUTH: User account is disabled: {email}")
                return jsonify({'error': 'Account is disabled'}), 403

            # Auto-populate name from Supabase if not already set
            if not user.name and supabase_name:
                user.name = supabase_name

            # Update last login timestamp
            user.last_login_at = datetime.utcnow()
            db.session.commit()

            # Store current user in g for access in routes
            g.user = user

            return f(*args, **kwargs)
            
        except Exception as e:
            print(f"DEBUG AUTH ERROR: {str(e)}")
            import traceback
            traceback.print_exc()
            return jsonify({'error': f'Authentication check failed: {str(e)}'}), 401
            
    return decorated_function

def require_role(role):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):

            if not getattr(g, 'user', None):
                return jsonify({'error': 'User not authenticated'}), 401

            if g.user.role != role and g.user.role != 'admin': # Admin can do everything
                 return jsonify({'error': 'Insufficient permissions'}), 403

            return f(*args, **kwargs)
        return decorated_function
    return decorator


# RBAC Helper Functions

def can_access_session(user, session):
    """
    Check if user can access a session.
    - Admin: can access all sessions
    - Viewer: can access all sessions (read-only)
    - Facilitator: can only access sessions where facilitator_name matches their name
    """
    if user.role in ('admin', 'viewer'):
        return True
    # Facilitator can only access own sessions
    return session.facilitator_name == user.name


def is_session_owner(user, session):
    """
    Check if user is the owner/facilitator of a session.
    Used for write operations (edit, analyze, create action items).
    """
    if user.role == 'admin':
        return True
    return session.facilitator_name == user.name


def can_modify_action_item(user, action_item):
    """
    Check if user can modify an action item.
    - Admin: can modify all
    - Facilitator: can modify items from sessions they own
    - Viewer: cannot modify any
    """
    if user.role == 'admin':
        return True
    if user.role == 'viewer':
        return False
    # Facilitator: check if they own the session
    from models.database import Session
    session = Session.query.get(str(action_item.session_id))
    if not session:
        return False
    return session.facilitator_name == user.name
