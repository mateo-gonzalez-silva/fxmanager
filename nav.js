
function toggleMenu() {
    const hamburger = document.getElementById('hamburger-btn');
    const navLinks = document.getElementById('nav-links');
    hamburger.classList.toggle('active');
    navLinks.classList.toggle('active');
}

document.addEventListener('DOMContentLoaded', () => {
    const hamburger = document.getElementById('hamburger-btn');
    if (hamburger) {
        hamburger.addEventListener('click', toggleMenu);
    }

    // Close the menu when a link is clicked
    const navLinks = document.querySelectorAll('.nav-links a');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            const hamburger = document.getElementById('hamburger-btn');
            const navLinks = document.getElementById('nav-links');
            if (hamburger.classList.contains('active')) {
                hamburger.classList.remove('active');
                navLinks.classList.remove('active');
            }
        });
    });
});
