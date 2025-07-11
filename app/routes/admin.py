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
    flash(f"Benutzer {user_data.get('username')} wurde erfolgreich {status_text}.", "success")
    return redirect(url_for('admin.index'))
