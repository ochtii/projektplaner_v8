# location: app/__init__.py
# Lädt Einstellungen beim Start und stellt sie effizient für Templates bereit.

from flask import Flask
import json
import os
from .config import Config
from .extensions import data_manager

def create_app(mode='offline', settings=None):
    """
    Erstellt und konfiguriert eine Instanz der Flask-Anwendung.
    """
    app = Flask(__name__)
    app.config.from_object(Config)

    # Die initialen Einstellungen werden beim Start geladen
    if settings is None:
        settings = {}
    app.config['APP_SETTINGS'] = settings
    if settings.get('debug_mode'):
        print("DEBUG-MODUS ist aktiviert.")

    data_manager.init_app(mode, app_config=app.config)

    # KORRIGIERT: Dieser Context Processor liest die Einstellungen nun effizient
    # aus der App-Konfiguration, anstatt bei jeder Anfrage die Datei neu zu laden.
    @app.context_processor
    def inject_settings():
        return dict(app_settings=app.config.get('APP_SETTINGS', {}))

    from .routes.main import main_bp
    from .routes.projects import projects_bp
    from .routes.auth import auth_bp
    from .routes.admin import admin_bp

    app.register_blueprint(main_bp)
    app.register_blueprint(projects_bp, url_prefix='/projects')
    app.register_blueprint(auth_bp, url_prefix='/auth')
    app.register_blueprint(admin_bp, url_prefix='/admin')

    # Erstellt Test-Benutzer, falls der Test-Modus in den initialen Einstellungen aktiv ist
    if settings.get('test_mode') and mode == 'offline':
        from .models.user import User
        print("Test-Modus: Überprüfe Test-Benutzer...")
        test_users = {
            "testadmin@test.at": {"username": "Test Admin", "password": "test1234", "is_admin": True},
            "testuser@test.at": {"username": "Test User", "password": "test1234", "is_admin": False}
        }
        for email, details in test_users.items():
            if not data_manager.find_user_by_email(email):
                print(f"Erstelle Test-Benutzer: {email}")
                user = User(
                    username=details["username"],
                    email=email,
                    password=details["password"]
                )
                user.is_admin = details["is_admin"]
                data_manager.save_user(user.to_dict())

    if mode == 'offline':
        from .models.project import create_initial_project
        projects = data_manager.get_all_projects()
        if not projects:
            print("Erstelle initiales Beispielprojekt...")
            initial_project = create_initial_project()
            data_manager.save_project(initial_project.to_dict())

    return app
