# location: app/services/data_manager.py
# Fügt eine Methode zum Speichern von Benutzereinstellungen hinzu.

from .json_service import JsonService
from .firestore_service import FirestoreService

class DataManager:
    _instance = None
    _service = None
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(DataManager, cls).__new__(cls)
        return cls._instance
    def init_app(self, mode, app_config=None):
        if mode == 'cloud':
            self._service = FirestoreService(app_config)
        else:
            self._service = JsonService(app_config)
    
    def save_user_settings(self, user_id, settings):
        """NEU: Speichert Einstellungen für einen bestimmten Benutzer."""
        return self._service.save_user_settings(user_id, settings)

    def get_all_users(self): return self._service.get_all_users()
    def get_all_projects(self): return self._service.get_all_projects()
    def get_project(self, project_id): return self._service.get_project(project_id)
    def save_project(self, project_data): return self._service.save_project(project_data)
    def delete_project(self, project_id): return self._service.delete_project(project_id)
    def get_user(self, user_id): return self._service.get_user(user_id)
    def find_user_by_email(self, email): return self._service.find_user_by_email(email)
    def save_user(self, user_data): return self._service.save_user(user_data)
