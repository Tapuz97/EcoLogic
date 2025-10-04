// ThemeToggle.js - Root level theme toggle functionality
(function() {
    'use strict';
    
    // Simple icon path resolver - works from any page depth
    function getIconPath(iconName) {
        // Get the base path from the body's data attribute or detect it
        const body = document.body;
        const iconBase = body ? body.getAttribute('data-icon-base') : null;
        
        if (iconBase) {
            return iconBase + iconName;
        }
        
        // Fallback: detect current depth and build path
        const pathDepth = window.location.pathname.split('/').length - 2;
        const prefix = pathDepth > 0 ? '../'.repeat(pathDepth) : './';
        return prefix + 'assets/icons/' + iconName;
    }
    
    // Find the main CSS link - works with Vite's hashed filenames
    function findMainCssLink() {
        const cssLinks = document.querySelectorAll('link[rel="stylesheet"]');
        
        // First try to find by ID
        let mainCssLink = document.getElementById('theme-css');
        if (mainCssLink) return mainCssLink;
        
        // Find the main CSS file (usually contains 'css' in the path)
        for (const link of cssLinks) {
            if (link.href && link.href.includes('/assets/css/') && !link.href.includes('fonts')) {
                link.id = 'theme-css';
                return link;
            }
        }
        
        // Fallback to first CSS link
        if (cssLinks.length > 0) {
            cssLinks[0].id = 'theme-css';
            return cssLinks[0];
        }
        
        return null;
    }
    
    function initThemeToggle() {
        const toggleButton = document.getElementById('themeToggle');
        if (!toggleButton) return;
        
        // Handle profile page special positioning
        const page = document.body?.dataset?.page || '';
        if (page === 'profile') {
            // Move the toggle to the settings title area and add inline styling
            const settingsHead = document.querySelector('section[aria-labelledby="settings-title"] .recent-head');
            if (settingsHead) {
                toggleButton.classList.add('theme-toggle--inline');
                settingsHead.appendChild(toggleButton);
                // Add some styling to position it on the right
                settingsHead.style.display = 'flex';
                settingsHead.style.justifyContent = 'space-between';
                settingsHead.style.alignItems = 'center';
            }
        }
        
        const savedTheme = localStorage.getItem('theme') || 'light';
        
        // Apply theme on load
        applyTheme(savedTheme);
        
        // Add click handler
        toggleButton.addEventListener('click', function() {
            const currentTheme = localStorage.getItem('theme') || 'light';
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            applyTheme(newTheme);
        });
    }
    
    function applyTheme(theme) {
        localStorage.setItem('theme', theme);
        
        const toggleButton = document.getElementById('themeToggle');
        const cssLink = findMainCssLink();
        
        // Update the theme toggle button state for animations
        if (toggleButton) {
            const isDark = theme === 'dark';
            toggleButton.setAttribute('aria-pressed', isDark.toString());
            toggleButton.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
        }
        
        // For production builds, we might need to create theme CSS files
        // or modify the existing CSS file's href to point to theme variants
        if (cssLink) {
            const baseHref = cssLink.href;
            
            // Check if we have separate theme files
            const lightCssPath = getThemeCssPath('light');
            const darkCssPath = getThemeCssPath('dark');
            
            // Try to load the appropriate theme CSS
            if (theme === 'dark') {
                tryLoadCss(darkCssPath, cssLink);
            } else {
                tryLoadCss(lightCssPath, cssLink);
            }
        }
        
        // Add theme class to document
        document.documentElement.className = document.documentElement.className
            .replace(/theme-\w+/g, '') + ' theme-' + theme;

        // Dispatch theme change event for charts and other components
        window.dispatchEvent(new CustomEvent("ecologic:theme-change", { detail: { theme: theme }}));
    }
    
    function getThemeCssPath(theme) {
        const pathDepth = window.location.pathname.split('/').length - 2;
        const prefix = pathDepth > 0 ? '../'.repeat(pathDepth) : './';
        return prefix + 'assets/css/style_' + theme + '.css';
    }
    
    function tryLoadCss(cssPath, fallbackLink) {
        // Check if the CSS file exists by trying to load it
        const testLink = document.createElement('link');
        testLink.rel = 'stylesheet';
        testLink.href = cssPath;
        testLink.onload = function() {
            // Successfully loaded, replace the main CSS
            if (fallbackLink) {
                fallbackLink.href = cssPath;
            }
        };
        testLink.onerror = function() {
            // CSS file doesn't exist, keep using the main CSS
            console.log('Theme CSS not found, using main CSS:', cssPath);
        };
        
        // Try loading it invisibly
        testLink.style.display = 'none';
        document.head.appendChild(testLink);
        
        // Clean up test link after a moment
        setTimeout(() => {
            if (testLink.parentNode) {
                testLink.parentNode.removeChild(testLink);
            }
        }, 1000);
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initThemeToggle);
    } else {
        initThemeToggle();
    }
    
})();