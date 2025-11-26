"""Tests for authentication routes."""
import json
from datetime import datetime, timedelta, UTC
from models import db, User, AuthToken, OAuthToken


def test_auth_status_not_authenticated(client):
    """Test auth status endpoint when not authenticated."""
    response = client.get('/api/auth/status')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['authenticated'] is False


def test_auth_status_authenticated(client, app, auth_user):
    """Test auth status endpoint when authenticated."""
    with client.session_transaction() as session:
        session['user_id'] = auth_user.id

    response = client.get('/api/auth/status')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['authenticated'] is True
    assert data['user']['email'] == 'test@example.com'


def test_get_current_user_not_authenticated(client):
    """Test getting current user when not authenticated."""
    response = client.get('/api/auth/me')
    assert response.status_code == 401
    data = json.loads(response.data)
    assert 'error' in data


def test_get_current_user_authenticated(client, auth_user):
    """Test getting current user when authenticated."""
    with client.session_transaction() as session:
        session['user_id'] = auth_user.id

    response = client.get('/api/auth/me')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['email'] == 'test@example.com'
    assert data['name'] == 'Test User'


def test_logout(client, auth_user):
    """Test logout endpoint."""
    with client.session_transaction() as session:
        session['user_id'] = auth_user.id

    response = client.post('/api/auth/logout')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert 'message' in data


def test_token_exchange_invalid_token(client):
    """Test token exchange with invalid token."""
    response = client.post(
        '/api/auth/exchange',
        data=json.dumps({'token': 'invalid-token'}),
        content_type='application/json'
    )
    assert response.status_code == 401
    data = json.loads(response.data)
    assert 'error' in data


def test_token_exchange_valid_token(client, app, auth_user):
    """Test token exchange with valid token."""
    with app.app_context():
        # Create a valid auth token
        token = AuthToken(
            token='valid-test-token',
            user_id=auth_user.id,
            expires_at=datetime.now(UTC) + timedelta(minutes=5)
        )
        db.session.add(token)
        db.session.commit()

    response = client.post(
        '/api/auth/exchange',
        data=json.dumps({'token': 'valid-test-token'}),
        content_type='application/json'
    )
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['authenticated'] is True
    assert data['user']['email'] == 'test@example.com'


def test_token_exchange_expired_token(client, app, auth_user):
    """Test token exchange with expired token."""
    with app.app_context():
        # Create an expired auth token
        token = AuthToken(
            token='expired-test-token',
            user_id=auth_user.id,
            expires_at=datetime.now(UTC) - timedelta(minutes=5)
        )
        db.session.add(token)
        db.session.commit()

    response = client.post(
        '/api/auth/exchange',
        data=json.dumps({'token': 'expired-test-token'}),
        content_type='application/json'
    )
    assert response.status_code == 401
    data = json.loads(response.data)
    assert 'error' in data
    assert 'expired' in data['error'].lower()


def test_delete_account(client, app, auth_user):
    """Test account deletion."""
    with client.session_transaction() as session:
        session['user_id'] = auth_user.id

    response = client.delete('/api/auth/account')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert 'message' in data

    # Verify user was deleted
    with app.app_context():
        user = db.session.get(User, auth_user.id)
        assert user is None


def test_delete_account_not_authenticated(client):
    """Test account deletion when not authenticated."""
    response = client.delete('/api/auth/account')
    assert response.status_code == 401
    data = json.loads(response.data)
    assert 'error' in data
