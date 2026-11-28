/**
 * status.js
 * The footer's status strip: checks that this site, the RaptorSense site
 * and Rig Builder answer, timed from the visitor's own browser, and shows
 * when the portfolio was last updated (latest commit, from the GitHub API).
 *
 * Runs once, when the footer comes near the screen. Stays hidden if the
 * browser can't run it.
 */

(function () {
  'use strict';

  const strip = document.querySelector('.status-strip');
  if (!strip || !window.fetch || !window.Promise) return;

  const ORIGIN = 'https://aaronkp.tech';
  const CHECKS = [
    { name: 'aaronkp.tech', path: '/' },
    { name: 'RaptorSense site', path: '/RaptorSense/' },
    { name: 'Rig Builder', path: '/pc_builder_simulator/' },
  ];
  const REPO = 'aaronparayil/aaronparayil.github.io';
  const CACHE_KEY = `status-commit:${REPO}`;
  const CACHE_MS = 5 * 60 * 1000;

  const text = strip.querySelector('.status-text');
  const list = strip.querySelector('.status-checks');
  const deploy = strip.querySelector('.status-deploy');

  // On the real site the checks are same-origin and can read the status;
  // anywhere else (local preview) they can only tell that something answered
  const sameOrigin = location.origin === ORIGIN;

  async function check({ name, path }) {
    const controller = window.AbortController ? new AbortController() : null;
    const timer = controller && setTimeout(() => controller.abort(), 8000);
    const start = performance.now();
    try {
      const res = await fetch(sameOrigin ? path : ORIGIN + path, {
        method: 'HEAD',
        cache: 'no-store',
        mode: sameOrigin ? 'same-origin' : 'no-cors',
        signal: controller ? controller.signal : undefined,
      });
      const up = res.type === 'opaque' ? true : res.ok;
      return { name, up, ms: Math.round(performance.now() - start) };
    } catch (e) {
      return { name, up: false };
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  async function latestCommit() {
    try {
      const hit = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null');
      if (hit && Date.now() - hit.at < CACHE_MS) return hit.data;
    } catch (e) { /* no storage: just fetch */ }

    const res = await fetch(`https://api.github.com/repos/${REPO}/commits?per_page=1`, {
      headers: { Accept: 'application/vnd.github+json' },
    });
    if (!res.ok) throw new Error('GitHub API unavailable');
    const [c] = await res.json();
    const data = {
      date: c.commit.committer.date,
      message: c.commit.message.split('\n')[0],
      url: c.html_url,
    };
    try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), data })); } catch (e) { /* fine */ }
    return data;
  }

  function ago(iso) {
    const secs = Math.max(0, (Date.now() - new Date(iso)) / 1000);
    if (secs < 60) return 'just now';
    if (secs < 3600) return `${Math.round(secs / 60)} min ago`;
    if (secs < 86400) return `${Math.round(secs / 3600)} hr ago`;
    const days = Math.round(secs / 86400);
    return days === 1 ? 'yesterday' : `${days} days ago`;
  }

  function el(tag, cls, content) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (content !== undefined) node.textContent = content;
    return node;
  }

  async function run() {
    strip.hidden = false;

    const results = await Promise.all(CHECKS.map(check));
    const down = results.filter((r) => !r.up).length;
    strip.classList.toggle('is-up', down === 0);
    strip.classList.toggle('is-down', down > 0);
    text.textContent = down === 0 ? 'All my sites are up' : `${down} of ${results.length} sites not answering`;

    list.replaceChildren(...results.map((r) => {
      const li = el('li', r.up ? '' : 'is-down', `${r.name} `);
      li.append(el('span', 'status-ms', r.up ? (sameOrigin ? `${r.ms} ms` : 'up') : 'down'));
      return li;
    }));

    try {
      const c = await latestCommit();
      const msg = c.message.length > 60 ? `${c.message.slice(0, 57)}…` : c.message;
      const link = el('a', '', msg);
      link.href = c.url;
      link.target = '_blank';
      link.rel = 'noopener';
      deploy.replaceChildren(`Site updated ${ago(c.date)}: `, link);
    } catch (e) {
      deploy.remove();
    }
  }

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        io.disconnect();
        run();
      }
    }, { rootMargin: '400px 0px' });
    io.observe(strip.closest('footer') || strip);
  } else {
    run();
  }
})();
