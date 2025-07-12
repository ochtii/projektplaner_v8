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

    // Change Detection System
    let currentSettings = {
        colors: {},
        logFilters: {},
        adminSettings: {}
    };

    // Deep comparison function
    function deepEqual(obj1, obj2) {
        if (obj1 === obj2) return true;
        if (obj1 == null || obj2 == null) return false;
        if (typeof obj1 !== 'object' || typeof obj2 !== 'object') return false;
        
        const keys1 = Object.keys(obj1);
        const keys2 = Object.keys(obj2);
        
        if (keys1.length !== keys2.length) return false;
        
        for (let key of keys1) {
            if (!keys2.includes(key)) return false;
            if (!deepEqual(obj1[key], obj2[key])) return false;
        }
        
        return true;
    }

    // Only save if settings actually changed
    const saveIfChanged = async (category, newSettings, saveFunction) => {
        const currentCategorySettings = currentSettings[category];
        
        if (!deepEqual(currentCategorySettings, newSettings)) {
            window.log?.('info', `${category} Einstellungen haben sich geändert - speichere...`);
            currentSettings[category] = { ...newSettings };
            return await saveFunction(newSettings);
        } else {
            window.log?.('info', `${category} Einstellungen unverändert - überspringe Speicherung`);
            return true;
        }
    };

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
        activity: '#6b7280'
    };

    // Firestore-Funktionen für Farbeinstellungen
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

    // Firestore-Funktionen für Log-Filter-Einstellungen
    const saveLogFiltersToFirestore = async (filterSettings) => {
        try {
            const response = await fetch('/admin/api/save-user-settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    category: 'log_filters',
                    settings: filterSettings
                })
            });
            
            if (response.ok) {
                window.log?.('info', 'Log-Filter-Einstellungen in Firestore gespeichert');
                return true;
            } else {
                throw new Error('Fehler beim Speichern der Log-Filter in Firestore');
            }
        } catch (error) {
            window.log?.('err', `Firestore-Speicherung der Log-Filter fehlgeschlagen: ${error.message}`);
            return false;
        }
    };

    const loadLogFiltersFromFirestore = async () => {
        try {
            const response = await fetch('/admin/api/get-user-settings?category=log_filters');
            if (response.ok) {
                const data = await response.json();
                if (data.settings) {
                    window.log?.('info', 'Log-Filter-Einstellungen aus Firestore geladen');
                    return data.settings;
                }
            }
        } catch (error) {
            window.log?.('warn', `Firestore-Laden der Log-Filter fehlgeschlagen: ${error.message}`);
        }
        return null;
    };

    // Hilfsfunktionen für Log-Filter-Einstellungen
    const collectLogFilterSettings = () => {
        const filterSettings = {};
        const logFilters = document.querySelectorAll('.log-filter');
        
        logFilters.forEach(filter => {
            const settingKey = filter.dataset.setting;
            filterSettings[settingKey] = filter.checked;
        });
        
        // Auch andere log-bezogene Einstellungen einschließen
        const additionalLogSettings = [
            'show_log_console',
            'log_to_browser_console', 
            'log_autoscroll_enabled',
            'log_order_reversed',
            'logs_enabled'
        ];
        
        additionalLogSettings.forEach(setting => {
            const element = document.querySelector(`[data-setting="${setting}"]`);
            if (element) {
                filterSettings[setting] = element.checked;
            }
        });
        
        return filterSettings;
    };

    const applyLogFilterSettings = (filterSettings) => {
        Object.entries(filterSettings).forEach(([settingKey, value]) => {
            const element = document.querySelector(`[data-setting="${settingKey}"]`);
            if (element) {
                element.checked = value;
                localStorage.setItem(settingKey, value);
            }
        });
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
            
            // Verzögertes Speichern mit Change Detection
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(async () => {
                localStorage.setItem(`log_color_${logType}`, color);
                
                const newColors = {};
                Object.keys(defaultColors).forEach(type => {
                    newColors[type] = localStorage.getItem(`log_color_${type}`) || defaultColors[type];
                });
                
                // Nur speichern wenn sich Farben geändert haben
                await saveIfChanged('colors', newColors, saveToFirestore);
            }, 1000);
        });
    });

    // Reset-Button Event-Listener
    if (resetColorsBtn) {
        resetColorsBtn.addEventListener('click', () => {
            resetConfirmText.textContent = 'Möchten Sie wirklich alle Farben auf die Standardwerte zurücksetzen?';
            resetConfirmModal.style.display = 'flex';
            
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

    // Initialisierung der Log-Filter-Einstellungen
    const initializeLogFilters = async () => {
        try {
            // Versuche Log-Filter aus Firestore zu laden
            const firestoreFilters = await loadLogFiltersFromFirestore();
            
            if (firestoreFilters) {
                // Firestore-Einstellungen anwenden (Meldung wird bereits in loadLogFiltersFromFirestore ausgegeben)
                applyLogFilterSettings(firestoreFilters);
            } else {
                // Fallback: nur localStorage verwenden
                updateSwitchesFromStorage();
                window.log?.('info', 'Log-Filter-Einstellungen aus localStorage geladen');
            }
        } catch (error) {
            // Bei Fehlern: localStorage als Fallback
            updateSwitchesFromStorage();
            window.log?.('warn', `Log-Filter-Initialisierung fehlgeschlagen: ${error.message}`);
        }
        
        toggleLogSettingsPanel();
    };

    // Initialen Zustand für alle Schalter laden
    initializeLogFilters();

    // Event-Listener für alle Schalter
    settingSwitches.forEach(toggle => {
        toggle.addEventListener('change', async (event) => {
            const settingKey = event.target.dataset.setting;
            const settingValue = event.target.checked;
            
            if (settingKey.startsWith('log_') || settingKey === 'show_log_console' || settingKey === 'logs_enabled') {
                localStorage.setItem(settingKey, settingValue);
                showNotification(`Einstellung '${settingKey}' lokal gespeichert.`);
                
                // Log-Filter-Einstellungen auch in Firestore speichern mit Change Detection
                const filterSettings = collectLogFilterSettings();
                await saveIfChanged('logFilters', filterSettings, saveLogFiltersToFirestore);
                
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

    // Initialize current settings from existing values
    const initializeCurrentSettings = () => {
        // Load current colors
        const currentColors = {};
        Object.keys(defaultColors).forEach(type => {
            currentColors[type] = localStorage.getItem(`log_color_${type}`) || defaultColors[type];
        });
        currentSettings.colors = currentColors;
        
        // Load current log filters
        currentSettings.logFilters = collectLogFilterSettings();
        
        // Load current admin settings
        const adminSettings = {};
        settingSwitches.forEach(toggle => {
            const settingKey = toggle.getAttribute('data-setting');
            adminSettings[settingKey] = localStorage.getItem(settingKey) === 'true';
        });
        currentSettings.adminSettings = adminSettings;
        
        window.log?.('info', 'Current settings initialized for change detection');
    };

    // Initialize settings on page load
    initializeCurrentSettings();

    // Listener, um die Schalter zu aktualisieren, wenn die Konsole extern geändert wird
    window.addEventListener('settings-updated', updateSwitchesFromStorage);
});
