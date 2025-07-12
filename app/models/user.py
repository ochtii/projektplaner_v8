# location: app/models/user.py
# Definiert die Datenstruktur für einen Benutzer mit Admin-Flag.

import uuid
from werkzeug.security import generate_password_hash, check_password_hash

class User:
    """Repräsentiert einen Benutzer der Anwendung."""
    def __init__(self, username, email, password, user_id=None, is_admin=False, user_settings=None):
        self.id = user_id or str(uuid.uuid4())
        self.username = username
        self.email = email
        self.password_hash = generate_password_hash(password)
        self.friends = []
        self.is_admin = is_admin
        self.user_settings = user_settings or {
            "theme": "dark",  # dark/light theme per user
            "language": "de",
            "notifications": True
        }

    def check_password(self, password):
        """Überprüft das eingegebene Passwort gegen den Hash."""
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        """Konvertiert das User-Objekt in ein Dictionary zum Speichern."""
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "password_hash": self.password_hash,
            "friends": self.friends,
            "is_admin": self.is_admin,
            "user_settings": self.user_settings
        }

    @staticmethod
    def from_dict(data):
        """Erstellt ein User-Objekt aus einem Dictionary."""
        user = User(
            username=data.get('username'),
            email=data.get('email'),
            password="",
            user_id=data.get('id')
        )
        user.password_hash = data.get('password_hash')
        user.friends = data.get('friends', [])
        user.is_admin = data.get('is_admin', False)
        user.user_settings = data.get('user_settings', {
            "theme": "dark",
            "language": "de", 
            "notifications": True
        })
        return user
