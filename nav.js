document.addEventListener('DOMContentLoaded', () => {
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const navLinks = document.getElementById('nav-links');

    if (hamburgerBtn && navLinks) {
        hamburgerBtn.addEventListener('click', () => {
            hamburgerBtn.classList.toggle('active');
            navLinks.classList.toggle('active');
        });

        // Close menu when a link is clicked
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                if (hamburgerBtn.classList.contains('active')) {
                    hamburgerBtn.classList.remove('active');
                    navLinks.classList.remove('active');
                }
            });
        });
    }
});
