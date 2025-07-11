# location: app/config.py
# Konfigurationsdatei für die Anwendung.

import os

# Absoluter Pfad zum Hauptverzeichnis des Projekts
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))

class Config:
    """Enthält Konfigurationsvariablen für die Flask-App."""
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'eine-sehr-geheime-zeichenkette'
    
    # Pfad zur Firebase Service Account Schlüsseldatei im Hauptverzeichnis
    FIREBASE_CREDENTIALS_PATH = os.path.join(BASE_DIR, 'firebase-credentials.json')

    # Pfade für den Offline-Modus (im 'data'-Ordner im Hauptverzeichnis)
    JSON_USERS_PATH = os.path.join(BASE_DIR, 'data', 'users.json')
    JSON_PROJECTS_PATH = os.path.join(BASE_DIR, 'data', 'projects.json')
