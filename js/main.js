/**
 * main.js
 * Hero entrance, GSAP + ScrollTrigger reveals, navbar / mobile menu,
 * contact form, active nav link.
 *
 * Aaron Koshy Parayil Portfolio — main.js
 */

(function () {
  'use strict';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Wait for GSAP to be available (give up after ~5s) ── */
  function waitForGSAP(cb, onFail, tries = 0) {
    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
      cb();
    } else if (tries > 60) {
      onFail();
    } else {
      setTimeout(() => waitForGSAP(cb, onFail, tries + 1), 80);
    }
  }

  /* ── Show everything without animation (no GSAP / reduced motion) ── */
  function revealStatic() {
    document.documentElement.classList.remove('js');
    fillLangBars();
  }

  function fillLangBars() {
    document.querySelectorAll('.lang-bar-fill').forEach((bar) => bar.classList.add('is-filled'));
  }

  /* ═══════════════════════════════════════════════════════════════
     0. LOADER — tracks real page load, then slides away.
     Resolves once the page is revealed. (A CSS failsafe hides the
     loader on its own if this script never runs.)
  ═══════════════════════════════════════════════════════════════ */
  function initLoader() {
    const loader = document.querySelector('.loader');
    if (!loader || reducedMotion || getComputedStyle(loader).display === 'none') {
      if (loader) loader.remove();
      return Promise.resolve();
    }

    const bar = loader.querySelector('.loader-bar span');
    const pct = loader.querySelector('.loader-pct');
    const MIN_MS = 1200;   // never just flash
    const MAX_MS = 4000;   // never hold people up
    const start = performance.now();
    let loaded = document.readyState === 'complete';
    let progress = 0;

    window.addEventListener('load', () => { loaded = true; }, { once: true });
    document.documentElement.style.overflow = 'hidden';

    return new Promise((resolve) => {
      function finish() {
        loader.classList.add('is-done');
        document.documentElement.style.overflow = '';
        resolve();
        loader.addEventListener('transitionend', () => loader.remove(), { once: true });
        setTimeout(() => loader.remove(), 1500); // in case transitionend never fires
      }

      function tick(now) {
        const elapsed = now - start;
        const done = (loaded && elapsed >= MIN_MS) || elapsed >= MAX_MS;
        // Creep toward 90% while loading, then run to 100%
        const target = done ? 100 : Math.min(90, (elapsed / MIN_MS) * 70 + (loaded ? 20 : 0));
        progress += (target - progress) * 0.12;
        if (done && progress > 99.4) progress = 100;

        bar.style.transform = `scaleX(${progress / 100})`;
        pct.textContent = `${Math.round(progress)}%`;

        if (progress >= 100) {
          setTimeout(finish, 150);
        } else {
          requestAnimationFrame(tick);
        }
      }
      requestAnimationFrame(tick);
    });
  }

  /* ═══════════════════════════════════════════════════════════════
     1. NAVBAR — scroll class + hamburger
  ═══════════════════════════════════════════════════════════════ */
  function initNavbar() {
    const navbar      = document.querySelector('.navbar-custom');
    const hamburger   = document.querySelector('.hamburger');
    const mobileNav   = document.querySelector('.nav-mobile');
    const mobileLinks = document.querySelectorAll('.nav-mobile a');

    if (!navbar) return;

    // Scrolled class
    const scrollHandler = () => {
      navbar.classList.toggle('scrolled', window.scrollY > 40);
    };
    window.addEventListener('scroll', scrollHandler, { passive: true });
    scrollHandler(); // initial check

    // Hamburger toggle
    if (hamburger && mobileNav) {
      const setMenu = (isOpen) => {
        hamburger.classList.toggle('open', isOpen);
        hamburger.setAttribute('aria-expanded', String(isOpen));
        mobileNav.classList.toggle('open', isOpen);
        mobileNav.inert = !isOpen;
        document.body.style.overflow = isOpen ? 'hidden' : '';
      };

      hamburger.addEventListener('click', () => {
        setMenu(!hamburger.classList.contains('open'));
      });

      // Close when a mobile link is clicked
      mobileLinks.forEach((link) => {
        link.addEventListener('click', () => setMenu(false));
      });

      // Close on Escape
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && hamburger.classList.contains('open')) {
          setMenu(false);
          hamburger.focus();
        }
      });
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     2. HERO ENTRANCE ANIMATION (GSAP Timeline)
  ═══════════════════════════════════════════════════════════════ */
  function initHeroAnimation(pageRevealed) {
    gsap.set(['.hero-label', '.hero-tagline', '.hero-ctas'], { opacity: 0, y: 30 });
    gsap.set('.player-card', { opacity: 0, y: 40 });
    gsap.set('.hero-name', { opacity: 1 }); // parent visible
    gsap.set('.hero-name .name-line span', { yPercent: 110 });

    // Hold the entrance until the loader has started sliding away
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' }, paused: true });
    pageRevealed.then(() => gsap.delayedCall(0.25, () => tl.play()));

    tl.to('.hero-label', { opacity: 1, y: 0, duration: 0.8 })
      .to('.hero-name .name-line span', {
        yPercent: 0,
        duration: 1.1,
        ease: 'expo.out',
        stagger: 0.12,
      }, '-=0.5')
      .to('.hero-tagline', { opacity: 1, y: 0, duration: 0.8 }, '-=0.6')
      .to('.hero-ctas',    { opacity: 1, y: 0, duration: 0.7 }, '-=0.5')
      .to('.player-card', { opacity: 1, y: 0, duration: 1, ease: 'expo.out' }, 0.5);
  }

  /* ═══════════════════════════════════════════════════════════════
     3. SCROLL-TRIGGERED REVEALS
  ═══════════════════════════════════════════════════════════════ */
  function initScrollAnimations() {
    // Generic fade-up for every .reveal element, batched so siblings stagger
    ScrollTrigger.batch('.reveal', {
      start: 'top 88%',
      once: true,
      onEnter: (batch) => gsap.to(batch, {
        opacity: 1,
        y: 0,
        duration: 0.9,
        stagger: 0.1,
        ease: 'power3.out',
        overwrite: true,
      }),
    });

    // Language bars
    ScrollTrigger.create({
      trigger: '.languages-section',
      start: 'top 85%',
      onEnter: fillLangBars,
      once: true,
    });
  }

  /* ═══════════════════════════════════════════════════════════════
     4. CONTACT FORM — opens the visitor's email app, pre-filled
  ═══════════════════════════════════════════════════════════════ */
  function initContactForm() {
    const form = document.getElementById('contact-form');
    if (!form) return;

    const TO = 'aaron12parayil@gmail.com';

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!form.reportValidity()) return;

      const name    = form.elements.name.value.trim();
      const email   = form.elements.email.value.trim();
      const message = form.elements.message.value.trim();

      const subject = `Portfolio enquiry from ${name}`;
      const body    = `${message}\n\n— ${name}\n${email}`;
      window.location.href =
        `mailto:${TO}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

      const btn = form.querySelector('button[type="submit"]');
      const original = btn.innerHTML;
      btn.textContent = 'Opening your email app…';
      btn.disabled = true;

      setTimeout(() => {
        btn.innerHTML = original;
        btn.disabled = false;
      }, 3500);
    });
  }

  /* ═══════════════════════════════════════════════════════════════
     5. ACTIVE NAV LINK HIGHLIGHTING
  ═══════════════════════════════════════════════════════════════ */
  function initActiveNav() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-links a[href^="#"]');
    if (!sections.length || !navLinks.length || !('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          navLinks.forEach((link) => {
            link.classList.toggle('is-active', link.getAttribute('href') === `#${entry.target.id}`);
          });
        });
      },
      { rootMargin: '-40% 0px -55% 0px' }
    );

    sections.forEach((s) => observer.observe(s));
  }

  /* ═══════════════════════════════════════════════════════════════
     BOOT
  ═══════════════════════════════════════════════════════════════ */
  function boot() {
    const pageRevealed = initLoader();

    // These don't depend on GSAP
    initNavbar();
    initContactForm();
    initActiveNav();

    if (reducedMotion) {
      revealStatic();
      return;
    }

    waitForGSAP(() => {
      gsap.registerPlugin(ScrollTrigger);

      initHeroAnimation(pageRevealed);
      initScrollAnimations();

      // Refresh ScrollTrigger after fonts/images load
      window.addEventListener('load', () => {
        ScrollTrigger.refresh();
      });
    }, revealStatic);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
