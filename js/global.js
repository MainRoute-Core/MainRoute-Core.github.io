
window.addEventListener('load', () => {
    const loader = document.getElementById('loader');
    setTimeout(() => {
        loader.classList.add('hidden');
    }, 2000);
});

document.getElementById('year').textContent = new Date().getFullYear();

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

const menuBtn = document.getElementById('mobile-menu-btn');
const mobileMenu = document.getElementById('mobile-menu');

menuBtn.addEventListener('click', () => {
    mobileMenu.classList.toggle('active');
});

document.querySelectorAll('#mobile-menu a').forEach(link => {
    link.addEventListener('click', () => mobileMenu.classList.remove('active'));
});

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

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        console.log("System initialized with zero external dependencies.");
    });
}