# location: app/routes/admin.py
# Fügt eine API zum Speichern von benutzerspezifischen Admin-Einstellungen hinzu.

from flask import Blueprint, render_template, session, request, redirect, url_for, flash, jsonify, current_app
from functools import wraps
import json
import os
from ..extensions import data_manager
from firebase_admin import auth as firebase_auth

admin_bp = Blueprint('admin', __name__)

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('is_admin'):
            flash('Für diesen Bereich sind Administratorrechte erforderlich.', 'error')
            return redirect(url_for('projects.dashboard'))
        return f(*args, **kwargs)
    return decorated_function

@admin_bp.route('/')
@admin_required
def index():
    all_users = data_manager.get_all_users()
    return render_template('admin.html', users=all_users)

@admin_bp.route('/debug-settings')
@admin_required
def debug_settings():
    return render_template('admin/debug_settings.html')

@admin_bp.route('/api/update-setting', methods=['POST'])
@admin_required
def update_setting():
    data = request.get_json()
    setting_key = data.get('setting')
    setting_value = data.get('value')

    if setting_key is None:
        return jsonify({'status': 'error', 'message': 'Einstellungsschlüssel fehlt'}), 400

    settings_path = os.path.join(os.path.dirname(__file__), '..', '..', 'settings.json')
    try:
        with open(settings_path, 'r', encoding='utf-8') as f: settings = json.load(f)
        settings[setting_key] = setting_value
        with open(settings_path, 'w', encoding='utf-8') as f: json.dump(settings, f, indent=2)
        current_app.config['APP_SETTINGS'][setting_key] = setting_value
        return jsonify({'status': 'success', 'message': f'Einstellung {setting_key} aktualisiert.'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

# NEU: API-Route zum Speichern von benutzerspezifischen Log-Einstellungen
@admin_bp.route('/api/update-user-log-settings', methods=['POST'])
@admin_required
def update_user_log_settings():
    data = request.get_json()
    if not data:
        return jsonify({'status': 'error', 'message': 'Keine Daten erhalten'}), 400
    
    user_id = session.get('user_id')
    # Speichere die neuen Einstellungen für den Benutzer
    data_manager.save_user_settings(user_id, {'log_filters': data})
    # Aktualisiere die Sitzung, damit die Änderungen sofort wirksam werden
    session['log_filters'] = data
    session.modified = True
    return jsonify({'status': 'success', 'message': 'Log-Einstellungen gespeichert.'})

# NEU: API-Route zum Speichern von benutzerdefinierten Einstellungen (inkl. Farben)
@admin_bp.route('/api/save-user-settings', methods=['POST'])
@admin_required  
def save_user_settings():
    data = request.get_json()
    if not data:
        return jsonify({'status': 'error', 'message': 'Keine Daten erhalten'}), 400
    
    user_id = session.get('user_id')
    category = data.get('category', 'general')
    settings = data.get('settings', {})
    
    try:
        # Spezielle Behandlung für Log-Farben mit verbesserter Firebase-Struktur
        if category == 'log_colors' and hasattr(data_manager._service, 'save_user_log_colors'):
            # Nutze die spezialisierte Methode für bessere Datenbankstruktur
            result = data_manager._service.save_user_log_colors(user_id, settings)
        else:
            # Aktuelle Benutzereinstellungen laden
            user_data = data_manager.get_user(user_id) or {}
            current_settings = user_data.get('settings', {})
            
            # Einstellungen für die Kategorie aktualisieren
            current_settings[category] = settings
            
            # Zurück speichern
            result = data_manager.save_user_settings(user_id, current_settings)
        
        return jsonify({
            'status': 'success', 
            'message': f'Einstellungen für Kategorie "{category}" gespeichert.',
            'firebase_structure': 'optimized' if category == 'log_colors' else 'standard'
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

# NEU: API-Route zum Laden von benutzerdefinierten Einstellungen
@admin_bp.route('/api/get-user-settings', methods=['GET'])
@admin_required
def get_user_settings():
    user_id = session.get('user_id')
    category = request.args.get('category', 'general')
    
    try:
        # Spezielle Behandlung für Log-Farben
        if category == 'log_colors' and hasattr(data_manager._service, 'get_user_log_colors'):
            # Nutze die spezialisierte Methode für optimierte Abfrage
            settings = data_manager._service.get_user_log_colors(user_id)
            return jsonify({
                'status': 'success',
                'settings': settings,
                'firebase_structure': 'optimized'
            })
        else:
            # Standard-Verhalten für andere Kategorien
            user_data = data_manager.get_user(user_id) or {}
            settings = user_data.get('settings', {}).get(category, {})
            
            return jsonify({
                'status': 'success',
                'settings': settings,
                'firebase_structure': 'standard'
            })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@admin_bp.route('/set-admin-status', methods=['POST'])
@admin_required
def set_admin_status():
    user_id_to_change = request.form.get('user_id')
    new_status = request.form.get('is_admin') == 'true'
    if not user_id_to_change:
        flash("Benutzer-ID fehlt.", "error")
        return redirect(url_for('admin.index'))
    if user_id_to_change == session.get('user_id') and not new_status:
        flash("Sie können sich nicht selbst die Administratorrechte entziehen.", "error")
        return redirect(url_for('admin.index'))
    user_data = data_manager.get_user(user_id_to_change)
    if not user_data:
        flash("Benutzer nicht gefunden.", "error")
        return redirect(url_for('admin.index'))
    
    # Initialize admin settings only when promoting to admin (not when removing)
    if new_status and not user_data.get('is_admin', False):
        # User is being promoted to admin - initialize admin settings
        if 'admin_settings' not in user_data or not user_data['admin_settings']:
            user_data['admin_settings'] = {
                'log_colors': {
                    'console_background': '#282c34',
                    'log_text': '#abb2bf',
                    'timestamp': '#8892b0',
                    'header_bg': '#1e2127',
                    'header_text': '#ffffff',
                    'info': '#3b82f6',
                    'warn': '#f59e0b',
                    'err': '#ef4444',
                    'api_req': '#8b5cf6',
                    'api_ans': '#a855f7',
                    'database': '#10b981',
                    'activity': '#6b7280'
                },
                'log_filters': {
                    'info': True,
                    'warn': True,
                    'err': True,
                    'api_req': True,
                    'api_ans': True,
                    'database': True,
                    'activity': True
                },
                'debug_settings': {
                    'debug_mode': False,
                    'test_mode': False,
                    'logs_enabled': True,
                    'log_to_browser_console': False
                }
            }
    
    user_data['is_admin'] = new_status
    data_manager.save_user(user_data)
    if data_manager._service.__class__.__name__ == 'FirestoreService':
        try:
            firebase_auth.set_custom_user_claims(user_id_to_change, {'admin': new_status})
        except Exception as e:
            flash(f"Fehler beim Aktualisieren der Firebase-Rechte: {e}", "error")
            user_data['is_admin'] = not new_status
            data_manager.save_user(user_data)
            return redirect(url_for('admin.index'))
    status_text = "zum Administrator ernannt" if new_status else "die Administratorrechte entzogen"
    if new_status and 'admin_settings' in user_data:
        status_text += " (Admin-Einstellungen initialisiert)"
    flash(f"Benutzer {user_data.get('username')} wurde erfolgreich {status_text}.", "success")
    return redirect(url_for('admin.index'))

@admin_bp.route('/api/promote-user', methods=['POST'])
@admin_required
def promote_user():
    """Promote user to admin and initialize admin settings"""
    data = request.get_json()
    user_id = data.get('user_id')
    
    if not user_id:
        return jsonify({'status': 'error', 'message': 'User ID fehlt'}), 400
    
    try:
        # Get user and promote to admin
        user = data_manager.get_user_by_id(user_id)
        if not user:
            return jsonify({'status': 'error', 'message': 'User nicht gefunden'}), 404
            
        user.is_admin = True
        
        # Initialize admin settings only when user becomes admin
        if not hasattr(user, 'admin_settings') or not user.admin_settings:
            user.admin_settings = {
                'log_colors': {
                    'console_background': '#282c34',
                    'log_text': '#abb2bf',
                    'timestamp': '#8892b0',
                    'header_bg': '#1e2127',
                    'header_text': '#ffffff',
                    'info': '#3b82f6',
                    'warn': '#f59e0b',
                    'err': '#ef4444',
                    'api_req': '#8b5cf6',
                    'api_ans': '#a855f7',
                    'database': '#10b981',
                    'activity': '#6b7280'
                },
                'log_filters': {
                    'info': True,
                    'warn': True,
                    'err': True,
                    'api_req': True,
                    'api_ans': True,
                    'database': True,
                    'activity': True
                },
                'debug_settings': {
                    'debug_mode': False,
                    'test_mode': False,
                    'logs_enabled': True,
                    'log_to_browser_console': False
                }
            }
        
        # Save user with admin settings
        data_manager.save_user(user)
        
        return jsonify({
            'status': 'success', 
            'message': f'User {user.username} wurde zum Admin ernannt und Admin-Einstellungen wurden initialisiert'
        })
        
    except Exception as e:
        return jsonify({'status': 'error', 'message': f'Fehler beim Befördern des Users: {str(e)}'}), 500
