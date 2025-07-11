// location: app/static/js/auth_validation.js
// Logik für die Live-Validierung des Registrierungsformulars.

document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('register-form');
    if (!registerForm) return; // Skript nur ausführen, wenn das Formular existiert

    const passwordInput = document.getElementById('password');
    const passwordConfirmInput = document.getElementById('password-confirm');
    const passwordError = document.getElementById('password-error');
    const registerButton = document.getElementById('register-button');

    const validatePasswords = () => {
        // Die Validierung startet erst, wenn im "Wiederholen"-Feld getippt wird
        if (passwordConfirmInput.value.length === 0) {
            passwordError.textContent = '';
            passwordInput.classList.remove('input-error');
            passwordConfirmInput.classList.remove('input-error');
            registerButton.disabled = false;
            return;
        }

        if (passwordInput.value !== passwordConfirmInput.value) {
            passwordError.textContent = 'Die Passwörter stimmen nicht überein.';
            passwordInput.classList.add('input-error');
            passwordConfirmInput.classList.add('input-error');
            registerButton.disabled = true;
        } else {
            passwordError.textContent = '';
            passwordInput.classList.remove('input-error');
            passwordConfirmInput.classList.remove('input-error');
            registerButton.disabled = false;
        }
    };

    // Event Listener hinzufügen
    passwordInput.addEventListener('input', validatePasswords);
    passwordConfirmInput.addEventListener('input', validatePasswords);

    // Initial den Button sperren, falls die Seite mit ausgefüllten, aber unterschiedlichen Werten neu geladen wird
    if (passwordInput.value && passwordConfirmInput.value && passwordInput.value !== passwordConfirmInput.value) {
        registerButton.disabled = true;
    }
});
