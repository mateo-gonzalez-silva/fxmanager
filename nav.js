document.addEventListener('DOMContentLoaded', () => {
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const navLinks = document.getElementById('nav-links');

    if (!hamburgerBtn || !navLinks) return;

    // Accessibility initial state
    hamburgerBtn.setAttribute('aria-expanded', 'false');
    navLinks.setAttribute('aria-hidden', 'true');

    function closeMenu() {
        hamburgerBtn.classList.remove('active');
        navLinks.classList.remove('active');
        hamburgerBtn.setAttribute('aria-expanded', 'false');
        navLinks.setAttribute('aria-hidden', 'true');
    }

    function openMenu() {
        hamburgerBtn.classList.add('active');
        navLinks.classList.add('active');
        hamburgerBtn.setAttribute('aria-expanded', 'true');
        navLinks.setAttribute('aria-hidden', 'false');
    }

    function toggleMenu() {
        const isOpen = hamburgerBtn.classList.contains('active');
        if (isOpen) {
            closeMenu();
        } else {
            openMenu();
        }
    }

    hamburgerBtn.addEventListener('click', toggleMenu);

    // Close menu when a link is clicked
    navLinks.addEventListener('click', (event) => {
        if (event.target.tagName === 'A') {
            closeMenu();
        }
    });

    // Close menu when clicking outside
    document.addEventListener('click', (event) => {
        if (!navLinks.contains(event.target) && !hamburgerBtn.contains(event.target)) {
            closeMenu();
        }
    });
});
