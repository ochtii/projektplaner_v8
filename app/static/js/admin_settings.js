// location: app/static/js/admin_settings.js
// Logik für das automatische Speichern von Einstellungen auf den Admin-Seiten.

document.addEventListener('DOMContentLoaded', () => {
    const settingSwitches = document.querySelectorAll('.setting-switch');
    const notification = document.getElementById('auto-save-notification');
    const debugSettingsBtn = document.getElementById('debug-settings-btn');
    
    const logsEnabledToggle = document.getElementById('logs-enabled-toggle');
    const logSettingsPanel = document.getElementById('log-settings-panel');

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
