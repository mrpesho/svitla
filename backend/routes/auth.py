from flask import Blueprint, redirect, request, jsonify, session, current_app
from google_auth_oauthlib.flow import Flow
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from datetime import datetime, timedelta
from models import db, User, OAuthToken, File, AuthToken
from config import Config
import json
import secrets

auth_bp = Blueprint('auth', __name__)


def cleanup_expired_tokens():
    """Delete expired auth tokens from database."""
    try:
        expired = AuthToken.query.filter(AuthToken.expires_at < datetime.utcnow()).all()
        for token in expired:
            db.session.delete(token)
        db.session.commit()
        if expired:
            print(f"Cleaned up {len(expired)} expired auth tokens", flush=True)
    except Exception as e:
        print(f"Error cleaning up tokens: {e}", flush=True)
        db.session.rollback()

def get_google_flow():
    """Create Google OAuth flow."""
    client_config = {
        "web": {
            "client_id": Config.GOOGLE_CLIENT_ID,
            "client_secret": Config.GOOGLE_CLIENT_SECRET,
            "redirect_uris": [Config.GOOGLE_REDIRECT_URI],
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token"
        }
    }

    flow = Flow.from_client_config(
        client_config,
        scopes=Config.GOOGLE_SCOPES,
        redirect_uri=Config.GOOGLE_REDIRECT_URI
    )
    return flow


@auth_bp.route('/login')
def login():
    """Initiate Google OAuth flow."""
    # Clear any existing session to avoid cookie conflicts
    session.clear()

    flow = get_google_flow()

    # Always prompt for consent to ensure we get all required scopes
    # This prevents scope mismatch errors from cached authorizations
    authorization_url, state = flow.authorization_url(
        access_type='offline',
        include_granted_scopes='true',
        prompt='consent'
    )

    return jsonify({'auth_url': authorization_url})


@auth_bp.route('/callback')
def callback():
    """Handle Google OAuth callback."""
    print(f"Callback received - session keys before: {list(session.keys())}", flush=True)
    try:
        flow = get_google_flow()
        flow.fetch_token(authorization_response=request.url)

        credentials = flow.credentials

        # Verify we received all required scopes
        granted_scopes = set(credentials.scopes if hasattr(credentials, 'scopes') and credentials.scopes else [])
        required_scopes = set(Config.GOOGLE_SCOPES)

        print(f"Granted scopes: {granted_scopes}", flush=True)
        print(f"Required scopes: {required_scopes}", flush=True)

        if not required_scopes.issubset(granted_scopes):
            missing_scopes = required_scopes - granted_scopes
            print(f"Missing scopes: {missing_scopes}", flush=True)
            error_msg = "Please grant all required permissions including Google Drive access"
            return redirect(f"{Config.FRONTEND_URL}?auth=error&message={error_msg}")

        # Get user info from Google
        oauth2_service = build('oauth2', 'v2', credentials=credentials)
        user_info = oauth2_service.userinfo().get().execute()

        # IMPORTANT: Make a Drive API call immediately after auth to avoid 403
        drive_service = build('drive', 'v3', credentials=credentials)
        drive_service.files().list(pageSize=1).execute()

        # Find or create user
        user = User.query.filter_by(google_id=user_info['id']).first()

        if not user:
            user = User(
                email=user_info['email'],
                google_id=user_info['id'],
                name=user_info.get('name'),
                picture=user_info.get('picture')
            )
            db.session.add(user)
            db.session.flush()

        # Calculate token expiration
        expires_at = datetime.utcnow() + timedelta(seconds=credentials.expiry.timestamp() - datetime.utcnow().timestamp()) if credentials.expiry else None

        # Update or create OAuth token
        oauth_token = OAuthToken.query.filter_by(user_id=user.id).first()

        if oauth_token:
            oauth_token.access_token = credentials.token
            oauth_token.refresh_token = credentials.refresh_token or oauth_token.refresh_token
            oauth_token.expires_at = expires_at
        else:
            oauth_token = OAuthToken(
                user_id=user.id,
                access_token=credentials.token,
                refresh_token=credentials.refresh_token,
                expires_at=expires_at
            )
            db.session.add(oauth_token)

        db.session.commit()

        # Cleanup expired tokens
        cleanup_expired_tokens()

        # Generate a one-time token for the frontend to exchange
        token = secrets.token_urlsafe(32)
        auth_token = AuthToken(
            token=token,
            user_id=user.id,
            expires_at=datetime.utcnow() + timedelta(minutes=5)  # 5 minute expiry
        )
        db.session.add(auth_token)
        db.session.commit()
        print(f"OAuth callback - generated token for user_id: {user.id}", flush=True)

        # Redirect to frontend with token
        return redirect(f"{Config.FRONTEND_URL}?auth=success&token={token}")

    except Exception as e:
        current_app.logger.error(f"OAuth callback error: {str(e)}")
        return redirect(f"{Config.FRONTEND_URL}?auth=error&message={str(e)}")


