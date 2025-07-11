// location: app/static/js/login_helper.js
// Füllt die Login-Felder basierend auf der Auswahl im Test-Benutzer-Dropdown aus.

document.addEventListener('DOMContentLoaded', () => {
    const testUserSelect = document.getElementById('test-user-select');
    if (!testUserSelect) return; // Skript nur ausführen, wenn das Dropdown existiert

    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');

    const testUsers = {
        admin: { email: 'testadmin@test.at', password: 'test123' },
        user: { email: 'testuser@test.at', password: 'test123' }
    };

    testUserSelect.addEventListener('change', (event) => {
        const selectedUserKey = event.target.value;
        if (selectedUserKey && testUsers[selectedUserKey]) {
            const selectedUser = testUsers[selectedUserKey];
            emailInput.value = selectedUser.email;
            passwordInput.value = selectedUser.password;
        } else {
            emailInput.value = '';
            passwordInput.value = '';
        }
    });
});
