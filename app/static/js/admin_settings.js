// location: app/static/js/admin_settings.js
// Logik für das automatische Speichern von Einstellungen auf den Admin-Seiten.

document.addEventListener('DOMContentLoaded', () => {
    const settingSwitches = document.querySelectorAll('.setting-switch');
    const notification = document.getElementById('auto-save-notification');
    const debugSettingsBtn = document.getElementById('debug-settings-btn');
    
    const logsEnabledToggle = document.getElementById('logs-enabled-toggle');
    const logSettingsPanel = document.getElementById('log-settings-panel');

    // Neue Elemente für Farbeinstellungen
    const colorPickers = document.querySelectorAll('.color-picker');
    const resetConfirmModal = document.getElementById('reset-confirm-modal');
    const resetConfirmText = document.getElementById('reset-confirm-text');
    const resetConfirmYes = document.getElementById('reset-confirm-yes');
    const resetConfirmNo = document.getElementById('reset-confirm-no');
    const resetColorsBtn = document.getElementById('reset-colors');
    const colorPreviews = document.querySelectorAll('.color-preview');

    // Standard-Farbwerte definieren
    const defaultColors = {
        console_background: '#282c34',
        log_text: '#abb2bf',
        timestamp: '#8892b0',
        header_bg: '#1e2127',
        header_text: '#ffffff',
        info: '#3b82f6',
        warn: '#f59e0b',
        err: '#ef4444',
        api_req: '#8b5cf6',
        api_ans: '#a855f7',
        database: '#10b981',
        firestore: '#059669',
        activity: '#6b7280'
    };

    // Firestore-Funktionen
    const saveToFirestore = async (colorSettings) => {
        try {
            const response = await fetch('/admin/api/save-user-settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    category: 'log_colors',
                    settings: colorSettings
                })
            });
            
            if (response.ok) {
                window.log?.('info', 'Farbeinstellungen in Firestore gespeichert');
                return true;
            } else {
                throw new Error('Fehler beim Speichern in Firestore');
            }
        } catch (error) {
            window.log?.('err', `Firestore-Speicherung fehlgeschlagen: ${error.message}`);
            return false;
        }
    };

    const loadFromFirestore = async () => {
        try {
            const response = await fetch('/admin/api/get-user-settings?category=log_colors');
            if (response.ok) {
                const data = await response.json();
                if (data.settings) {
                    window.log?.('info', 'Farbeinstellungen aus Firestore geladen');
                    return data.settings;
                }
            }
        } catch (error) {
            window.log?.('warn', `Firestore-Laden fehlgeschlagen: ${error.message}`);
        }
        return null;
    };

    // Hilfsfunktionen für Farbeinstellungen
    const updateColorPreview = (logType, color) => {
        const preview = document.querySelector(`.color-preview[data-type="${logType}"], .console-preview[data-type="${logType}"]`);
        if (preview) {
            if (logType === 'console_background') {
                preview.style.backgroundColor = color;
                preview.style.borderColor = color;
                document.querySelectorAll('.console-preview').forEach(cp => {
                    cp.style.backgroundColor = color;
                });
            } else if (logType === 'log_text') {
                document.querySelectorAll('.console-preview .preview-message').forEach(msg => {
                    msg.style.color = color;
                });
            } else if (logType === 'timestamp') {
                document.querySelectorAll('.console-preview .preview-time').forEach(time => {
                    time.style.color = color;
                });
            } else if (logType === 'header_bg') {
                document.querySelectorAll('.console-preview.header-preview').forEach(header => {
                    header.style.backgroundColor = color;
                });
            } else if (logType === 'header_text') {
                document.querySelectorAll('.console-preview.header-preview .preview-header').forEach(headerText => {
                    headerText.style.color = color;
                });
            } else {
                const typeSpan = preview.querySelector('.preview-type');
                if (typeSpan) {
                    typeSpan.style.color = color;
                }
                if (preview.classList.contains('color-preview')) {
                    preview.style.color = color;
                    preview.style.borderColor = color + '40';
                }
            }
        }
    };

    const updateLogStyles = (logType, color) => {
        document.documentElement.style.setProperty(`--log-${logType}-color`, color);
        
        if (logType === 'console_background') {
            const logConsole = document.getElementById('log-console');
            if (logConsole) {
                logConsole.style.backgroundColor = color;
            }
            document.documentElement.style.setProperty('--console-bg-color', color);
        } else if (logType === 'log_text') {
            document.documentElement.style.setProperty('--log-text-color', color);
        } else if (logType === 'timestamp') {
            document.documentElement.style.setProperty('--timestamp-color', color);
        } else if (logType === 'header_bg') {
            const logHeader = document.querySelector('#log-console .log-header');
            if (logHeader) {
                logHeader.style.backgroundColor = color;
            }
            document.documentElement.style.setProperty('--header-bg-color', color);
        } else if (logType === 'header_text') {
            const logHeader = document.querySelector('#log-console .log-header');
            if (logHeader) {
                logHeader.style.color = color;
            }
            document.documentElement.style.setProperty('--header-text-color', color);
        }

        // Event für live Aktualisierung der Konsole auslösen
        window.dispatchEvent(new CustomEvent('log-colors-updated', {
            detail: { logType, color }
        }));
    };

    const updateColor = (picker) => {
        const logType = picker.dataset.logType;
        const color = picker.value;
        
        localStorage.setItem(`log_color_${logType}`, color);
        updateColorPreview(logType, color);
        updateLogStyles(logType, color);
    };

    const resetColor = async (picker) => {
        const logType = picker.dataset.logType;
        const defaultColor = defaultColors[logType];
        
        if (defaultColor) {
            picker.value = defaultColor;
            localStorage.setItem(`log_color_${logType}`, defaultColor);
            updateColorPreview(logType, defaultColor);
            updateLogStyles(logType, defaultColor);
            
            const currentColors = {};
            Object.keys(defaultColors).forEach(type => {
                currentColors[type] = localStorage.getItem(`log_color_${type}`) || defaultColors[type];
            });
            
            const saved = await saveToFirestore(currentColors);
            if (saved) {
                showNotification('Standardfarben wurden wiederhergestellt und gespeichert.');
            } else {
                showNotification('Standardfarben wurden wiederhergestellt (nur lokal gespeichert).', true);
            }
        }
    };

    const resetAllColors = async () => {
        Object.keys(defaultColors).forEach(logType => {
            const picker = document.querySelector(`[data-log-type="${logType}"]`);
            if (picker) {
                const defaultColor = defaultColors[logType];
                picker.value = defaultColor;
                localStorage.setItem(`log_color_${logType}`, defaultColor);
                updateColorPreview(logType, defaultColor);
                updateLogStyles(logType, defaultColor);
            }
        });
        
        const saved = await saveToFirestore(defaultColors);
        if (saved) {
            showNotification('Standardfarben wurden wiederhergestellt und gespeichert.');
        } else {
            showNotification('Standardfarben wurden wiederhergestellt (nur lokal gespeichert).', true);
        }
    };

    // Event-Listener für Farbauswahl mit Live-Update
    colorPickers.forEach(picker => {
        let saveTimeout;
        
        picker.addEventListener('input', (event) => {
            const logType = event.target.dataset.logType;
            const color = event.target.value;
            
            // Sofortige Live-Aktualisierung
            updateColorPreview(logType, color);
            updateLogStyles(logType, color);
            
            // Verzögertes Speichern
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(async () => {
                localStorage.setItem(`log_color_${logType}`, color);
                
                const currentColors = {};
                Object.keys(defaultColors).forEach(type => {
                    currentColors[type] = localStorage.getItem(`log_color_${type}`) || defaultColors[type];
                });
                
                await saveToFirestore(currentColors);
            }, 1000);
        });
    });

    // Reset-Button Event-Listener
    if (resetColorsBtn) {
        resetColorsBtn.addEventListener('click', () => {
            resetConfirmText.textContent = 'Möchten Sie wirklich alle Farben auf die Standardwerte zurücksetzen?';
            resetConfirmModal.style.display = 'block';
            
            resetConfirmYes.onclick = async () => {
                await resetAllColors();
                resetConfirmModal.style.display = 'none';
            };
        });
    }

    // Modal Event-Listener
    if (resetConfirmNo) {
        resetConfirmNo.addEventListener('click', () => {
            resetConfirmModal.style.display = 'none';
        });
    }

    if (resetConfirmModal) {
        resetConfirmModal.addEventListener('click', (event) => {
            if (event.target === resetConfirmModal) {
                resetConfirmModal.style.display = 'none';
            }
        });
    }

    // Farben beim Laden setzen
    const initializeColors = async () => {
        // Versuche Farben aus Firestore zu laden
        const firestoreColors = await loadFromFirestore();
        
        Object.keys(defaultColors).forEach(logType => {
            let savedColor;
            
            // Priorisierung: Firestore > localStorage > Default
            if (firestoreColors && firestoreColors[logType]) {
                savedColor = firestoreColors[logType];
                localStorage.setItem(`log_color_${logType}`, savedColor);
            } else {
                savedColor = localStorage.getItem(`log_color_${logType}`) || defaultColors[logType];
            }
            
            const picker = document.querySelector(`[data-log-type="${logType}"]`);
            if (picker) {
                picker.value = savedColor;
                updateColorPreview(logType, savedColor);
                updateLogStyles(logType, savedColor);
            }
            
            // CSS-Variablen setzen
            document.documentElement.style.setProperty(`--log-${logType}-color`, savedColor);
            
            if (logType === 'console_background') {
                document.documentElement.style.setProperty('--console-bg-color', savedColor);
            } else if (logType === 'log_text') {
                document.documentElement.style.setProperty('--log-text-color', savedColor);
            } else if (logType === 'timestamp') {
                document.documentElement.style.setProperty('--timestamp-color', savedColor);
            }
        });
    };

    // Initialisierung starten
    initializeColors();

    const toggleLogSettingsPanel = () => {
        if (logsEnabledToggle && logSettingsPanel) {
            logSettingsPanel.style.display = logsEnabledToggle.checked ? 'block' : 'none';
        }
    };

    const showNotification = (message, isError = false) => {
        if (!notification) return;
        notification.textContent = message;
        notification.className = 'auto-save-notification';
        notification.classList.add(isError ? 'error' : 'success', 'show');
        setTimeout(() => {
            notification.classList.remove('show');
        }, 5000);
    };
    
    const updateSwitchesFromStorage = () => {
        settingSwitches.forEach(toggle => {
            const settingKey = toggle.dataset.setting;
            const savedState = localStorage.getItem(settingKey);
            if (savedState !== null) {
                toggle.checked = savedState === 'true';
            }
        });
        toggleLogSettingsPanel();
    };

    // Initialen Zustand für alle Schalter aus localStorage laden
    updateSwitchesFromStorage();

    // Event-Listener für alle Schalter
    settingSwitches.forEach(toggle => {
        toggle.addEventListener('change', async (event) => {
            const settingKey = event.target.dataset.setting;
            const settingValue = event.target.checked;
            
            if (settingKey.startsWith('log_') || settingKey === 'show_log_console' || settingKey === 'logs_enabled') {
                localStorage.setItem(settingKey, settingValue);
                showNotification(`Einstellung '${settingKey}' lokal gespeichert.`);
                
                if (settingKey === 'logs_enabled') {
                    toggleLogSettingsPanel();
                }
                window.dispatchEvent(new CustomEvent('settings-updated'));
                return;
            }

            try {
                const response = await fetch('/admin/api/update-setting', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ setting: settingKey, value: settingValue })
                });
                const result = await response.json();
                if (result.status !== 'success') throw new Error(result.message);
                
                const statusText = settingValue ? 'aktiviert' : 'deaktiviert';
                showNotification(`Modus '${settingKey}' ${statusText}. Server-Neustart erforderlich.`, false);

                if (debugSettingsBtn) {
                    debugSettingsBtn.style.display = settingValue ? 'inline-flex' : 'none';
                }

            } catch (error) {
                console.error('Fehler beim Speichern der Einstellung:', error);
                showNotification('Fehler beim Speichern.', true);
                event.target.checked = !settingValue;
            }
        });
    });

    // Listener, um die Schalter zu aktualisieren, wenn die Konsole extern geändert wird
    window.addEventListener('settings-updated', updateSwitchesFromStorage);
});
