/* ------ Menu toggle ------ */
const menuButton = document.getElementById('menuButton');
const menuClose = document.getElementById('menuClose');
const siteMenu = document.getElementById('siteMenu');
const backdrop = document.getElementById('backdrop');

function openMenu() {
  siteMenu.classList.add('open');
  siteMenu.setAttribute('aria-hidden', 'false');
  menuButton.setAttribute('aria-expanded', 'true');
  backdrop.hidden = false;
  
  const firstLink = siteMenu.querySelector('.menu-link');
  firstLink?.focus();
}

function closeMenu() {
  siteMenu.classList.remove('open');
  siteMenu.setAttribute('aria-hidden', 'true');
  menuButton.setAttribute('aria-expanded', 'false');
  backdrop.hidden = true;
  menuButton.focus();
}

menuButton?.addEventListener('click', openMenu);
menuClose?.addEventListener('click', closeMenu);
backdrop?.addEventListener('click', closeMenu);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeMenu();
});

/* ----- Navigation & Menu Close Handling ----- */
document.querySelectorAll('[data-nav]').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const href = link.getAttribute('href');
    closeMenu();
    const target = document.querySelector(href);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

/* ----- Hero load animations & Footer Dynamic Year ------ */
const heroName = document.getElementById('heroName');
const heroTitle = document.getElementById('heroTitle');
const heroCta = document.querySelector('.hero-cta');

window.addEventListener('load', () => {
  // Trigger pure CSS transitions using your existing .revealed class
  setTimeout(() => {
    heroName?.classList.add('revealed');
  }, 160);

  setTimeout(() => {
    heroTitle?.classList.add('revealed');
  }, 420);

  setTimeout(() => {
    heroCta?.classList.add('revealed');
  }, 680);

  // Set current footer copyright year dynamically
  const year = new Date().getFullYear();
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = year;
});

/* ----- General Smooth Scroll ----- */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', function(e) {
    const href = this.getAttribute('href');
    if (href === '#') return;
    const target = document.querySelector(href);
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

/* ----- Scroll Animation Intersection Observer (data-animate) ----- */
(() => {
  const opts = {
    root: null,
    rootMargin: '0px 0px -10% 0px', 
    threshold: 0.12
  };

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        obs.unobserve(entry.target);
      }
    });
  }, opts);

  document.querySelectorAll('[data-animate]').forEach(n => observer.observe(n));
})();