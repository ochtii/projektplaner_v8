# location: /run.py
# Fügt einen Zeitstempel zur Startnachricht des Servers hinzu.

import os
import sys
import json
from datetime import datetime # NEU: Import für Zeitstempel

MODE_CACHE_FILE = '.mode_cache'

# --- (Funktionen für Tastatureingabe, save_mode, load_mode, select_mode bleiben unverändert) ---
try:
    import msvcrt
    def get_key(): return msvcrt.getch()
except ImportError:
    import tty, termios
    def get_key():
        fd = sys.stdin.fileno()
        old_settings = termios.tcgetattr(fd)
        try:
            tty.setraw(sys.stdin.fileno())
            ch = sys.stdin.read(1)
        finally:
            termios.tcsetattr(fd, termios.TCSADRAIN, old_settings)
        return ch.encode('utf-8')

def save_mode(mode):
    try:
        with open(MODE_CACHE_FILE, 'w', encoding='utf-8') as f: f.write(mode)
    except IOError: pass

def load_mode():
    if os.path.exists(MODE_CACHE_FILE):
        try:
            with open(MODE_CACHE_FILE, 'r', encoding='utf-8') as f: return f.read().strip()
        except IOError: pass
    return None

def select_mode():
    options = ["Offline (lokale JSON-Dateien)", "Cloud (Google Firestore)"]
    selected = 0
    while True:
        os.system('cls' if os.name == 'nt' else 'clear')
        print("Wählen Sie den Betriebsmodus:\n")
        for i, option in enumerate(options):
            print(f"{'> ' if i == selected else '  '}{option}")
        print("\n(Mit Pfeiltasten navigieren, mit Enter bestätigen)")
        key = get_key()
        if key == b'\xe0':
            key = get_key()
            if key == b'H': selected = (selected - 1) % len(options)
            elif key == b'P': selected = (selected + 1) % len(options)
        elif key == b'\x1b' and get_key() == b'[':
            final_key = get_key()
            if final_key == b'A': selected = (selected - 1) % len(options)
            elif final_key == b'B': selected = (selected + 1) % len(options)
        elif key in [b'\r', b'\n']:
            mode = 'cloud' if selected == 1 else 'offline'
            os.system('cls' if os.name == 'nt' else 'clear')
            return mode
# --- (Ende der unveränderten Funktionen) ---

def load_settings():
    """Lädt die globalen Einstellungen aus settings.json."""
    try:
        with open('settings.json', 'r', encoding='utf-8') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        default_settings = {"debug_mode": False}
        with open('settings.json', 'w', encoding='utf-8') as f:
            json.dump(default_settings, f, indent=2)
        return default_settings

if __name__ == '__main__':
    from app import create_app
    
    final_mode = None
    if '--cloud' in sys.argv:
        final_mode = 'cloud'
        save_mode(final_mode)
    elif '--offline' in sys.argv:
        final_mode = 'offline'
        save_mode(final_mode)
    
    if final_mode is None:
        force_select = '--force-select' in sys.argv
        last_mode = load_mode()
        if force_select or last_mode not in ['offline', 'cloud']:
            final_mode = select_mode()
            save_mode(final_mode)
        else:
            final_mode = last_mode
    
    # KORRIGIERT: Fügt einen Zeitstempel zur Startnachricht hinzu.
    if os.environ.get("WERKZEUG_RUN_MAIN") == "true":
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print("----------------------------------------------------")
        print(f"Server gestartet im '{final_mode.upper()}' Modus.")
        print(f"Zeitstempel: {timestamp}")
        print("----------------------------------------------------")

    settings = load_settings()
    app = create_app(mode=final_mode, settings=settings)
    
    app.run(debug=True, host='0.0.0.0', use_reloader=True)
