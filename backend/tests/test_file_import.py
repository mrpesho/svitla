"""Tests for file import functionality."""
import json
import os
import tempfile
from unittest.mock import Mock, patch, MagicMock
from models import db, File
from io import BytesIO


def test_import_file_not_authenticated(client):
    """Test importing file when not authenticated."""
    response = client.post(
        '/api/files/import',
        data=json.dumps({'fileId': 'test-file-id'}),
        content_type='application/json'
    )
    assert response.status_code == 401
    data = json.loads(response.data)
    assert 'error' in data


def test_import_file_missing_file_id(client, auth_user):
    """Test importing file without fileId parameter."""
    with client.session_transaction() as session:
        session['user_id'] = auth_user.id

    response = client.post(
        '/api/files/import',
        data=json.dumps({}),
        content_type='application/json'
    )
    assert response.status_code == 400
    data = json.loads(response.data)
    assert 'fileId is required' in data['error']


@patch('routes.files.get_drive_service')
def test_import_file_invalid_credentials(mock_get_drive, client, auth_user):
    """Test importing file with invalid credentials."""
    mock_get_drive.return_value = None

    with client.session_transaction() as session:
        session['user_id'] = auth_user.id

    response = client.post(
        '/api/files/import',
        data=json.dumps({'fileId': 'test-file-id'}),
        content_type='application/json'
    )
    assert response.status_code == 401
    data = json.loads(response.data)
    assert 'credentials' in data['error'].lower()


@patch('routes.files.get_drive_service')
@patch('routes.files.MediaIoBaseDownload')
@patch('builtins.open', create=True)
@patch('os.path.getsize')
def test_import_file_success(mock_getsize, mock_open, mock_download, mock_get_drive, client, app, auth_user):
    """Test successfully importing a file from Google Drive."""
    # Setup mocks
    mock_drive_service = Mock()
    mock_get_drive.return_value = mock_drive_service

    # Mock Drive API file.get() response
    mock_file_metadata = {
        'id': 'test-drive-file-id',
        'name': 'test-document.pdf',
        'mimeType': 'application/pdf',
        'size': 1024
    }
    mock_drive_service.files().get().execute.return_value = mock_file_metadata

    # Mock file download
    mock_request = Mock()
    mock_drive_service.files().get_media.return_value = mock_request

    # Mock downloader
    mock_downloader = Mock()
    mock_downloader.next_chunk.side_effect = [
        (Mock(progress=lambda: 0.5), False),
        (Mock(progress=lambda: 1.0), True)
    ]
    mock_download.return_value = mock_downloader

    # Mock file operations
    mock_getsize.return_value = 1024
    mock_file_handle = MagicMock()
    mock_open.return_value.__enter__.return_value = mock_file_handle

    with client.session_transaction() as session:
        session['user_id'] = auth_user.id

    response = client.post(
        '/api/files/import',
        data=json.dumps({'fileId': 'test-drive-file-id'}),
        content_type='application/json'
    )

    assert response.status_code == 201
    data = json.loads(response.data)
    assert data['name'] == 'test-document.pdf'
    assert data['mime_type'] == 'application/pdf'
    assert data['google_drive_id'] == 'test-drive-file-id'

    # Verify file was added to database
    with app.app_context():
        imported_file = File.query.filter_by(google_drive_id='test-drive-file-id').first()
        assert imported_file is not None
        assert imported_file.user_id == auth_user.id


