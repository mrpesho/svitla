from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timedelta

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False)
    google_id = db.Column(db.String(255), unique=True, nullable=False)
    name = db.Column(db.String(255))
    picture = db.Column(db.String(500))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    oauth_token = db.relationship('OAuthToken', backref='user', uselist=False, cascade='all, delete-orphan')
    files = db.relationship('File', backref='user', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'name': self.name,
            'picture': self.picture,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class OAuthToken(db.Model):
    __tablename__ = 'oauth_tokens'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, unique=True)
    access_token = db.Column(db.Text, nullable=False)
    refresh_token = db.Column(db.Text)
    token_type = db.Column(db.String(50), default='Bearer')
    expires_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def is_expired(self):
        if not self.expires_at:
            return True
        return datetime.utcnow() >= self.expires_at


class File(db.Model):
    __tablename__ = 'files'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    name = db.Column(db.String(500), nullable=False)
    mime_type = db.Column(db.String(255))
    size = db.Column(db.BigInteger)  # Size in bytes
    google_drive_id = db.Column(db.String(255))  # Original Google Drive file ID
    local_path = db.Column(db.String(1000), nullable=False)  # Path on server disk
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'mime_type': self.mime_type,
            'size': self.size,
            'google_drive_id': self.google_drive_id,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class AuthToken(db.Model):
    __tablename__ = 'auth_tokens'

    id = db.Column(db.Integer, primary_key=True)
    token = db.Column(db.String(255), unique=True, nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def is_expired(self):
        return datetime.utcnow() >= self.expires_at
