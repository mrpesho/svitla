import os
from dotenv import load_dotenv

load_dotenv()

def get_database_url():
    """Get database URL, converting postgresql:// to postgresql+psycopg:// if needed."""
    url = os.getenv('DATABASE_URL', 'postgresql+psycopg://postgres:postgres@localhost:5432/dataroom')
    # Railway uses postgresql://, but we need postgresql+psycopg:// for psycopg3
    if url.startswith('postgresql://'):
        url = url.replace('postgresql://', 'postgresql+psycopg://', 1)
    return url

class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key')
    SQLALCHEMY_DATABASE_URI = get_database_url()
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Google OAuth
    GOOGLE_CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID')
    GOOGLE_CLIENT_SECRET = os.getenv('GOOGLE_CLIENT_SECRET')
    GOOGLE_REDIRECT_URI = os.getenv('GOOGLE_REDIRECT_URI', 'http://localhost:5000/api/auth/callback')

    # File storage
    UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')

    # Frontend URL for redirects
    FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:5173')

    # Google OAuth Scopes
    GOOGLE_SCOPES = [
        'https://www.googleapis.com/auth/drive.readonly',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
        'openid'
    ]
