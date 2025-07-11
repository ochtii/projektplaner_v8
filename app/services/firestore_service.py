# location: app/services/firestore_service.py
# Implementiert die Methode zum Speichern von Benutzereinstellungen.

import firebase_admin
from firebase_admin import credentials, firestore, auth
import os
from ..config import Config

class FirestoreService:
    def __init__(self, app_config=None):
        self.config = app_config if app_config else {}
        self.debug_mode = self.config.get('APP_SETTINGS', {}).get('debug_mode', False)
        if not firebase_admin._apps:
            try:
                cred_path = Config.FIREBASE_CREDENTIALS_PATH
                if os.path.exists(cred_path):
                    cred = credentials.Certificate(cred_path)
                    firebase_admin.initialize_app(cred)
                    self.db = firestore.client()
                else: self.db = None
            except Exception as e: self.db = None; print(f"FEHLER: {e}")
        else: self.db = firestore.client()

    def _check_db(self):
        if not self.db: raise ConnectionError("Firestore ist nicht initialisiert.")

    def save_user_settings(self, user_id, settings):
        """NEU: Speichert ein Einstellungs-Dictionary für einen Benutzer."""
        self._check_db()
        user_ref = self.db.collection('users').document(user_id)
        # Verwendet merge=True, um das settings-Feld hinzuzufügen/zu überschreiben,
        # ohne andere Benutzerdaten zu löschen.
        return user_ref.set({'settings': settings}, merge=True)

    # --- (Restliche Methoden unverändert) ---
    def get_all_users(self): self._check_db(); return [doc.to_dict() for doc in self.db.collection('users').stream()]
    def find_user_by_email(self, email):
        self._check_db()
        try:
            user_record = auth.get_user_by_email(email)
            user_doc = self.db.collection('users').document(user_record.uid).get()
            if user_doc.exists:
                user_data = user_doc.to_dict()
                user_data['id'] = user_doc.id
                return user_data
            return {'id': user_record.uid, 'email': user_record.email, 'username': user_record.display_name or email}
        except auth.UserNotFoundError: return None
        except Exception as e: print(f"FEHLER: {e}"); return None
    def get_all_projects(self): self._check_db(); return [doc.to_dict() for doc in self.db.collection('projects').stream()]
    def get_project(self, project_id): self._check_db(); doc = self.db.collection('projects').document(project_id).get(); return doc.to_dict() if doc.exists else None
    def save_project(self, project_data): self._check_db(); self.db.collection('projects').document(project_data.get('id')).set(project_data); return project_data
    def delete_project(self, project_id): self._check_db(); self.db.collection('projects').document(project_id).delete(); return True
    def get_user(self, user_id): self._check_db(); doc = self.db.collection('users').document(user_id).get(); return doc.to_dict() if doc.exists else None
    def save_user(self, user_data): self._check_db(); self.db.collection('users').document(user_data.get('id')).set(user_data, merge=True); return user_data
