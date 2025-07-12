// location: app/static/js/theme_switcher.js
// Theme Switcher für Dark/Light Mode pro User

document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('theme-toggle');
    const body = document.body;
    
    // Get current user theme from global variable or default to dark
    let currentTheme = window.USER_THEME || 'dark';
    
    // Apply theme on page load
    applyTheme(currentTheme);
    
    // Set toggle position based on current theme
    if (themeToggle) {
        themeToggle.checked = currentTheme === 'light';
        console.log(`Theme: ${currentTheme}, Toggle checked: ${themeToggle.checked}`);
    }
    
    // Theme toggle event listener
    if (themeToggle) {
        themeToggle.addEventListener('change', async (e) => {
            const newTheme = e.target.checked ? 'light' : 'dark';
            
            try {
                // Save theme preference to backend
                const response = await fetch('/auth/api/update-user-preferences', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        setting: 'theme',
                        value: newTheme
                    })
                });
                
                if (response.ok) {
                    currentTheme = newTheme;
                    applyTheme(currentTheme);
                    window.log?.('info', `Theme changed to ${newTheme}`);
                } else {
                    // Revert toggle if save failed
                    e.target.checked = currentTheme === 'light';
                    window.log?.('err', 'Failed to save theme preference');
                }
            } catch (error) {
                // Revert toggle if error occurred
                e.target.checked = currentTheme === 'light';
                window.log?.('err', `Theme save error: ${error.message}`);
            }
        });
    }
    
    function applyTheme(theme) {
        body.classList.remove('theme-dark', 'theme-light');
        body.classList.add(`theme-${theme}`);
        
        console.log(`Applied theme: ${theme}, Body classes:`, body.className);
        
        // Theme is now controlled by CSS variables defined in style.css
        // No need to manually set CSS properties here
    }
});
