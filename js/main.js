/**
 * main.js
 * GSAP + ScrollTrigger animations, custom cursor, navbar,
 * hamburger menu, and language bar scroll triggers.
 *
 * Aaron Koshy Parayil Portfolio — main.js
 */

(function () {
  'use strict';

  /* ── Wait for GSAP to be available ── */
  function waitForGSAP(cb) {
    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
      cb();
    } else {
      setTimeout(() => waitForGSAP(cb), 80);
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     1. CUSTOM CURSOR
  ═══════════════════════════════════════════════════════════════ */
  function initCursor() {
    const cursor         = document.querySelector('.cursor');
    const cursorFollower = document.querySelector('.cursor-follower');
    if (!cursor || !cursorFollower) return;

    // Only on non-touch devices
    if (window.matchMedia('(hover: none)').matches) {
      cursor.style.display         = 'none';
      cursorFollower.style.display = 'none';
      document.body.style.cursor   = 'auto';
      return;
    }

    let mouseX = 0, mouseY = 0;

    // quickTo for butter-smooth tracking
    const moveCursor = gsap.quickTo(cursor, 'left', { duration: 0.08, ease: 'none' });
    const moveCursorY = gsap.quickTo(cursor, 'top', { duration: 0.08, ease: 'none' });

    const moveFollower  = gsap.quickTo(cursorFollower, 'left', { duration: 0.35, ease: 'power3.out' });
    const moveFollowerY = gsap.quickTo(cursorFollower, 'top',  { duration: 0.35, ease: 'power3.out' });

    document.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      moveCursor(mouseX);
      moveCursorY(mouseY);
      moveFollower(mouseX);
      moveFollowerY(mouseY);
    });

    // Hover enlarge on interactive elements
    const hoverTargets = document.querySelectorAll(
      'a, button, .btn-crimson, .btn-outline, .btn-ghost, .skill-card, .project-card, .cert-card, .stat-card, .hamburger'
    );

    hoverTargets.forEach((el) => {
      el.addEventListener('mouseenter', () => {
        cursor.classList.add('is-hovered');
        cursorFollower.classList.add('is-hovered');
      });
      el.addEventListener('mouseleave', () => {
        cursor.classList.remove('is-hovered');
        cursorFollower.classList.remove('is-hovered');
      });
    });

    // Hide cursor when leaving window
    document.addEventListener('mouseleave', () => {
      gsap.to([cursor, cursorFollower], { opacity: 0, duration: 0.2 });
    });
    document.addEventListener('mouseenter', () => {
      gsap.to([cursor, cursorFollower], { opacity: 1, duration: 0.2 });
    });
  }

  /* ═══════════════════════════════════════════════════════════════
     2. NAVBAR — scroll class + hamburger
  ═══════════════════════════════════════════════════════════════ */
  function initNavbar() {
    const navbar   = document.querySelector('.navbar-custom');
    const hamburger = document.querySelector('.hamburger');
    const mobileNav = document.querySelector('.nav-mobile');
    const mobileLinks = document.querySelectorAll('.nav-mobile a');

    if (!navbar) return;

    // Scrolled class
    const scrollHandler = () => {
      if (window.scrollY > 40) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
    };
    window.addEventListener('scroll', scrollHandler, { passive: true });
    scrollHandler(); // initial check

    // Hamburger toggle
    if (hamburger && mobileNav) {
      hamburger.addEventListener('click', () => {
        const isOpen = hamburger.classList.toggle('open');
        mobileNav.classList.toggle('open', isOpen);
        document.body.style.overflow = isOpen ? 'hidden' : '';
      });

      // Close when a mobile link is clicked
      mobileLinks.forEach((link) => {
        link.addEventListener('click', () => {
          hamburger.classList.remove('open');
          mobileNav.classList.remove('open');
          document.body.style.overflow = '';
        });
      });
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     3. HERO ENTRANCE ANIMATION (GSAP Timeline)
  ═══════════════════════════════════════════════════════════════ */
  function initHeroAnimation() {
    // Set initial hidden states before animating
    gsap.set('.hero-label',        { opacity: 0, y: 30 });
    gsap.set('.hero-tagline',      { opacity: 0, y: 30 });
    gsap.set('.hero-ctas',         { opacity: 0, y: 30 });
    gsap.set('.scroll-indicator',  { opacity: 0 });
    // Name spans slide up from below their clip container
    gsap.set('.hero-name',         { opacity: 1 }); // parent visible
    gsap.set('.hero-name .name-line span', { y: '110%', opacity: 1 });

    const tl = gsap.timeline({ defaults: { ease: 'power3.out' }, delay: 0.3 });

    tl.to('.hero-label', {
        opacity: 1,
        y: 0,
        duration: 0.9,
      })
      .to('.hero-name .name-line:nth-child(1) span', {
        y: '0%',
        duration: 1,
        ease: 'expo.out',
      }, '-=0.5')
      .to('.hero-name .name-line:nth-child(2) span', {
        y: '0%',
        duration: 1,
        ease: 'expo.out',
      }, '-=0.75')
      .to('.hero-name .name-line:nth-child(3) span', {
        y: '0%',
        duration: 1,
        ease: 'expo.out',
      }, '-=0.75')
      .to('.hero-tagline', {
        opacity: 1,
        y: 0,
        duration: 0.8,
      }, '-=0.5')
      .to('.hero-ctas', {
        opacity: 1,
        y: 0,
        duration: 0.7,
      }, '-=0.4')
      .to('.scroll-indicator', {
        opacity: 1,
        duration: 0.6,
      }, '-=0.2');
  }

  /* ═══════════════════════════════════════════════════════════════
     4. SCROLL-TRIGGERED SECTION ANIMATIONS
  ═══════════════════════════════════════════════════════════════ */
  function initScrollAnimations() {
    gsap.registerPlugin(ScrollTrigger);

    /* ── About section ── */
    ScrollTrigger.create({
      trigger: '#about',
      start: 'top 80%',
      onEnter: () => {
        gsap.to('.about-card', {
          opacity: 1,
          y: 0,
          duration: 0.9,
          ease: 'power3.out',
        });
        gsap.to('.stat-card', {
          opacity: 1,
          y: 0,
          duration: 0.7,
          stagger: 0.12,
          delay: 0.3,
          ease: 'back.out(1.5)',
        });
      },
      once: true,
    });

    gsap.set('.about-card', { opacity: 0, y: 60 });
    gsap.set('.stat-card', { opacity: 0, y: 40 });

    /* ── Skills section ── */
    ScrollTrigger.create({
      trigger: '#skills',
      start: 'top 75%',
      onEnter: () => {
        gsap.to('.skill-card', {
          opacity: 1,
          y: 0,
          duration: 0.75,
          stagger: 0.15,
          ease: 'power3.out',
        });
      },
      once: true,
    });

    gsap.set('.skill-card', { opacity: 0, y: 50 });

    /* ── Language bars (triggered by skills section) ── */
    ScrollTrigger.create({
      trigger: '.languages-section',
      start: 'top 85%',
      onEnter: () => {
        document.querySelectorAll('.lang-bar-fill').forEach((bar) => {
          const target = bar.dataset.width || '80%';
          bar.style.width = target;
        });
      },
      once: true,
    });

    /* ── Projects section ── */
    const projectCards = document.querySelectorAll('.project-card');
    gsap.set(projectCards[0], { opacity: 0, x: -70 });
    gsap.set(projectCards[1], { opacity: 0, x: 70 });

    ScrollTrigger.create({
      trigger: '#projects',
      start: 'top 75%',
      onEnter: () => {
        gsap.to(projectCards[0], {
          opacity: 1,
          x: 0,
          duration: 0.9,
          ease: 'power3.out',
        });
        gsap.to(projectCards[1], {
          opacity: 1,
          x: 0,
          duration: 0.9,
          delay: 0.15,
          ease: 'power3.out',
        });
      },
      once: true,
    });

    /* ── Experience timeline ── */
    // Animate the center line drawing
    ScrollTrigger.create({
      trigger: '#experience',
      start: 'top 70%',
      onEnter: () => {
        // Stagger timeline items
        gsap.to('.timeline-item', {
          opacity: 1,
          y: 0,
          duration: 0.8,
          stagger: 0.2,
          ease: 'power3.out',
          delay: 0.2,
        });
        gsap.to('.timeline-dot', {
          scale: 1,
          opacity: 1,
          duration: 0.4,
          stagger: 0.2,
          delay: 0.4,
          ease: 'back.out(2)',
        });
      },
      once: true,
    });

    gsap.set('.timeline-item', { opacity: 0, y: 50 });
    gsap.set('.timeline-dot', { scale: 0, opacity: 0 });

    /* ── Certifications ── */
    ScrollTrigger.create({
      trigger: '#certifications',
      start: 'top 78%',
      onEnter: () => {
        gsap.to('.cert-card', {
          opacity: 1,
          scale: 1,
          duration: 0.65,
          stagger: 0.12,
          ease: 'back.out(1.4)',
        });
        gsap.to('.achievement-callout', {
          opacity: 1,
          y: 0,
          duration: 0.8,
          delay: 0.4,
          ease: 'power3.out',
        });
        gsap.to('.leadership-card', {
          opacity: 1,
          x: 0,
          duration: 0.7,
          stagger: 0.15,
          delay: 0.6,
          ease: 'power3.out',
        });
        gsap.to('.edu-card', {
          opacity: 1,
          y: 0,
          duration: 0.7,
          stagger: 0.12,
          delay: 0.2,
          ease: 'power3.out',
        });
      },
      once: true,
    });

    gsap.set('.cert-card', { opacity: 0, scale: 0.85 });
    gsap.set('.achievement-callout', { opacity: 0, y: 40 });
    gsap.set('.leadership-card', { opacity: 0, x: -30 });
    gsap.set('.edu-card', { opacity: 0, y: 40 });

    /* ── Education section ── */
    ScrollTrigger.create({
      trigger: '#education',
      start: 'top 80%',
      onEnter: () => {
        gsap.to('.edu-card', {
          opacity: 1,
          y: 0,
          duration: 0.7,
          stagger: 0.12,
          ease: 'power3.out',
        });
      },
      once: true,
    });

    /* ── Contact section ── */
    ScrollTrigger.create({
      trigger: '#contact',
      start: 'top 80%',
      onEnter: () => {
        gsap.to('.contact-heading', {
          opacity: 1,
          y: 0,
          duration: 0.9,
          ease: 'power3.out',
        });
        gsap.to('.contact-info-item', {
          opacity: 1,
          y: 0,
          duration: 0.6,
          stagger: 0.1,
          delay: 0.3,
          ease: 'power3.out',
        });
        gsap.to('.contact-form', {
          opacity: 1,
          x: 0,
          duration: 0.8,
          delay: 0.2,
          ease: 'power3.out',
        });
      },
      once: true,
    });

    gsap.set('.contact-heading', { opacity: 0, y: 50 });
    gsap.set('.contact-info-item', { opacity: 0, y: 30 });
    gsap.set('.contact-form', { opacity: 0, x: 50 });

    /* ── Section labels (all) ── */
    gsap.utils.toArray('.section-label').forEach((el) => {
      gsap.from(el, {
        scrollTrigger: {
          trigger: el,
          start: 'top 88%',
        },
        opacity: 0,
        x: -20,
        duration: 0.6,
        ease: 'power2.out',
      });
    });

    /* ── Section titles (all) ── */
    gsap.utils.toArray('.section-title').forEach((el) => {
      gsap.from(el, {
        scrollTrigger: {
          trigger: el,
          start: 'top 85%',
        },
        opacity: 0,
        y: 35,
        duration: 0.8,
        ease: 'power3.out',
      });
    });

    /* ── Dividers ── */
    gsap.utils.toArray('.divider').forEach((el) => {
      gsap.from(el, {
        scrollTrigger: {
          trigger: el,
          start: 'top 90%',
        },
        scaleX: 0,
        transformOrigin: 'left center',
        duration: 0.7,
        ease: 'power2.out',
      });
    });
  }

  /* ═══════════════════════════════════════════════════════════════
     5. CONTACT FORM — basic UX
  ═══════════════════════════════════════════════════════════════ */
  function initContactForm() {
    const form = document.getElementById('contact-form');
    if (!form) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      const original = btn.textContent;

      btn.textContent = 'Message sent ✓';
      btn.style.background = '#16a34a';
      btn.style.borderColor = '#16a34a';
      btn.disabled = true;

      setTimeout(() => {
        btn.textContent = original;
        btn.style.background = '';
        btn.style.borderColor = '';
        btn.disabled = false;
        form.reset();
      }, 3500);
    });
  }

  /* ═══════════════════════════════════════════════════════════════
     6. SMOOTH ACTIVE NAV LINK HIGHLIGHTING
  ═══════════════════════════════════════════════════════════════ */
  function initActiveNav() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-links a[href^="#"]');
    if (!sections.length || !navLinks.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            navLinks.forEach((link) => {
              link.style.color = link.getAttribute('href') === `#${entry.target.id}`
                ? 'var(--clr-text)'
                : '';
            });
          }
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
    waitForGSAP(() => {
      gsap.registerPlugin(ScrollTrigger);

      initCursor();
      initNavbar();
      initHeroAnimation();
      initScrollAnimations();
      initContactForm();
      initActiveNav();

      // Refresh ScrollTrigger after fonts/images load
      window.addEventListener('load', () => {
        ScrollTrigger.refresh();
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
