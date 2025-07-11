# location: app/routes/main.py
# Hauptrouten der Anwendung.

from flask import Blueprint, redirect, url_for, render_template
from .. import data_manager

main_bp = Blueprint('main', __name__)

@main_bp.route('/')
def index():
    """Leitet von der Startseite zum Dashboard weiter."""
    return redirect(url_for('projects.dashboard'))

@main_bp.route('/discover')
def discover():
    """Zeigt öffentlich geteilte Projekte an (Platzhalter)."""
    # Hier würde die Logik stehen, um öffentliche Projekte zu laden
    public_projects = [] 
    return render_template('discover.html', projects=public_projects)
