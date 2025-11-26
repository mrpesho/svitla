"""Test configuration and fixtures."""
import os
import pytest
import tempfile
from app import create_app
from models import db, User, OAuthToken, AuthToken, File


@pytest.fixture
def app():
    """Create and configure a test app instance."""
    # Create a temporary database file
    db_fd, db_path = tempfile.mkstemp()

    # Set test configuration
    os.environ['FLASK_ENV'] = 'test'
    os.environ['DATABASE_URL'] = f'sqlite:///{db_path}'
    os.environ['SECRET_KEY'] = 'test-secret-key'
    os.environ['GOOGLE_CLIENT_ID'] = 'test-client-id'
    os.environ['GOOGLE_CLIENT_SECRET'] = 'test-client-secret'
    os.environ['GOOGLE_REDIRECT_URI'] = 'http://localhost:5000/api/auth/callback'
    os.environ['FRONTEND_URL'] = 'http://localhost:5173'

    app = create_app()
    app.config.update({
        'TESTING': True,
        'SQLALCHEMY_DATABASE_URI': f'sqlite:///{db_path}',
    })

    with app.app_context():
        db.create_all()

    yield app

    # Cleanup
    os.close(db_fd)
    os.unlink(db_path)


@pytest.fixture
def client(app):
    """Create a test client."""
    return app.test_client()


@pytest.fixture
def runner(app):
    """Create a test CLI runner."""
    return app.test_cli_runner()


@pytest.fixture
def auth_user(app):
    """Create a test user with OAuth token."""
    with app.app_context():
        user = User(
            email='test@example.com',
            google_id='test-google-id',
            name='Test User',
            picture='https://example.com/pic.jpg'
        )
        db.session.add(user)
        db.session.commit()

        oauth_token = OAuthToken(
            user_id=user.id,
            access_token='test-access-token',
            refresh_token='test-refresh-token',
            expires_at=None
        )
        db.session.add(oauth_token)
        db.session.commit()

        yield user

        # Cleanup
        db.session.delete(oauth_token)
        db.session.delete(user)
        db.session.commit()
