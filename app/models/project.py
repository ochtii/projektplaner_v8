# location: app/models/project.py
# Definiert die Datenstruktur für ein Projekt.

import uuid
from datetime import datetime

class Project:
    """Repräsentiert ein Projekt mit seinen Phasen, Aufgaben und Unteraufgaben."""
    def __init__(self, name, template="leer", project_id=None):
        self.id = project_id or str(uuid.uuid4())
        self.name = name
        self.template = template
        self.created_at = datetime.utcnow().isoformat()
        self.structure = [] # Liste von Phasen (dict)

    def to_dict(self):
        """Konvertiert das Projektobjekt in ein Dictionary."""
        return {
            "id": self.id,
            "name": self.name,
            "template": self.template,
            "created_at": self.created_at,
            "structure": self.structure
        }

def create_initial_project():
    """Erstellt ein vordefiniertes Beispielprojekt."""
    proj = Project(name="Beispiel: Softwareentwicklung", template="Softwareentwicklung")
    proj.structure = [
        {
            "id": str(uuid.uuid4()), "type": "phase", "name": "1. Konzeption & Planung", "children": [
                {"id": str(uuid.uuid4()), "type": "task", "name": "1.1. Anforderungen definieren", "children": [
                    {"id": str(uuid.uuid4()), "type": "subtask", "name": "1.1.1. Stakeholder-Interviews", "completed": True, "comment": "Alle wichtigen Stakeholder wurden befragt."},
                    {"id": str(uuid.uuid4()), "type": "subtask", "name": "1.1.2. User Stories schreiben", "completed": False, "comment": ""},
                ]},
                {"id": str(uuid.uuid4()), "type": "task", "name": "1.2. Technisches Design", "children": []},
            ]
        },
        {
            "id": str(uuid.uuid4()), "type": "phase", "name": "2. Entwicklung", "children": []
        }
    ]
    return proj