@patch('routes.files.get_drive_service')
def test_import_file_already_exists(mock_get_drive, client, app, auth_user):
    """Test importing a file that already exists (without overwrite)."""
    # Create existing file
    with app.app_context():
        existing_file = File(
            user_id=auth_user.id,
            name='existing.pdf',
            mime_type='application/pdf',
            size=1024,
            google_drive_id='existing-drive-id',
            local_path='/tmp/existing.pdf'
        )
        db.session.add(existing_file)
        db.session.commit()

    # Setup mocks
    mock_drive_service = Mock()
    mock_get_drive.return_value = mock_drive_service

    mock_file_metadata = {
        'id': 'existing-drive-id',
        'name': 'existing.pdf',
        'mimeType': 'application/pdf',
        'size': 1024
    }
    mock_drive_service.files().get().execute.return_value = mock_file_metadata

    with client.session_transaction() as session:
        session['user_id'] = auth_user.id

    response = client.post(
        '/api/files/import',
        data=json.dumps({'fileId': 'existing-drive-id', 'overwrite': False}),
        content_type='application/json'
    )

    assert response.status_code == 409
    data = json.loads(response.data)
    assert 'already imported' in data['error']
    assert 'file' in data


@patch('routes.files.get_drive_service')
@patch('routes.files.MediaIoBaseDownload')
@patch('builtins.open', create=True)
@patch('os.path.getsize')
@patch('os.path.exists')
@patch('os.remove')
def test_import_file_with_overwrite(mock_remove, mock_exists, mock_getsize, mock_open,
                                     mock_download, mock_get_drive, client, app, auth_user):
    """Test importing a file with overwrite=true."""
    # Create existing file
    with app.app_context():
        existing_file = File(
            user_id=auth_user.id,
            name='overwrite-test.pdf',
            mime_type='application/pdf',
            size=1024,
            google_drive_id='overwrite-drive-id',
            local_path='/tmp/old-file.pdf'
        )
        db.session.add(existing_file)
        db.session.commit()
        existing_id = existing_file.id

    # Setup mocks
    mock_drive_service = Mock()
    mock_get_drive.return_value = mock_drive_service

    mock_file_metadata = {
        'id': 'overwrite-drive-id',
        'name': 'overwrite-test.pdf',
        'mimeType': 'application/pdf',
        'size': 2048
    }
    mock_drive_service.files().get().execute.return_value = mock_file_metadata

    mock_request = Mock()
    mock_drive_service.files().get_media.return_value = mock_request

    mock_downloader = Mock()
    mock_downloader.next_chunk.side_effect = [(Mock(), False), (Mock(), True)]
    mock_download.return_value = mock_downloader

    mock_exists.return_value = True
    mock_getsize.return_value = 2048
    mock_file_handle = MagicMock()
    mock_open.return_value.__enter__.return_value = mock_file_handle

    with client.session_transaction() as session:
        session['user_id'] = auth_user.id

    response = client.post(
        '/api/files/import',
        data=json.dumps({'fileId': 'overwrite-drive-id', 'overwrite': True}),
        content_type='application/json'
    )

    assert response.status_code == 201
    data = json.loads(response.data)
    assert data['name'] == 'overwrite-test.pdf'

    # Verify old file was removed
    mock_remove.assert_called_once_with('/tmp/old-file.pdf')

    # Verify database record was replaced
    with app.app_context():
        old_file = db.session.get(File, existing_id)
        assert old_file is None  # Old record deleted


@patch('routes.files.get_drive_service')
@patch('routes.files.MediaIoBaseDownload')
@patch('builtins.open', create=True)
@patch('os.path.getsize')
def test_import_google_doc_as_pdf(mock_getsize, mock_open, mock_download, mock_get_drive,
                                   client, app, auth_user):
    """Test importing a Google Doc (exported as PDF)."""
    # Setup mocks
    mock_drive_service = Mock()
    mock_get_drive.return_value = mock_drive_service

    # Mock Google Doc metadata
    mock_file_metadata = {
        'id': 'google-doc-id',
        'name': 'My Document',
        'mimeType': 'application/vnd.google-apps.document',
        'size': None  # Google Docs don't have size until exported
    }
    mock_drive_service.files().get().execute.return_value = mock_file_metadata

    # Mock export_media for Google Doc
    mock_request = Mock()
    mock_drive_service.files().export_media.return_value = mock_request

    mock_downloader = Mock()
    mock_downloader.next_chunk.side_effect = [(Mock(), False), (Mock(), True)]
    mock_download.return_value = mock_downloader

    mock_getsize.return_value = 5000
    mock_file_handle = MagicMock()
    mock_open.return_value.__enter__.return_value = mock_file_handle

    with client.session_transaction() as session:
        session['user_id'] = auth_user.id

    response = client.post(
        '/api/files/import',
        data=json.dumps({'fileId': 'google-doc-id'}),
        content_type='application/json'
    )

    assert response.status_code == 201
    data = json.loads(response.data)
    assert data['name'] == 'My Document.pdf'
    assert data['mime_type'] == 'application/pdf'

    # Verify export_media was called with correct mime type
    mock_drive_service.files().export_media.assert_called_once_with(
        fileId='google-doc-id',
        mimeType='application/pdf'
    )


