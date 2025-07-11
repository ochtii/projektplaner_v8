# location: app/services/json_service.py
# Implementiert die get_all_users-Methode.

import json
import os
import uuid
from ..config import Config

class JsonService:
    def __init__(self, app_config=None):
        self.projects_file = Config.JSON_PROJECTS_PATH
        self.users_file = Config.JSON_USERS_PATH
        self._ensure_files_exist()
        self.config = app_config if app_config else {}
        self.debug_mode = self.config.get('APP_SETTINGS', {}).get('debug_mode', False)

    def get_all_users(self):
        """NEU: Gibt eine Liste aller Benutzer-Dictionaries zurück."""
        users = self._read_data(self.users_file)
        return list(users.values())
    
    # --- (Restliche Methoden bleiben unverändert) ---
    def _ensure_files_exist(self):
        for path in [self.projects_file, self.users_file]:
            if not os.path.exists(path):
                os.makedirs(os.path.dirname(path), exist_ok=True)
                with open(path, 'w', encoding='utf-8') as f: json.dump([] if 'projects' in path else {}, f)
    def _read_data(self, file_path):
        try:
            with open(file_path, 'r', encoding='utf-8') as f: return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError): return [] if 'projects' in file_path else {}
    def _write_data(self, file_path, data):
        with open(file_path, 'w', encoding='utf-8') as f: json.dump(data, f, indent=4, ensure_ascii=False)
    def get_user_count(self): return len(self._read_data(self.users_file))
    def get_all_projects(self): return self._read_data(self.projects_file)
    def get_project(self, project_id): return next((p for p in self.get_all_projects() if p.get('id') == project_id), None)
    def save_project(self, project_data):
        projects = self.get_all_projects()
        project_id = project_data.get('id')
        if not project_id: project_data['id'] = str(uuid.uuid4()); projects.append(project_data)
        else:
            index = next((i for i, p in enumerate(projects) if p.get('id') == project_id), -1)
            if index != -1: projects[index] = project_data
            else: projects.append(project_data)
        self._write_data(self.projects_file, projects)
        return project_data
    def delete_project(self, project_id):
        projects = self.get_all_projects()
        updated = [p for p in projects if p.get('id') != project_id]
        if len(projects) != len(updated): self._write_data(self.projects_file, updated); return True
        return False
    def get_user(self, user_id): return self._read_data(self.users_file).get(user_id)
    def find_user_by_email(self, email):
        users = self._read_data(self.users_file)
        for user_data in users.values():
            if user_data.get('email') == email: return user_data
        return None
    def save_user(self, user_data):
        users = self._read_data(self.users_file)
        users[user_data.get('id')] = user_data
        self._write_data(self.users_file, users)
        return user_data
    
    def save_user_settings(self, user_id, settings):
        """NEU: Speichert ein Einstellungs-Dictionary für einen Benutzer (JSON-Version)."""
        users = self._read_data(self.users_file)
        if user_id in users:
            users[user_id]['settings'] = settings
            self._write_data(self.users_file, users)
            return True
        return False

    def get_user_settings(self, user_id):
        """NEU: Lädt Einstellungen für einen bestimmten Benutzer (JSON-Version)."""
        users = self._read_data(self.users_file)
        if user_id in users:
            return users[user_id].get('settings', {})
        return {}

    def save_user_log_colors(self, user_id, log_colors):
        """Spezialisierte Methode für Log-Farbeinstellungen (JSON-Version)."""
        # Organisiere die Daten ähnlich wie in Firestore für Konsistenz
        from datetime import datetime
        timestamp = datetime.utcnow().isoformat() + 'Z'
        
        organized_colors = {
            'preferences': {
                'ui': {
                    'log_colors': log_colors,
                    'updated_at': timestamp,
                    'version': '1.0'
                }
            }
        }
        
        return self.save_user_settings(user_id, organized_colors)

    def get_user_log_colors(self, user_id):
        """Spezialisierte Methode zum Laden von Log-Farbeinstellungen (JSON-Version)."""
        settings = self.get_user_settings(user_id)
        
        # Versuche organisierte Struktur zuerst
        if 'preferences' in settings and 'ui' in settings['preferences']:
            return settings['preferences']['ui'].get('log_colors', {})
        
        # Fallback für alte/flache Struktur
        return settings.get('log_colors', {})
