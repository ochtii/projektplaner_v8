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
        """NEU: Speichert ein Einstellungs-Dictionary für einen Benutzer mit verbesserter Struktur."""
        self._check_db()
        
        # Verbesserte Firebase-Struktur:
        # users/{user_id}/settings/{category}/data
        # users/{user_id}/settings/{category}/metadata
        
        user_ref = self.db.collection('users').document(user_id)
        
        # Organisiere Einstellungen nach Kategorien
        organized_settings = {}
        
        # Log-Farben separat organisieren
        if 'log_colors' in settings:
            log_colors = settings['log_colors']
            organized_settings['preferences'] = {
                'ui': {
                    'log_colors': log_colors,
                    'updated_at': self._get_timestamp(),
                    'version': '1.0'
                }
            }
        
        # Andere Einstellungen organisieren
        for category, data in settings.items():
            if category != 'log_colors':
                if category not in organized_settings:
                    organized_settings[category] = {}
                organized_settings[category].update({
                    'data': data,
                    'updated_at': self._get_timestamp(),
                    'version': '1.0'
                })
        
        # Mit hierarchischer Struktur speichern
        return user_ref.set({'settings': organized_settings}, merge=True)

    def get_user_settings(self, user_id):
        """NEU: Lädt Einstellungen für einen bestimmten Benutzer mit verbesserter Struktur."""
        self._check_db()
        user_doc = self.db.collection('users').document(user_id).get()
        if user_doc.exists:
            user_data = user_doc.to_dict()
            settings = user_data.get('settings', {})
            
            # Flache Struktur für Backward-Kompatibilität zurückgeben
            flattened = {}
            
            for category, data in settings.items():
                if isinstance(data, dict):
                    if 'ui' in data and 'log_colors' in data['ui']:
                        flattened['log_colors'] = data['ui']['log_colors']
                    elif 'data' in data:
                        flattened[category] = data['data']
                    else:
                        flattened[category] = data
                else:
                    flattened[category] = data
            
            return flattened
        return {}

    def save_user_log_colors(self, user_id, log_colors):
        """Spezialisierte Methode für Log-Farbeinstellungen."""
        self._check_db()
        
        # Organisierte Struktur für Log-Farben
        log_settings = {
            'preferences': {
                'ui': {
                    'log_colors': log_colors,
                    'updated_at': self._get_timestamp(),
                    'version': '1.0',
                    'color_scheme': self._detect_color_scheme(log_colors)
                }
            }
        }
        
        user_ref = self.db.collection('users').document(user_id)
        return user_ref.set({'settings': log_settings}, merge=True)

    def get_user_log_colors(self, user_id):
        """Spezialisierte Methode zum Laden von Log-Farbeinstellungen."""
        self._check_db()
        user_doc = self.db.collection('users').document(user_id).get()
        if user_doc.exists:
            user_data = user_doc.to_dict()
            settings = user_data.get('settings', {})
            
            # Direkt auf Log-Farben zugreifen
            if 'preferences' in settings and 'ui' in settings['preferences']:
                return settings['preferences']['ui'].get('log_colors', {})
                
            # Fallback für alte Struktur
            return settings.get('log_colors', {})
        return {}

    def _detect_color_scheme(self, colors):
        """Erkennt das Farbschema (hell/dunkel) basierend auf den Farben."""
        if not colors:
            return 'default'
        
        # Analysiere die Helligkeit der Farben
        bright_colors = 0
        total_colors = 0
        
        for color_key, color_value in colors.items():
            if color_key == 'console_background':
                continue
            if isinstance(color_value, str) and color_value.startswith('#'):
                total_colors += 1
                # Konvertiere Hex zu RGB und berechne Helligkeit
                hex_color = color_value.lstrip('#')
                if len(hex_color) == 6:
                    r = int(hex_color[0:2], 16)
                    g = int(hex_color[2:4], 16)
                    b = int(hex_color[4:6], 16)
                    brightness = (r * 299 + g * 587 + b * 114) / 1000
                    if brightness > 128:
                        bright_colors += 1
        
        if total_colors == 0:
            return 'default'
        
        brightness_ratio = bright_colors / total_colors
        if brightness_ratio > 0.6:
            return 'light'
        elif brightness_ratio < 0.4:
            return 'dark'
        else:
            return 'mixed'

    def _get_timestamp(self):
        """Gibt den aktuellen Timestamp zurück."""
        from datetime import datetime
        return datetime.utcnow().isoformat() + 'Z'

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
