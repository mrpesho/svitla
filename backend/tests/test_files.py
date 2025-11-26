"""Tests for file management routes."""
import json
import os
import tempfile
from models import db, File, User


def test_list_files_not_authenticated(client):
    """Test listing files when not authenticated."""
    response = client.get('/api/files')
    assert response.status_code == 401
    data = json.loads(response.data)
    assert 'error' in data


def test_list_files_empty(client, auth_user):
    """Test listing files when user has no files."""
    with client.session_transaction() as session:
        session['user_id'] = auth_user.id

    response = client.get('/api/files')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert isinstance(data, list)
    assert len(data) == 0


def test_list_files_with_files(client, app, auth_user):
    """Test listing files when user has files."""
    with app.app_context():
        # Create a test file
        test_file = File(
            user_id=auth_user.id,
            name='test.pdf',
            mime_type='application/pdf',
            size=1024,
            google_drive_id='test-drive-id',
            local_path='/tmp/test.pdf'
        )
        db.session.add(test_file)
        db.session.commit()
        file_id = test_file.id

    with client.session_transaction() as session:
        session['user_id'] = auth_user.id

    response = client.get('/api/files')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert isinstance(data, list)
    assert len(data) == 1
    assert data[0]['name'] == 'test.pdf'
    assert data[0]['mime_type'] == 'application/pdf'

    # Cleanup
    with app.app_context():
        file_to_delete = db.session.get(File, file_id)
        if file_to_delete:
            db.session.delete(file_to_delete)
            db.session.commit()


def test_get_file_not_found(client, auth_user):
    """Test getting a file that doesn't exist."""
    with client.session_transaction() as session:
        session['user_id'] = auth_user.id

    response = client.get('/api/files/99999')
    assert response.status_code == 404
    data = json.loads(response.data)
    assert 'error' in data


def test_get_file_not_authenticated(client):
    """Test getting a file when not authenticated."""
    response = client.get('/api/files/1')
    assert response.status_code == 401


def test_delete_file_not_authenticated(client):
    """Test deleting a file when not authenticated."""
    response = client.delete('/api/files/1')
    assert response.status_code == 401


def test_delete_file_not_found(client, auth_user):
    """Test deleting a file that doesn't exist."""
    with client.session_transaction() as session:
        session['user_id'] = auth_user.id

    response = client.delete('/api/files/99999')
    assert response.status_code == 404
    data = json.loads(response.data)
    assert 'error' in data


def test_delete_file_success(client, app, auth_user):
    """Test successfully deleting a file."""
    # Create a temporary file
    fd, temp_path = tempfile.mkstemp()
    os.write(fd, b'test content')
    os.close(fd)

    with app.app_context():
        # Create a test file
        test_file = File(
            user_id=auth_user.id,
            name='test.pdf',
            mime_type='application/pdf',
            size=1024,
            google_drive_id='test-drive-id',
            local_path=temp_path
        )
        db.session.add(test_file)
        db.session.commit()
        file_id = test_file.id

    with client.session_transaction() as session:
        session['user_id'] = auth_user.id

    response = client.delete(f'/api/files/{file_id}')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert 'message' in data

    # Verify file was deleted from database
    with app.app_context():
        file_record = db.session.get(File, file_id)
        assert file_record is None

    # Verify file was deleted from disk
    assert not os.path.exists(temp_path)


def test_file_ownership(client, app, auth_user):
    """Test that users can only access their own files."""
    # Create another user
    with app.app_context():
        other_user = User(
            email='other@example.com',
            google_id='other-google-id',
            name='Other User',
            picture='https://example.com/other.jpg'
        )
        db.session.add(other_user)
        db.session.commit()
        other_user_id = other_user.id

        # Create a file for other user
        other_file = File(
            user_id=other_user_id,
            name='other.pdf',
            mime_type='application/pdf',
            size=2048,
            google_drive_id='other-drive-id',
            local_path='/tmp/other.pdf'
        )
        db.session.add(other_file)
        db.session.commit()
        other_file_id = other_file.id

    # Try to access other user's file
    with client.session_transaction() as session:
        session['user_id'] = auth_user.id

    response = client.get(f'/api/files/{other_file_id}')
    assert response.status_code == 404  # Should not be able to access

    # Cleanup
    with app.app_context():
        other_file = db.session.get(File, other_file_id)
        other_user = db.session.get(User, other_user_id)
        if other_file:
            db.session.delete(other_file)
        if other_user:
            db.session.delete(other_user)
        db.session.commit()
