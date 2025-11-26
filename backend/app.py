import os
import sys
import traceback
import logging
from logging.handlers import RotatingFileHandler
from flask import Flask, jsonify
from flask_cors import CORS
from werkzeug.middleware.proxy_fix import ProxyFix
from sqlalchemy import inspect
from config import Config
from models import db
from routes.auth import auth_bp
from routes.files import files_bp

# Module-level debug
print("=== APP.PY LOADING ===", flush=True)
print(f"FRONTEND_URL: {Config.FRONTEND_URL}", flush=True)
print(f"GOOGLE_REDIRECT_URI: {Config.GOOGLE_REDIRECT_URI}", flush=True)
print(f"FLASK_ENV: {os.getenv('FLASK_ENV')}", flush=True)

# Allow OAuth on HTTP for local development
if os.getenv('FLASK_ENV') == 'dev':
    os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'


def configure_logging(app):
    """Configure application logging."""
    # Set log level based on environment
    if os.getenv('FLASK_ENV') == 'dev':
        log_level = logging.DEBUG
    else:
        log_level = logging.INFO

    # Configure root logger
    logging.basicConfig(
        level=log_level,
        format='%(asctime)s %(levelname)s [%(name)s] %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )

    # Configure Flask app logger
    app.logger.setLevel(log_level)

    # Add file handler for production
    if os.getenv('FLASK_ENV') != 'dev':
        if not os.path.exists('logs'):
            os.mkdir('logs')
        file_handler = RotatingFileHandler(
            'logs/dataroom.log',
            maxBytes=10240000,  # 10MB
            backupCount=10
        )
        file_handler.setFormatter(logging.Formatter(
            '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
        ))
        file_handler.setLevel(log_level)
        app.logger.addHandler(file_handler)

    app.logger.info('Data Room application startup')


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Configure logging
    configure_logging(app)

    # Fix for running behind a proxy (Railway, etc.)
    # This makes request.url use HTTPS when behind SSL-terminating proxy
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_prefix=1)

    # Log configuration values
    app.logger.info(f"FRONTEND_URL: {Config.FRONTEND_URL}")
    app.logger.info(f"DEBUG - GOOGLE_REDIRECT_URI: {Config.GOOGLE_REDIRECT_URI}")
    app.logger.info(f"DEBUG - FLASK_ENV: {os.getenv('FLASK_ENV')}")
    app.logger.info(f"DEBUG - DATABASE_URL set: {bool(Config.SQLALCHEMY_DATABASE_URI)}")

    # Session cookie configuration for cross-origin
    if os.getenv('FLASK_ENV') == 'dev':
        app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
        app.config['SESSION_COOKIE_SECURE'] = False
    else:
        # Production: cross-origin requires SameSite=None and Secure=True
        app.config['SESSION_COOKIE_SAMESITE'] = 'None'
        app.config['SESSION_COOKIE_SECURE'] = True
    app.config['SESSION_COOKIE_HTTPONLY'] = True

    # Initialize extensions
    db.init_app(app)
    CORS(app, supports_credentials=True, origins=[Config.FRONTEND_URL])

    # Ensure upload folder exists
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

    # Global error handler
    @app.errorhandler(Exception)
    def handle_exception(e):
        print(f"Unhandled exception: {e}", flush=True)
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

    # Register blueprints

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(files_bp, url_prefix='/api/files')

    # Health check endpoint
    @app.route('/api/health')
    def health():
        print("Health check called", flush=True)
        return 'OK', 200

    # Create tables
    with app.app_context():
        try:
            db.create_all()
            print("Database tables created/verified", flush=True)

            # List all tables
            inspector = inspect(db.engine)
            tables = inspector.get_table_names()
            print(f"Available tables: {tables}", flush=True)
        except Exception as e:
            # Tables might already exist from previous deployment
            app.logger.error(f"create_all error: {e}")
            traceback.print_exc()

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, port=5000)
