# location: app/extensions.py
# Diese Datei bricht zirkuläre Importe auf, indem sie gemeinsam genutzte
# Erweiterungsinstanzen (wie den DataManager) an einem zentralen Ort bereitstellt.

from .services.data_manager import DataManager

data_manager = DataManager()
