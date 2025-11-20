import os
import io
from flask import Blueprint, request, jsonify, session, send_file, current_app
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload
from models import db, File
from routes.auth import get_valid_credentials
from config import Config

files_bp = Blueprint('files', __name__)


def get_drive_service(user_id):
    """Get Google Drive service for a user."""
    credentials = get_valid_credentials(user_id)
    if not credentials:
        return None
    return build('drive', 'v3', credentials=credentials)


@files_bp.route('', methods=['GET'])
def list_files():
    """List all files in the user's dataroom."""
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'Not authenticated'}), 401

    files = File.query.filter_by(user_id=user_id).order_by(File.created_at.desc()).all()
    return jsonify([f.to_dict() for f in files])


@files_bp.route('/drive', methods=['GET'])
def list_drive_files():
    """List files from user's Google Drive."""
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'Not authenticated'}), 401

    drive_service = get_drive_service(user_id)
    if not drive_service:
        return jsonify({'error': 'Invalid or expired credentials'}), 401

    try:
        # Get query parameters
        page_token = request.args.get('pageToken')
        folder_id = request.args.get('folderId', 'root')

        # Build query - only files in specified folder
        query = f"'{folder_id}' in parents and trashed = false"

        results = drive_service.files().list(
            q=query,
            pageSize=50,
            pageToken=page_token,
            fields="nextPageToken, files(id, name, mimeType, size, modifiedTime, iconLink, thumbnailLink)",
            orderBy="folder,name"
        ).execute()

        files = results.get('files', [])
        next_page_token = results.get('nextPageToken')

        return jsonify({
            'files': files,
            'nextPageToken': next_page_token
        })

    except Exception as e:
        current_app.logger.error(f"Drive list error: {str(e)}")
        return jsonify({'error': str(e)}), 500


@files_bp.route('/import', methods=['POST'])
def import_file():
    """Import a file from Google Drive to the dataroom."""
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'Not authenticated'}), 401

    data = request.json
    if not data or 'fileId' not in data:
        return jsonify({'error': 'fileId is required'}), 400

    drive_service = get_drive_service(user_id)
    if not drive_service:
        return jsonify({'error': 'Invalid or expired credentials'}), 401

    try:
        file_id = data['fileId']
        overwrite = data.get('overwrite', False)

        # Get file metadata from Drive
        file_metadata = drive_service.files().get(
            fileId=file_id,
            fields='id, name, mimeType, size'
        ).execute()

        # Check if already imported
        existing = File.query.filter_by(
            user_id=user_id,
            google_drive_id=file_id
        ).first()

        if existing and not overwrite:
            return jsonify({'error': 'File already imported', 'file': existing.to_dict()}), 409

        # Delete existing file if overwriting
        if existing:
            if os.path.exists(existing.local_path):
                os.remove(existing.local_path)
            db.session.delete(existing)

        # Handle Google Docs/Sheets/Slides (export them)
        mime_type = file_metadata.get('mimeType', '')
        export_mime_type = None
        file_extension = ''

        if mime_type == 'application/vnd.google-apps.document':
            export_mime_type = 'application/pdf'
            file_extension = '.pdf'
        elif mime_type == 'application/vnd.google-apps.spreadsheet':
            export_mime_type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            file_extension = '.xlsx'
        elif mime_type == 'application/vnd.google-apps.presentation':
            export_mime_type = 'application/pdf'
            file_extension = '.pdf'
        elif mime_type.startswith('application/vnd.google-apps'):
            return jsonify({'error': 'This Google Workspace file type is not supported'}), 400

        # Download file content
        if export_mime_type:
            request_file = drive_service.files().export_media(
                fileId=file_id,
                mimeType=export_mime_type
            )
            final_mime_type = export_mime_type
        else:
            request_file = drive_service.files().get_media(fileId=file_id)
            final_mime_type = mime_type

        file_content = io.BytesIO()
        downloader = MediaIoBaseDownload(file_content, request_file)

        done = False
        while not done:
            status, done = downloader.next_chunk()

        # Save to disk
        file_name = file_metadata['name']
        if file_extension and not file_name.endswith(file_extension):
            file_name += file_extension

        # Create unique filename
        safe_filename = "".join(c for c in file_name if c.isalnum() or c in '._- ')
        local_filename = f"{user_id}_{file_id}_{safe_filename}"
        local_path = os.path.join(Config.UPLOAD_FOLDER, local_filename)

        with open(local_path, 'wb') as f:
            f.write(file_content.getvalue())

        # Get actual file size
        file_size = os.path.getsize(local_path)

        # Create database record
        new_file = File(
            user_id=user_id,
            name=file_name,
            mime_type=final_mime_type,
            size=file_size,
            google_drive_id=file_id,
            local_path=local_path
        )
        db.session.add(new_file)
        db.session.commit()

        return jsonify(new_file.to_dict()), 201

    except Exception as e:
        current_app.logger.error(f"Import error: {str(e)}")
        return jsonify({'error': str(e)}), 500


@files_bp.route('/<int:file_id>', methods=['GET'])
def get_file(file_id):
    """Get file metadata."""
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'Not authenticated'}), 401

    file = File.query.filter_by(id=file_id, user_id=user_id).first()
    if not file:
        return jsonify({'error': 'File not found'}), 404

    return jsonify(file.to_dict())


@files_bp.route('/<int:file_id>/view', methods=['GET'])
def view_file(file_id):
    """View/download a file."""
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'Not authenticated'}), 401

    file = File.query.filter_by(id=file_id, user_id=user_id).first()
    if not file:
        return jsonify({'error': 'File not found'}), 404

    if not os.path.exists(file.local_path):
        return jsonify({'error': 'File not found on disk'}), 404

    return send_file(
        file.local_path,
        mimetype=file.mime_type,
        as_attachment=False,
        download_name=file.name
    )


@files_bp.route('/<int:file_id>/download', methods=['GET'])
def download_file(file_id):
    """Download a file as attachment."""
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'Not authenticated'}), 401

    file = File.query.filter_by(id=file_id, user_id=user_id).first()
    if not file:
        return jsonify({'error': 'File not found'}), 404

    if not os.path.exists(file.local_path):
        return jsonify({'error': 'File not found on disk'}), 404

    return send_file(
        file.local_path,
        mimetype=file.mime_type,
        as_attachment=True,
        download_name=file.name
    )


@files_bp.route('/<int:file_id>', methods=['DELETE'])
def delete_file(file_id):
    """Delete a file from the dataroom."""
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'Not authenticated'}), 401

    file = File.query.filter_by(id=file_id, user_id=user_id).first()
    if not file:
        return jsonify({'error': 'File not found'}), 404

    # Delete from disk
    if os.path.exists(file.local_path):
        os.remove(file.local_path)

    # Delete from database
    db.session.delete(file)
    db.session.commit()

    return jsonify({'message': 'File deleted successfully'})


@files_bp.route('/picker-config', methods=['GET'])
def get_picker_config():
    """Get Google Picker configuration."""
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'Not authenticated'}), 401

    credentials = get_valid_credentials(user_id)
    if not credentials:
        return jsonify({'error': 'Invalid or expired credentials'}), 401

    return jsonify({
        'developerKey': Config.GOOGLE_CLIENT_ID.split('-')[0] if Config.GOOGLE_CLIENT_ID else '',
        'clientId': Config.GOOGLE_CLIENT_ID,
        'accessToken': credentials.token
    })