@auth_bp.route('/exchange', methods=['POST'])
def exchange_token():
    """Exchange auth token for session."""
    data = request.get_json()
    token_str = data.get('token') if data else None

    print(f"Token exchange attempt - token present: {bool(token_str)}", flush=True)

    if not token_str:
        return jsonify({'error': 'No token provided'}), 401

    # Find token in database
    auth_token = AuthToken.query.filter_by(token=token_str).first()

    if not auth_token:
        print(f"Token not found in database", flush=True)
        return jsonify({'error': 'Invalid or expired token'}), 401

    if auth_token.is_expired():
        db.session.delete(auth_token)
        db.session.commit()
        print(f"Token expired", flush=True)
        return jsonify({'error': 'Token expired'}), 401

    user_id = auth_token.user_id

    # Delete token (one-time use)
    db.session.delete(auth_token)
    db.session.commit()

    # Set session
    session['user_id'] = user_id
    print(f"Token exchange success - set session user_id: {user_id}", flush=True)

    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    return jsonify({'authenticated': True, 'user': user.to_dict()})


@auth_bp.route('/me')
def get_current_user():
    """Get current authenticated user."""
    user_id = session.get('user_id')

    if not user_id:
        return jsonify({'error': 'Not authenticated'}), 401

    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    return jsonify(user.to_dict())


@auth_bp.route('/logout', methods=['POST'])
def logout():
    """Log out current user."""
    session.pop('user_id', None)
    return jsonify({'message': 'Logged out successfully'})


@auth_bp.route('/account', methods=['DELETE'])
def delete_account():
    """Delete current user's account and all associated data."""
    user_id = session.get('user_id')

    if not user_id:
        return jsonify({'error': 'Not authenticated'}), 401

    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    # Delete all user's files from storage
    import os
    files = File.query.filter_by(user_id=user_id).all()
    for file in files:
        if file.local_path and os.path.exists(file.local_path):
            os.remove(file.local_path)
        db.session.delete(file)

    # Delete OAuth token
    oauth_token = OAuthToken.query.filter_by(user_id=user_id).first()
    if oauth_token:
        db.session.delete(oauth_token)

    # Delete user
    db.session.delete(user)
    db.session.commit()

    # Clear session
    session.pop('user_id', None)

    return jsonify({'message': 'Account deleted successfully'})


@auth_bp.route('/status')
def auth_status():
    """Check authentication status."""
    user_id = session.get('user_id')
    print(f"Auth status check - user_id: {user_id}, session keys: {list(session.keys())}", flush=True)

    if not user_id:
        return jsonify({'authenticated': False})

    user = User.query.get(user_id)
    if not user:
        return jsonify({'authenticated': False})

    # Check if token is valid
    oauth_token = OAuthToken.query.filter_by(user_id=user_id).first()
    if not oauth_token:
        return jsonify({'authenticated': False})

    return jsonify({
        'authenticated': True,
        'user': user.to_dict()
    })


def get_valid_credentials(user_id):
    """Get valid Google credentials for a user, refreshing if needed."""
    oauth_token = OAuthToken.query.filter_by(user_id=user_id).first()

    if not oauth_token:
        return None

    credentials = Credentials(
        token=oauth_token.access_token,
        refresh_token=oauth_token.refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=Config.GOOGLE_CLIENT_ID,
        client_secret=Config.GOOGLE_CLIENT_SECRET
    )

    # Refresh token if expired
    if oauth_token.is_expired() and oauth_token.refresh_token:
        try:
            credentials.refresh(Request())

            # Update stored token
            oauth_token.access_token = credentials.token
            if credentials.expiry:
                oauth_token.expires_at = credentials.expiry
            db.session.commit()

        except Exception as e:
            current_app.logger.error(f"Token refresh error: {str(e)}")
            return None

    return credentials
