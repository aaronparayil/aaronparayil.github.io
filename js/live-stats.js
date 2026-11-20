/**
 * live-stats.js
 * Fills the RaptorSense stats row from the public GitHub API:
 * total downloads, stars, latest version and release count.
 *
 * - Two unauthenticated requests per visit (GitHub allows 60/hour per IP),
 *   cached in sessionStorage for 5 minutes and refreshed while the tab is open.
 * - If GitHub can't be reached, the numbers already in the HTML stay put.
 * - The download count counts up once when the panel scrolls into view.
 */

(function () {
  'use strict';

  const box = document.querySelector('.project-live[data-repo]');
  if (!box || !window.fetch) return;

  const REPO = box.dataset.repo;
  const API = `https://api.github.com/repos/${REPO}`;
  const CACHE_KEY = `live-stats:v2:${REPO}`;
  const CACHE_MS = 5 * 60 * 1000;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const el = (name) => box.querySelector(`[data-stat="${name}"]`);
  const label = box.querySelector('.live-text');

  const dateFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const rtf = window.Intl && Intl.RelativeTimeFormat
    ? new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
    : null;

  // Calendar-day wording for release dates ("today", "2 days ago")
  function daysAgo(iso) {
    const start = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const days = Math.round((start(new Date(iso)) - start(new Date())) / 86400000);
    return rtf ? rtf.format(days, 'day') : dateFmt.format(new Date(iso));
  }

  function readCache() {
    try {
      const hit = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null');
      return hit && Date.now() - hit.at < CACHE_MS ? hit.data : null;
    } catch (e) {
      return null;
    }
  }

  function writeCache(data) {
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), data }));
    } catch (e) { /* storage blocked: fine, just no cache */ }
  }

  async function load() {
    const cached = readCache();
    if (cached) return cached;

    const opts = { headers: { Accept: 'application/vnd.github+json' } };
    const [repoRes, relRes] = await Promise.all([
      fetch(API, opts),
      fetch(`${API}/releases?per_page=100`, opts),
    ]);
    if (!repoRes.ok || !relRes.ok) throw new Error('GitHub API unavailable');

    const repo = await repoRes.json();
    const releases = (await relRes.json()).filter((r) => !r.draft);
    if (!releases.length) throw new Error('No releases');

    const data = {
      downloads: releases.reduce(
        (sum, r) => sum + r.assets.reduce((s, a) => s + a.download_count, 0), 0),
      version: releases[0].tag_name,
      released: releases[0].published_at,
      releases: releases.length,
      first: releases[releases.length - 1].published_at,
      stars: repo.stargazers_count,
    };
    writeCache(data);
    return data;
  }

  // Count the downloads figure up from zero (once, when first seen)
  let counted = false;
  let target = parseInt(el('downloads').textContent, 10) || 0;

  function countUp() {
    if (counted) return;
    counted = true;
    const node = el('downloads');
    if (reducedMotion || target < 2) { node.textContent = target; return; }
    const start = performance.now();
    const dur = 900;
    (function frame(now) {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      node.textContent = Math.round(target * eased);
      if (t < 1) requestAnimationFrame(frame);
      else node.textContent = target;
    })(start);
  }

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        countUp();
        io.disconnect();
      }
    }, { threshold: 0.4 });
    io.observe(box);
  }

  function render(d) {
    target = d.downloads;
    if (counted) el('downloads').textContent = d.downloads;
    el('version').textContent = d.version;
    el('released').textContent = `released ${daysAgo(d.released)}`;
    el('releases').textContent = d.releases;
    el('since').textContent = `since ${dateFmt.format(new Date(d.first))}`;
    el('stars').textContent = d.stars;
    label.textContent = 'Live from GitHub';
    box.classList.add('is-live');
  }

  function refresh() {
    load().then(render).catch(() => { /* keep the HTML fallback */ });
  }

  refresh();
  // Keep it current while someone has the page open
  setInterval(() => { if (!document.hidden) refresh(); }, CACHE_MS);
})();
