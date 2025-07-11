# location: app/routes/projects.py
# Routen für die Projektverwaltung (jetzt mit Authentifizierungsschutz).

from flask import Blueprint, render_template, request, redirect, url_for, flash
from ..extensions import data_manager
from ..models.project import Project
from .auth import login_required

projects_bp = Blueprint('projects', __name__)

@projects_bp.route('/dashboard')
@login_required
def dashboard():
    projects = data_manager.get_all_projects()
    for p in projects:
        total, completed = 0, 0
        for phase in p.get('structure', []):
            for task in phase.get('children', []):
                for subtask in task.get('children', []):
                    total += 1
                    if subtask.get('completed'):
                        completed += 1
        p['progress'] = (completed / total * 100) if total > 0 else 0
    return render_template('dashboard.html', projects=projects)

@projects_bp.route('/new', methods=['POST'])
@login_required
def new_project():
    project_name = request.form.get('project_name')
    if not project_name:
        flash('Projektname darf nicht leer sein!', 'error')
        return redirect(url_for('projects.dashboard'))
    
    new_proj = Project(name=project_name, template=request.form.get('template'))
    data_manager.save_project(new_proj.to_dict())
    flash(f'Projekt "{project_name}" wurde erfolgreich erstellt.', 'success')
    return redirect(url_for('projects.dashboard'))

@projects_bp.route('/<project_id>/editor')
@login_required
def editor(project_id):
    project = data_manager.get_project(project_id)
    if not project: return "Projekt nicht gefunden", 404
    return render_template('project_editor.html', project=project)

@projects_bp.route('/<project_id>/overview')
@login_required
def overview(project_id):
    project = data_manager.get_project(project_id)
    if not project: return "Projekt nicht gefunden", 404
    return render_template('project_overview.html', project=project)

@projects_bp.route('/<project_id>/checklist')
@login_required
def checklist(project_id):
    project = data_manager.get_project(project_id)
    if not project: return "Projekt nicht gefunden", 404
    return render_template('project_checklist.html', project=project)
