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
     0. LOADER — pings aaronkp.tech, types "AARONKP", which a
     chomper eats; then the screen itself gets "bitten" open once
     that's done and the page has loaded. Resolves when the page is revealed. (A CSS failsafe
     hides it if this never runs.)
  ═══════════════════════════════════════════════════════════════ */
  // `typed` lines are typed out; the rest appear at once, like command output
  const LOADER_SCRIPT = [
    { typed: true,  parts: [['tok-prompt', '$ '], ['tok-fn', 'ping'], ['', ' aaronkp.tech']] },
    { typed: false, parts: [['tok-out', 'reply from aaronkp.tech: '], ['tok-ok', 'online ✓']] },
  ];
  const LOADER_WORD = ['A', 'A', 'R', 'O', 'N', 'K', 'P'];

  function initLoader() {
    const loader = document.querySelector('.loader');
    if (!loader || reducedMotion || getComputedStyle(loader).display === 'none') {
      if (loader) loader.remove();
      return Promise.resolve();
    }

    const codeEl   = loader.querySelector('.loader-code');
    const wordEl   = loader.querySelector('.loader-akp');
    const wordLine = loader.querySelector('.loader-word');
    const MAX_MS   = 6500; // never hold people up longer than this
    const start    = performance.now();
    const wait     = (ms) => new Promise((r) => setTimeout(r, ms));

    const pageLoaded = document.readyState === 'complete'
      ? Promise.resolve()
      : new Promise((r) => window.addEventListener('load', r, { once: true }));

    document.documentElement.style.overflow = 'hidden';

    // Code cursor follows the typing; the big cursor waits for "AKP"
    const codeCursor = document.createElement('span');
    codeCursor.className = 'loader-cursor';
    wordLine.querySelector('.loader-cursor').style.visibility = 'hidden';

    async function typeScript() {
      for (const line of LOADER_SCRIPT) {
        if (!line.typed) await wait(380); // the "network" round trip
        for (const [cls, text] of line.parts) {
          const span = document.createElement('span');
          if (cls) span.className = cls;
          codeEl.append(span, codeCursor);
          if (!line.typed) {
            span.textContent = text;
            continue;
          }
          for (const ch of text) {
            span.textContent += ch;
            await wait(cls === 'tok-prompt' ? 0 : 30 + Math.random() * 30);
          }
        }
        codeEl.insertBefore(document.createTextNode('\n'), codeCursor);
        await wait(260);
      }
      codeCursor.remove();
      const bigCursor = wordLine.querySelector('.loader-cursor');
      bigCursor.style.visibility = '';
      await wait(200);

      const letters = [];
      for (const letter of LOADER_WORD) {
        const span = document.createElement('span');
        span.className = 'loader-letter';
        span.textContent = letter;
        wordEl.append(span);
        letters.push(span);
        await wait(130);
      }
      await wait(300);
      bigCursor.style.visibility = 'hidden';
      await chomp(letters);
    }

    // The chomper crosses the word and eats each letter as it passes
    async function chomp(letters) {
      const chomper = wordLine.querySelector('.chomper');
      const size = chomper.offsetWidth;
      const from = -size * 1.3;
      const to = wordLine.offsetWidth + size * 0.5;
      chomper.style.visibility = 'visible';

      const run = chomper.animate(
        [{ transform: `translate(${from}px, -50%)` }, { transform: `translate(${to}px, -50%)` }],
        { duration: 1700, easing: 'linear', fill: 'forwards' }
      );

      const lineLeft = wordLine.getBoundingClientRect().left;
      const centres = letters.map((l) => {
        const r = l.getBoundingClientRect();
        return r.left - lineLeft + r.width * 0.45;
      });

      await new Promise((resolve) => {
        (function frame() {
          const mouth = chomper.getBoundingClientRect().right - lineLeft - size * 0.2;
          centres.forEach((c, i) => {
            if (mouth >= c) letters[i].classList.add('is-eaten');
          });
          if (run.playState === 'finished') resolve();
          else requestAnimationFrame(frame);
        })();
      });
      await wait(150);
    }

    const timeout = wait(MAX_MS - (performance.now() - start));

    return Promise.race([Promise.all([typeScript(), pageLoaded]), timeout]).then(() => {
      // Centre the closing "bite" on the chomper (or the screen centre if it never appeared)
      const chomper = loader.querySelector('.chomper');
      const box = chomper && getComputedStyle(chomper).visibility === 'visible'
        ? chomper.getBoundingClientRect()
        : null;
      if (box) {
        loader.style.setProperty('--bx', `${box.left + box.width / 2}px`);
        loader.style.setProperty('--by', `${box.top + box.height / 2}px`);
      }
      loader.classList.add('is-done');
      document.documentElement.style.overflow = '';
      loader.addEventListener('animationend', (e) => {
        if (e.animationName === 'loader-bite') loader.remove();
      });
      setTimeout(() => loader.remove(), 1600); // in case animationend never fires
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
     2b. PORTRAIT CARD — "weighted" 3D tilt
     The part of the card under the cursor sinks away, as if the
     cursor were pressing on it, with a sheen that follows the cursor.
  ═══════════════════════════════════════════════════════════════ */
  function initCardTilt() {
    const card = document.querySelector('.player-card');
    if (!card || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    const MAX_TILT = 12; // degrees at the very edge
    gsap.set(card, { transformPerspective: 900 });

    const tiltX = gsap.quickTo(card, 'rotationX', { duration: 0.5, ease: 'power3.out' });
    const tiltY = gsap.quickTo(card, 'rotationY', { duration: 0.5, ease: 'power3.out' });
    const press = gsap.quickTo(card, 'scale',     { duration: 0.4, ease: 'power3.out' });

    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;   // 0 → 1
      const py = (e.clientY - r.top) / r.height;   // 0 → 1
      // Side under the cursor goes back into the screen
      tiltY((px - 0.5) * 2 * MAX_TILT);
      tiltX(-(py - 0.5) * 2 * MAX_TILT);
      press(0.985);
      card.style.setProperty('--gx', `${px * 100}%`);
      card.style.setProperty('--gy', `${py * 100}%`);
    });

    card.addEventListener('pointerenter', () => card.classList.add('is-tilting'));
    card.addEventListener('pointerleave', () => {
      card.classList.remove('is-tilting');
      tiltX(0);
      tiltY(0);
      press(1);
    });
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
     6. FOOTER CLOCK — live local time in Bengaluru
  ═══════════════════════════════════════════════════════════════ */
  function initLocalTime() {
    const wrap = document.querySelector('.footer-time');
    const el   = wrap && wrap.querySelector('.local-time');
    if (!el || !window.Intl) return;

    const fmt = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });

    const tick = () => {
      const now = new Date();
      el.textContent = fmt.format(now).toUpperCase();
      el.dateTime = now.toISOString();
    };
    tick();
    wrap.hidden = false;
    setInterval(tick, 1000);
  }

  /* ═══════════════════════════════════════════════════════════════
     BOOT
  ═══════════════════════════════════════════════════════════════ */
  function boot() {
    const pageRevealed = initLoader();

    // A little something for whoever opens the console
    console.log(
      '%cA-A-ron!%c  You found the console. Try hovering my first name on the page.',
      'font: 700 20px sans-serif; color: #FF6F91;',
      'font: 13px sans-serif; color: #8C95A8;'
    );

    // These don't depend on GSAP
    initNavbar();
    initContactForm();
    initActiveNav();
    initLocalTime();

    if (reducedMotion) {
      revealStatic();
      return;
    }

    waitForGSAP(() => {
      gsap.registerPlugin(ScrollTrigger);

      initHeroAnimation(pageRevealed);
      initCardTilt();
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
