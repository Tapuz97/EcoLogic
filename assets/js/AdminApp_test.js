// Minimal AdminApp.js test version
console.log('AdminApp TEST: Script loaded successfully');
console.log('AdminApp TEST: Body dataset page:', document.body?.dataset?.page);

// Test icon initialization
document.addEventListener('DOMContentLoaded', () => {
    console.log('AdminApp TEST: DOM loaded');
    
    // Simple icon initialization
    const icons = document.querySelectorAll('img[data-icon]');
    console.log('AdminApp TEST: Found', icons.length, 'icons');
    
    icons.forEach(img => {
        const iconName = img.dataset.icon;
        const iconSrc = `/assets/icons/${iconName}.svg`;
        console.log('AdminApp TEST: Setting icon', iconName, 'to', iconSrc);
        img.src = iconSrc;
    });
    
    // Test page detection
    const page = document.body?.dataset?.page || 'unknown';
    console.log('AdminApp TEST: Current page is:', page);
});