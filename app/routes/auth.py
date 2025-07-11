# location: app/routes/auth.py
# Lädt benutzerspezifische Einstellungen beim Login in die Sitzung.

from flask import Blueprint, render_template, request, redirect, url_for, flash, session, current_app
from functools import wraps
from firebase_admin import auth as firebase_auth
from ..extensions import data_manager
from ..models.user import User

auth_bp = Blueprint('auth', __name__)

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            flash('Bitte melden Sie sich an, um diese Seite zu sehen.', 'error')
            return redirect(url_for('auth.login'))
        return f(*args, **kwargs)
    return decorated_function

@auth_bp.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form.get('username')
        email = request.form.get('email')
        password = request.form.get('password')
        password_confirm = request.form.get('password_confirm')
        if not all([username, email, password, password_confirm]):
            flash('Alle Felder sind erforderlich.', 'error')
            return redirect(url_for('auth.register'))
        if password != password_confirm:
            flash('Die Passwörter stimmen nicht überein.', 'error')
            return redirect(url_for('auth.register'))
        if data_manager._service.__class__.__name__ == 'FirestoreService':
            try:
                user_record = firebase_auth.create_user(email=email, password=password, display_name=username)
                user_for_db = {'id': user_record.uid, 'username': username, 'email': email, 'is_admin': False, 'friends': []}
                data_manager.save_user(user_for_db)
                flash('Registrierung erfolgreich! Sie können sich jetzt anmelden.', 'success')
                return redirect(url_for('auth.login'))
            except Exception as e:
                flash(f'Fehler bei der Registrierung: {e}', 'error')
                return redirect(url_for('auth.register'))
        else:
            if data_manager.find_user_by_email(email):
                flash('Ein Benutzer mit dieser E-Mail-Adresse existiert bereits.', 'error')
                return redirect(url_for('auth.register'))
            is_first_user = data_manager._service.get_user_count() == 0
            new_user = User(username=username, email=email, password=password, is_admin=is_first_user)
            data_manager.save_user(new_user.to_dict())
            flash('Registrierung erfolgreich! Sie können sich jetzt anmelden.', 'success')
            return redirect(url_for('auth.login'))
    return render_template('auth/register.html')

@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')
        user_data = data_manager.find_user_by_email(email)
        if not user_data:
            flash('Ungültige Anmeldedaten.', 'error')
            return redirect(url_for('auth.login'))
        if data_manager._service.__class__.__name__ == 'JsonService':
            user = User.from_dict(user_data)
            if not user.check_password(password):
                flash('Ungültige Anmeldedaten.', 'error')
                return redirect(url_for('auth.login'))
        session.clear()
        session['user_id'] = user_data.get('id')
        session['username'] = user_data.get('username')
        is_admin_status = user_data.get('is_admin', False) or user_data.get('isAdmin', False)
        session['is_admin'] = is_admin_status
        
        # NEU: Lade benutzerspezifische Einstellungen für Admins
        if is_admin_status:
            session['log_filters'] = user_data.get('settings', {}).get('log_filters', {})

        flash(f'Willkommen zurück, {session["username"]}!', 'success')
        return redirect(url_for('projects.dashboard'))
    return render_template('auth/login.html')

@auth_bp.route('/logout')
@login_required
def logout():
    session.clear()
    flash('Sie wurden erfolgreich abgemeldet.', 'success')
    return redirect(url_for('auth.login'))
