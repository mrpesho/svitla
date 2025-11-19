import os
import sys
from flask import Flask, jsonify
from flask_cors import CORS
from config import Config
from models import db

# Module-level debug
print("=== APP.PY LOADING ===", flush=True)
print(f"FRONTEND_URL: {Config.FRONTEND_URL}", flush=True)
print(f"GOOGLE_REDIRECT_URI: {Config.GOOGLE_REDIRECT_URI}", flush=True)
print(f"FLASK_ENV: {os.getenv('FLASK_ENV')}", flush=True)

# Allow OAuth on HTTP for local development
if os.getenv('FLASK_ENV') == 'dev':
    os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Debug: Log configuration values
    import sys
    sys.stdout.flush()
    app.logger.info(f"DEBUG - FRONTEND_URL: {Config.FRONTEND_URL}")
    app.logger.info(f"DEBUG - GOOGLE_REDIRECT_URI: {Config.GOOGLE_REDIRECT_URI}")
    app.logger.info(f"DEBUG - FLASK_ENV: {os.getenv('FLASK_ENV')}")
    app.logger.info(f"DEBUG - DATABASE_URL set: {bool(Config.SQLALCHEMY_DATABASE_URI)}")

    # Session cookie configuration for cross-origin
    app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
    app.config['SESSION_COOKIE_SECURE'] = os.getenv('FLASK_ENV') != 'dev'
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
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

    # Register blueprints
    from routes.auth import auth_bp
    from routes.files import files_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(files_bp, url_prefix='/api/files')

    # Health check endpoint
    @app.route('/api/health')
    def health():
        try:
            # Test database connection
            db.session.execute(db.text('SELECT 1'))
            return jsonify({'status': 'healthy', 'db': 'connected'})
        except Exception as e:
            print(f"Health check DB error: {e}", flush=True)
            return jsonify({'status': 'unhealthy', 'error': str(e)}), 500

    # Create tables
    with app.app_context():
        try:
            db.create_all()
        except Exception as e:
            # Tables might already exist from previous deployment
            app.logger.warning(f"create_all warning: {e}")

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, port=5000)
