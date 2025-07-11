// location: app/static/js/debug_console.js
// Steuert die Funktionalität der globalen Live-Log-Konsole.

// Sofortige Initialisierung der globalen Log-Funktion
window.log = (type, message) => {
    const logsEnabled = localStorage.getItem('logs_enabled') === 'true';
    if (!logsEnabled) return;

    const logToBrowser = localStorage.getItem('log_to_browser_console') === 'true';
    const logItem = {
        type,
        message: typeof message === 'object' ? JSON.stringify(message) : message,
        time: new Date().toLocaleTimeString()
    };

    if (logToBrowser) {
        console.log(`[${logItem.time}] [${logItem.type.toUpperCase()}] ${logItem.message}`);
    }
    
    // Logs in sessionStorage zwischenspeichern, falls die Konsole noch nicht bereit ist
    const LOG_STORAGE_KEY = 'live_log_messages';
    const MAX_LOGS = 100;
    const logs = JSON.parse(sessionStorage.getItem(LOG_STORAGE_KEY) || '[]');
    logs.push(logItem);
    sessionStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(logs.slice(-MAX_LOGS)));
    
    // Event für die Konsole senden, falls sie bereits geladen ist
    window.dispatchEvent(new CustomEvent('newLogEntry', { detail: logItem }));
};

// Sofortige API-Überwachung einrichten
const originalFetch = window.fetch;
if (originalFetch) {
    window.fetch = async function(...args) {
        const [url, config] = args;
        const method = config ? config.method || 'GET' : 'GET';
        const urlString = url.toString();
        
        // API Request Logging
        window.log('api_req', `${method} ${urlString}`);
        
        // Firebase/Firestore spezifische Logs
        if (urlString.includes('firestore.googleapis.com')) {
            window.log('firestore', `Firestore ${method}: ${urlString.split('/').pop()}`);
        } else if (urlString.includes('firebase') || urlString.includes('googleapis.com')) {
            window.log('database', `Firebase ${method}: ${urlString}`);
        }

        try {
            const response = await originalFetch(...args);
            
            // API Response Logging
            window.log('api_ans', `${response.status} ${response.statusText} - ${method} ${urlString}`);
            
            // Firebase/Firestore Response Logging
            if (urlString.includes('firestore.googleapis.com')) {
                if (response.ok) {
                    window.log('firestore', `Firestore Response: ${response.status} - Success`);
                } else {
                    window.log('firestore', `Firestore Error: ${response.status} ${response.statusText}`);
                }
            } else if (urlString.includes('firebase') || urlString.includes('googleapis.com')) {
                if (response.ok) {
                    window.log('database', `Firebase Response: ${response.status} - Success`);
                } else {
                    window.log('database', `Firebase Error: ${response.status} ${response.statusText}`);
                }
            }
            
            return response;
        } catch (error) {
            window.log('err', `Fetch Error: ${error.message} - ${method} ${urlString}`);
            
            // Firebase/Firestore Error Logging
            if (urlString.includes('firestore.googleapis.com')) {
                window.log('firestore', `Firestore Connection Error: ${error.message}`);
            } else if (urlString.includes('firebase') || urlString.includes('googleapis.com')) {
                window.log('database', `Firebase Connection Error: ${error.message}`);
            }
            
            throw error;
        }
    };
}

// XMLHttpRequest Überwachung
const originalXHROpen = XMLHttpRequest.prototype.open;
const originalXHRSend = XMLHttpRequest.prototype.send;

XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
    this._method = method;
    this._url = url;
    window.log('api_req', `XHR ${method} ${url}`);
    return originalXHROpen.apply(this, arguments);
};

XMLHttpRequest.prototype.send = function(data) {
    const xhr = this;
    const originalOnLoad = xhr.onload;
    const originalOnError = xhr.onerror;
    
    xhr.addEventListener('load', function() {
        window.log('api_ans', `XHR ${xhr.status} ${xhr.statusText} - ${xhr._method} ${xhr._url}`);
        if (originalOnLoad) originalOnLoad.apply(this, arguments);
    });
    
    xhr.addEventListener('error', function() {
        window.log('err', `XHR Error - ${xhr._method} ${xhr._url}`);
        if (originalOnError) originalOnError.apply(this, arguments);
    });
    
    return originalXHRSend.apply(this, arguments);
};

