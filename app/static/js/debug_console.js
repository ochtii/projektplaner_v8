// location: app/static/js/debug_console.js
// Steuert die Funktionalität der globalen Live-Log-Konsole.

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

    const appendLog = (logItem, save = true) => {
        const typeEnabled = localStorage.getItem(`log_${logItem.type}`) !== 'false';
        if (!typeEnabled) return;

        const p = document.createElement('p');
        p.className = `log-${logItem.type}`;
        p.textContent = `[${logItem.time}] [${logItem.type.toUpperCase()}] ${logItem.message}`;
        
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

        if (save) {
            const logs = getLogs();
            logs.push(logItem);
            saveLogs(logs);
        }
    };
    
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
                window.dispatchEvent(new CustomEvent('settings-updated'));
                renderLogsFromStorage();
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

    // --- Globale Log-Funktion & API Fetch Wrapper ---
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
        const [url, config] = args;
        
        log('api_req', `Request: ${config ? config.method || 'GET' : 'GET'} ${url}`);
        
        if (url.toString().includes('googleapis.com')) {
            log('database', `Firebase Request to: ${url}`);
        }

        try {
            const response = await originalFetch(...args);
            const responseClone = response.clone();
            
            log('api_ans', `Response: ${response.status} ${response.statusText} from ${url}`);
            
            return response;
        } catch (error) {
            log('err', `Fetch Error: ${error.message}`);
            throw error;
        }
    };

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
        
        appendLog(logItem, true);
    };
    
    // --- Initialisierung ---
    renderLogsFromStorage();
    updateConsoleVisibility();
    updateConsoleButtons();

    document.body.addEventListener('click', (e) => {
        if (e.target.closest('.log-console') || e.target.closest('.modal')) return;
        if (e.target.tagName === 'BUTTON' || e.target.tagName === 'A') {
            const targetText = e.target.textContent.trim() || e.target.title || e.target.id;
            if (targetText) log('activity', `Klick auf '${targetText}' (${e.target.tagName})`);
        }
    }, true);
});
