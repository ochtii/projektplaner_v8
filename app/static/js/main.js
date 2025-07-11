// location: app/static/js/main.js
// Globales JavaScript für die Anwendung

document.addEventListener('DOMContentLoaded', (event) => {
    // --- Theme Switcher Logic ---
    const themeToggle = document.getElementById('theme-toggle');
    const body = document.body;

    // Funktion, um das Theme anzuwenden
    const applyTheme = (theme) => {
        if (theme === 'dark') {
            body.classList.add('dark-mode');
            if (themeToggle) themeToggle.checked = true;
        } else {
            body.classList.remove('dark-mode');
            if (themeToggle) themeToggle.checked = false;
        }
    };

    // Event Listener für den Umschalter
    if (themeToggle) {
        themeToggle.addEventListener('change', () => {
            const newTheme = themeToggle.checked ? 'dark' : 'light';
            localStorage.setItem('theme', newTheme);
            applyTheme(newTheme);
        });
    }

    // Gespeichertes Theme beim Laden anwenden, Standard ist 'dark'
    const savedTheme = localStorage.getItem('theme') || 'dark';
    applyTheme(savedTheme);


    // --- Bestehende Logik ---
    // Logik für das Schließen von Modals
    const newProjectModal = document.getElementById('newProjectModal');
    if (newProjectModal) {
        const closeButton = newProjectModal.querySelector('.close');
        
        if(closeButton) {
            closeButton.onclick = function() {
                newProject_modal.style.display = "none";
            }
        }
        window.onclick = function(event) {
            if (event.target == newProjectModal) {
                newProjectModal.style.display = "none";
            }
        }
    }

    // Logik für das Schließen von Flash-Nachrichten
    const flashMessages = document.querySelectorAll('.flash');
    flashMessages.forEach(function(message) {
        message.addEventListener('click', function() {
            message.style.transition = 'opacity 0.5s';
            message.style.opacity = '0';
            setTimeout(() => message.remove(), 500);
        });
    });
});