document.addEventListener('DOMContentLoaded', () => {
    const logConsole = document.getElementById('log-console');
    if (!logConsole) return;

    const closeBtn = document.getElementById('log-close-btn');
    const clearBtn = document.getElementById('log-clear-btn');
    const settingsBtn = document.getElementById('log-settings-btn');
    const reverseBtn = document.getElementById('log-reverse-btn');
    const autoscrollBtn = document.getElementById('log-autoscroll-btn');
    const settingsPopup = document.getElementById('log-settings-popup');
    const popupCloseBtn = document.getElementById('popup-close-btn');
    const mainContent = document.querySelector('main.container');
    const logContent = logConsole.querySelector('.log-content');
    
    const confirmModal = document.getElementById('confirm-modal');
    const confirmModalText = document.getElementById('confirm-modal-text');
    const confirmYesBtn = document.getElementById('confirm-modal-yes');
    const confirmNoBtn = document.getElementById('confirm-modal-no');

    const LOG_STORAGE_KEY = 'live_log_messages';
    const MAX_LOGS = 100;

    const logTypes = [
        { key: 'info', label: 'Info' },
        { key: 'warn', label: 'Warnungen' },
        { key: 'err', label: 'Fehler' },
        { key: 'api_req', label: 'API Anfragen' },
        { key: 'api_ans', label: 'API Antworten' },
        { key: 'database', label: 'Datenbank' },
        { key: 'firestore', label: 'Datenbank (Firestore)' },
        { key: 'activity', label: 'Aktivitäten' }
    ];

    // --- Hilfsfunktionen ---
    const getLogs = () => JSON.parse(sessionStorage.getItem(LOG_STORAGE_KEY) || '[]');
    const saveLogs = (logs) => sessionStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(logs.slice(-MAX_LOGS)));

    // --- Rendering & Sichtbarkeit ---
    const renderLogsFromStorage = () => {
        logContent.innerHTML = '';
        const logs = getLogs();
        logs.forEach(logItem => appendLog(logItem, false));
    };
    
    // Global verfügbar machen für externe Aufrufe
    window.renderLogsFromStorage = renderLogsFromStorage;

    const appendLog = (logItem, save = true) => {
        const typeEnabled = localStorage.getItem(`log_${logItem.type}`) !== 'false';
        if (!typeEnabled) return;

        const p = document.createElement('p');
        p.className = 'log-entry';
        p.setAttribute('data-type', logItem.type); // Für CSS-Fallback
        
        // Erstelle strukturierten Log-Eintrag mit nur gefärbtem Typ
        const timeSpan = document.createElement('span');
        timeSpan.className = 'log-time';
        timeSpan.textContent = `[${logItem.time}] `;
        
        const typeSpan = document.createElement('span');
        typeSpan.className = `log-type log-type-${logItem.type}`;
        typeSpan.textContent = `[${logItem.type.toUpperCase()}] `;
        
        const messageSpan = document.createElement('span');
        messageSpan.className = 'log-message';
        messageSpan.textContent = logItem.message;
        
        p.appendChild(timeSpan);
        p.appendChild(typeSpan);
        p.appendChild(messageSpan);
        
        const isReversed = localStorage.getItem('log_order_reversed') === 'true';
        const autoScroll = localStorage.getItem('log_autoscroll_enabled') !== 'false';

        if (isReversed) {
            logContent.prepend(p);
            if (autoScroll) {
                setTimeout(() => logContent.scrollTop = 0, 0);
            }
        } else {
            logContent.appendChild(p);
            if (autoScroll) {
                setTimeout(() => logContent.scrollTop = logContent.scrollHeight, 0);
            }
        }

        // Nicht in sessionStorage speichern, da das bereits global gemacht wird
    };
    
    // Event Listener für neue Log-Einträge
    window.addEventListener('newLogEntry', (event) => {
        appendLog(event.detail, false);
    });
    
    const updateConsoleVisibility = () => {
        const logsEnabled = localStorage.getItem('logs_enabled') === 'true';
        const showConsole = localStorage.getItem('show_log_console') === 'true';
        const shouldBeVisible = logsEnabled && showConsole;

        logConsole.style.display = shouldBeVisible ? 'flex' : 'none';
        if (mainContent) {
            mainContent.style.paddingBottom = shouldBeVisible ? (logConsole.offsetHeight + 20) + 'px' : '20px';
        }
    };

    const updateConsoleButtons = () => {
        const isReversed = localStorage.getItem('log_order_reversed') === 'true';
        const isAutoscroll = localStorage.getItem('log_autoscroll_enabled') !== 'false';
        if(reverseBtn) reverseBtn.classList.toggle('active', isReversed);
        if(autoscrollBtn) {
            autoscrollBtn.classList.toggle('active', isAutoscroll);
            autoscrollBtn.querySelector('i').classList.toggle('rotated', isReversed);
        }
    };

    // --- Einstellungs-Popup ---
    const buildSettingsPopup = () => {
        const filterGrid = settingsPopup.querySelector('.log-filter-grid');
        filterGrid.innerHTML = '';
        logTypes.forEach(logType => {
            const isChecked = localStorage.getItem(`log_${logType.key}`) !== 'false';
            const label = document.createElement('label');
            label.className = 'custom-checkbox';
            label.innerHTML = `
                <input type="checkbox" class="setting-switch log-filter" id="popup-log-${logType.key}" data-setting="log_${logType.key}" ${isChecked ? 'checked' : ''}>
                <span class="checkbox-box"></span>
                <span class="checkbox-label">${logType.label}</span>
            `;
            filterGrid.appendChild(label);
        });

        settingsPopup.querySelectorAll('.setting-switch').forEach(toggle => {
            toggle.addEventListener('change', (e) => {
                localStorage.setItem(e.target.dataset.setting, e.target.checked);
                
                // Sofortige Aktualisierung der Anzeige
                renderLogsFromStorage();
                updateConsoleVisibility();
                updateConsoleButtons();
                
                // Event für andere Komponenten
                window.dispatchEvent(new CustomEvent('settings-updated'));
            });
        });
    };

    // --- Bestätigungs-Modal ---
    const showConfirmModal = (text, onConfirm) => {
        confirmModalText.textContent = text;
        confirmModal.style.display = 'block';

        const confirmHandler = () => {
            onConfirm();
            hideConfirmModal();
        };
        const cancelHandler = () => hideConfirmModal();

        confirmYesBtn.addEventListener('click', confirmHandler, { once: true });
        confirmNoBtn.addEventListener('click', cancelHandler, { once: true });
        confirmModal.addEventListener('click', (e) => {
            if (e.target === confirmModal) hideConfirmModal();
        }, { once: true });
    };
    const hideConfirmModal = () => confirmModal.style.display = 'none';

    // --- Event Listeners ---
    closeBtn.addEventListener('click', () => {
        localStorage.setItem('show_log_console', 'false');
        window.dispatchEvent(new CustomEvent('settings-updated'));
    });

    clearBtn.addEventListener('click', () => {
        showConfirmModal('Möchten Sie wirklich alle Logs in dieser Sitzung löschen?', () => {
            sessionStorage.removeItem(LOG_STORAGE_KEY);
            renderLogsFromStorage();
        });
    });

    reverseBtn.addEventListener('click', () => {
        const isReversed = localStorage.getItem('log_order_reversed') === 'true';
        localStorage.setItem('log_order_reversed', !isReversed);
        window.dispatchEvent(new CustomEvent('settings-updated'));
        renderLogsFromStorage();
    });

    autoscrollBtn.addEventListener('click', () => {
        const isEnabled = localStorage.getItem('log_autoscroll_enabled') !== 'false';
        localStorage.setItem('log_autoscroll_enabled', !isEnabled);
        window.dispatchEvent(new CustomEvent('settings-updated'));
    });

    settingsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        buildSettingsPopup();
        settingsPopup.style.display = settingsPopup.style.display === 'block' ? 'none' : 'block';
    });

    popupCloseBtn.addEventListener('click', () => settingsPopup.style.display = 'none');

    document.addEventListener('click', (e) => {
        if (!settingsPopup.contains(e.target) && e.target !== settingsBtn) {
            settingsPopup.style.display = 'none';
        }
    });

    window.addEventListener('settings-updated', () => {
        updateConsoleVisibility();
        updateConsoleButtons();
    });

    // Event-Listener für Farbänderungen
    window.addEventListener('log-colors-updated', (event) => {
        const detail = event.detail;
        if (!detail || !detail.logType || !detail.color) return;
        
        // Info-Log in Debug-Konsole
        window.log('info', `Farbe aktualisiert: ${detail.logType} → ${detail.color}`);
        
        // Konsolen-Hintergrund aktualisieren
        if (detail.logType === 'console_background') {
            if (logConsole) {
                logConsole.style.backgroundColor = detail.color;
            }
            document.documentElement.style.setProperty('--console-bg-color', detail.color);
            const consoleBgPreview = document.querySelector('.console-bg-preview');
            if (consoleBgPreview) {
                consoleBgPreview.style.backgroundColor = detail.color;
            }
        } 
        // Header-Hintergrund aktualisieren
        else if (detail.logType === 'header_bg') {
            const logHeader = document.querySelector('.log-header');
            if (logHeader) {
                logHeader.style.backgroundColor = detail.color;
            }
            document.documentElement.style.setProperty('--header-bg-color', detail.color);
        } 
        // Header-Text Farbe aktualisieren
        else if (detail.logType === 'header_text') {
            const logHeader = document.querySelector('.log-header');
            if (logHeader) {
                logHeader.style.color = detail.color;
            }
            document.documentElement.style.setProperty('--header-text-color', detail.color);
        } 
        // Allgemeine Log-Text Farbe aktualisieren
        else if (detail.logType === 'log_text') {
            document.documentElement.style.setProperty('--log-text-color', detail.color);
            document.querySelectorAll('.log-message').forEach(message => {
                message.style.color = detail.color;
            });
            document.querySelectorAll('.log-entry').forEach(entry => {
                entry.style.color = detail.color;
            });
        } 
        // Timestamp Farbe aktualisieren
        else if (detail.logType === 'timestamp') {
            document.documentElement.style.setProperty('--timestamp-color', detail.color);
            document.querySelectorAll('.log-time').forEach(timestamp => {
                timestamp.style.color = detail.color;
            });
        } 
        // Spezifische Log-Type Farben aktualisieren
        else {
            document.documentElement.style.setProperty(`--log-${detail.logType}-color`, detail.color);
            document.querySelectorAll(`.log-type-${detail.logType}`).forEach(typeElement => {
                typeElement.style.color = detail.color;
            });
        }
        
        // Dynamische Styles neu anwenden
        updateDynamicStyles();
    });

    // Funktion zum Aktualisieren der dynamischen Styles
    const updateDynamicStyles = () => {
        const colors = {
            console_background: localStorage.getItem('log_color_console_background') || defaultColors.console_background,
            log_text: localStorage.getItem('log_color_log_text') || defaultColors.log_text,
            timestamp: localStorage.getItem('log_color_timestamp') || defaultColors.timestamp,
            header_bg: localStorage.getItem('log_color_header_bg') || defaultColors.header_bg,
            header_text: localStorage.getItem('log_color_header_text') || defaultColors.header_text
        };

        // Konsole Hintergrund
        if (logConsole) {
            logConsole.style.backgroundColor = colors.console_background;
        }

        // Header Farben
        const logHeader = document.querySelector('.log-header');
        if (logHeader) {
            logHeader.style.backgroundColor = colors.header_bg;
            logHeader.style.color = colors.header_text;
        }

        // Alle Log-Einträge aktualisieren
        document.querySelectorAll('.log-entry').forEach(entry => {
            entry.style.color = colors.log_text;
        });

        document.querySelectorAll('.log-message').forEach(message => {
            message.style.color = colors.log_text;
        });

        document.querySelectorAll('.log-time').forEach(timestamp => {
            timestamp.style.color = colors.timestamp;
        });

        // CSS Variablen setzen
        Object.entries(colors).forEach(([type, color]) => {
            document.documentElement.style.setProperty(`--${type.replace('_', '-')}-color`, color);
        });
    };

    // Test-Funktion für API-Logs (kann über Browser-Konsole aufgerufen werden)
    window.testApiLogging = () => {
        window.log('info', 'Testing API logging...');
        
        // Test fetch
        fetch('/admin/api/update-setting', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ test: true })
        }).catch(() => {
            // Fehler ignorieren, da es nur ein Test ist
        });
        
        // Test XHR
        const xhr = new XMLHttpRequest();
        xhr.open('GET', '/test-endpoint');
        xhr.send();
        
        window.log('info', 'API test requests sent. Check logs above.');
    };
    
    // --- Initialisierung ---
    
    // Benutzerdefinierte Log-Farben laden
    const initLogColors = () => {
        const defaultColors = {
            info: '#3b82f6',
            warn: '#f59e0b',
            err: '#ef4444',
            api_req: '#8b5cf6',
            api_ans: '#a855f7',
            database: '#10b981',
            firestore: '#059669',
            activity: '#6b7280',
            console_background: '#282c34',
            log_text: '#abb2bf',
            timestamp: '#8892b0',
            header_bg: '#1e2127',
            header_text: '#ffffff'
        };

        // Konsolen-Hintergrund setzen und mit Beispiel-Feldern synchronisieren
        const consoleBgColor = localStorage.getItem('log_color_console_background') || defaultColors.console_background;
        if (logConsole) {
            logConsole.style.backgroundColor = consoleBgColor;
        }
        
        // Header-Styling setzen
        const headerBgColor = localStorage.getItem('log_color_header_bg') || defaultColors.header_bg;
        const headerTextColor = localStorage.getItem('log_color_header_text') || defaultColors.header_text;
        const logHeader = document.querySelector('.log-header');
        if (logHeader) {
            logHeader.style.backgroundColor = headerBgColor;
            logHeader.style.color = headerTextColor;
        }
        
        // CSS-Variablen für Header setzen
        document.documentElement.style.setProperty('--header-bg-color', headerBgColor);
        document.documentElement.style.setProperty('--header-text-color', headerTextColor);
        document.documentElement.style.setProperty('--console-bg-color', consoleBgColor);
        
        // Beispiel-Feld Hintergrund synchronisieren
        const consoleBgPreview = document.querySelector('.console-bg-preview');
        if (consoleBgPreview) {
            consoleBgPreview.style.backgroundColor = consoleBgColor;
        }

        let styleElement = document.getElementById('dynamic-log-styles');
        if (!styleElement) {
            styleElement = document.createElement('style');
            styleElement.id = 'dynamic-log-styles';
            document.head.appendChild(styleElement);
        }
        
        // CSS-Regeln für neue Log-Struktur (nur Typ wird gefärbt)
        let cssRules = `
            .log-entry {
                margin: 2px 0;
                padding: 2px 8px;
                font-family: 'Courier New', monospace;
                font-size: 12px;
                line-height: 1.4;
                border-left: 3px solid transparent;
            }
            .log-time {
                color: ${localStorage.getItem('log_color_timestamp') || '#8892b0'};
                opacity: 0.8;
            }
            .log-message {
                color: ${localStorage.getItem('log_color_log_text') || '#abb2bf'};
            }
            .log-header {
                background-color: ${localStorage.getItem('log_color_header_bg') || '#1e2127'} !important;
                color: ${localStorage.getItem('log_color_header_text') || '#ffffff'} !important;
            }
        `;
        
        // CSS-Regeln für alle Log-Typen generieren (nur für .log-type-{type})
        Object.keys(defaultColors).forEach(type => {
            if (['console_background', 'log_text', 'timestamp', 'header_bg', 'header_text'].includes(type)) return; // Spezielle Typen separat behandelt
            const savedColor = localStorage.getItem(`log_color_${type}`);
            const color = savedColor || defaultColors[type];
            
            // Nur der Log-Typ wird gefärbt, plus Border-Akzent
            cssRules += `
                .log-type-${type} {
                    color: ${color} !important;
                    font-weight: bold;
                }
                .log-entry:has(.log-type-${type}) {
                    border-left-color: ${color} !important;
                }
            `;
        });
        
        styleElement.textContent = cssRules;
    };
    
    initLogColors();
    renderLogsFromStorage();
    updateConsoleVisibility();
    updateConsoleButtons();

    // Erweiterte Aktivitäts-Logs
    document.body.addEventListener('click', (e) => {
        if (e.target.closest('.log-console') || e.target.closest('.modal')) return;
        
        let logMessage = '';
        const target = e.target;
        
        if (target.tagName === 'BUTTON') {
            const buttonText = target.textContent.trim() || target.title || target.getAttribute('aria-label') || target.id;
            logMessage = `Button-Klick: '${buttonText}'`;
        } else if (target.tagName === 'A') {
            const linkText = target.textContent.trim() || target.href || target.title;
            logMessage = `Link-Klick: '${linkText}'`;
        } else if (target.tagName === 'INPUT') {
            if (target.type === 'checkbox') {
                logMessage = `Checkbox ${target.checked ? 'aktiviert' : 'deaktiviert'}: '${target.id || target.name}'`;
            } else if (target.type === 'submit') {
                logMessage = `Submit-Button: '${target.value || target.id}'`;
            }
        } else if (target.tagName === 'SELECT') {
            logMessage = `Dropdown geändert: '${target.id || target.name}' → '${target.value}'`;
        } else if (target.classList.contains('setting-switch')) {
            logMessage = `Einstellung geändert: '${target.dataset.setting}' → ${target.checked}`;
        }
        
        if (logMessage) {
            log('activity', logMessage);
        }
    }, true);

    // Form-Submit Events
    document.body.addEventListener('submit', (e) => {
        const form = e.target;
        const formName = form.id || form.action || 'Unbekanntes Formular';
        log('activity', `Formular abgesendet: '${formName}'`);
    }, true);

    // Navigation Events
    window.addEventListener('beforeunload', () => {
        log('activity', `Seite verlassen: ${window.location.pathname}`);
    });

    // Page Load
    log('activity', `Seite geladen: ${window.location.pathname}`);

    // Mode Warnings für Console Header anzeigen
    const updateModeWarnings = () => {
        const testModeWarning = document.getElementById('test-mode-warning');
        const debugModeWarning = document.getElementById('debug-mode-warning');
        
        // Use global APP_MODES if available, fallback to other methods
        const isTestMode = (window.APP_MODES && window.APP_MODES.test_mode) || 
                          localStorage.getItem('test_mode') === 'true' || 
                          window.location.search.includes('test=true');
        
        const isDebugMode = (window.APP_MODES && window.APP_MODES.debug_mode) || 
                           localStorage.getItem('debug_mode') === 'true' || 
                           window.location.search.includes('debug=true');
        
        if (testModeWarning) {
            testModeWarning.style.display = isTestMode ? 'inline-flex' : 'none';
        }
        
        if (debugModeWarning) {
            debugModeWarning.style.display = isDebugMode ? 'inline-flex' : 'none';
        }
    };

    // Mode Warnings beim Öffnen der Konsole aktualisieren
    const originalToggleConsole = window.toggleLogConsole;
    window.toggleLogConsole = function() {
        if (originalToggleConsole) {
            originalToggleConsole();
        }
        updateModeWarnings();
    };

    // Initial mode warnings update
    updateModeWarnings();
});
