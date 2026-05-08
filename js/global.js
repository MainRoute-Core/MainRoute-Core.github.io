
window.addEventListener('load', () => {
    const loader = document.getElementById('loader');
    // Adding a tiny delay so the animation is visible briefly
    setTimeout(() => {
        loader.classList.add('hidden');
    }, 2000);
});

// 2. Set Footer Year
document.getElementById('year').textContent = new Date().getFullYear();

// 3. Scroll Progress Bar & Header Shrink
const progressBar = document.getElementById('scroll-progress');
const header = document.getElementById('navbar');

window.addEventListener('scroll', () => {
    const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
    const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrolled = (winScroll / height) * 100;
    progressBar.style.width = scrolled + '%';

    if (winScroll > 50) {
        header.style.transform = "translateY(-0.5rem)";
    } else {
        header.style.transform = "translateY(0)";
    }
});

// 4. Mobile Menu Toggle
const menuBtn = document.getElementById('mobile-menu-btn');
const mobileMenu = document.getElementById('mobile-menu');

menuBtn.addEventListener('click', () => {
    mobileMenu.classList.toggle('active');
});

document.querySelectorAll('#mobile-menu a').forEach(link => {
    link.addEventListener('click', () => mobileMenu.classList.remove('active'));
});

// 5. High-Performance Intersection Observer (Replaces GSAP/ScrollTrigger)
const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.15
};

const scrollObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('active');
            observer.unobserve(entry.target); // Run once
        }
    });
}, observerOptions);

document.querySelectorAll('.reveal, .scale-in').forEach(el => {
    scrollObserver.observe(el);
});

// 6. PWA Registration Stub
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // navigator.serviceWorker.register('/sw.js');
        console.log("System initialized with zero external dependencies.");
    });
}