@patch('routes.files.get_drive_service')
@patch('routes.files.MediaIoBaseDownload')
@patch('builtins.open', create=True)
@patch('os.path.getsize')
def test_import_google_sheet_as_xlsx(mock_getsize, mock_open, mock_download, mock_get_drive,
                                      client, app, auth_user):
    """Test importing a Google Sheet (exported as XLSX)."""
    mock_drive_service = Mock()
    mock_get_drive.return_value = mock_drive_service

    mock_file_metadata = {
        'id': 'google-sheet-id',
        'name': 'My Spreadsheet',
        'mimeType': 'application/vnd.google-apps.spreadsheet'
    }
    mock_drive_service.files().get().execute.return_value = mock_file_metadata

    mock_request = Mock()
    mock_drive_service.files().export_media.return_value = mock_request

    mock_downloader = Mock()
    mock_downloader.next_chunk.side_effect = [(Mock(), False), (Mock(), True)]
    mock_download.return_value = mock_downloader

    mock_getsize.return_value = 3000
    mock_file_handle = MagicMock()
    mock_open.return_value.__enter__.return_value = mock_file_handle

    with client.session_transaction() as session:
        session['user_id'] = auth_user.id

    response = client.post(
        '/api/files/import',
        data=json.dumps({'fileId': 'google-sheet-id'}),
        content_type='application/json'
    )

    assert response.status_code == 201
    data = json.loads(response.data)
    assert data['name'] == 'My Spreadsheet.xlsx'
    assert data['mime_type'] == 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

    # Verify export_media was called with correct mime type
    mock_drive_service.files().export_media.assert_called_once_with(
        fileId='google-sheet-id',
        mimeType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )


@patch('routes.files.get_drive_service')
def test_import_unsupported_google_workspace_file(mock_get_drive, client, auth_user):
    """Test importing an unsupported Google Workspace file type."""
    mock_drive_service = Mock()
    mock_get_drive.return_value = mock_drive_service

    # Mock an unsupported type (e.g., Google Form)
    mock_file_metadata = {
        'id': 'google-form-id',
        'name': 'My Form',
        'mimeType': 'application/vnd.google-apps.form'
    }
    mock_drive_service.files().get().execute.return_value = mock_file_metadata

    with client.session_transaction() as session:
        session['user_id'] = auth_user.id

    response = client.post(
        '/api/files/import',
        data=json.dumps({'fileId': 'google-form-id'}),
        content_type='application/json'
    )

    assert response.status_code == 400
    data = json.loads(response.data)
    assert 'not supported' in data['error']


@patch('routes.files.get_drive_service')
def test_import_file_drive_api_error(mock_get_drive, client, auth_user):
    """Test handling of Google Drive API errors during import."""
    mock_drive_service = Mock()
    mock_get_drive.return_value = mock_drive_service

    # Simulate Drive API error
    mock_drive_service.files().get().execute.side_effect = Exception('Drive API error')

    with client.session_transaction() as session:
        session['user_id'] = auth_user.id

    response = client.post(
        '/api/files/import',
        data=json.dumps({'fileId': 'error-file-id'}),
        content_type='application/json'
    )

    assert response.status_code == 500
    data = json.loads(response.data)
    assert 'error' in data
