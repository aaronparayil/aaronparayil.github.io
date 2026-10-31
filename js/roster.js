/**
 * roster.js
 * Skill tiles that sit behind the hero portrait card.
 * Each tile shows a tool's logo (from Simple Icons, stored in assets/icons)
 * tinted in a colour that reads on the dark background, cropped at the
 * tile edge. Every few seconds the tiles shuffle slots.
 * Only transforms animate, and the loop pauses when the hero is off screen.
 */

(function () {
  'use strict';

  // To change the line-up, edit this list (and drop the SVG into assets/icons/)
  const SKILLS = [
    { name: 'Python',   icon: 'python',            tint: '#FFD43B' },
    { name: 'AWS',      icon: 'amazonwebservices', tint: '#FF9900' },
    { name: 'GCP',      icon: 'googlecloud',       tint: '#4285F4' },
    { name: 'Unity',    icon: 'unity',             tint: '#E8ECF5' },
    { name: 'Blender',  icon: 'blender',           tint: '#F5792A' },
    { name: 'React',    icon: 'react',             tint: '#61DAFB' },
  ];

  // Slot positions as fractions of the roster box (x, y), plus scale and stacking.
  // Some deliberately run off the edges so logos are only partly seen.
  const SLOTS = [
    { x: 0.58, y: -0.08, s: 0.95, z: 2, selected: true },
    { x: 0.84, y: 0.30,  s: 1.15, z: 3 },
    { x: 0.62, y: 0.68,  s: 0.90, z: 2 },
    { x: 0.00, y: 0.60,  s: 1.05, z: 3 },
    { x: 0.24, y: 0.88,  s: 0.85, z: 1 },
    { x: 0.04, y: 0.02,  s: 0.90, z: 1 },
  ];

  const SHUFFLE_EVERY = 3200; // ms
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function init() {
    const roster = document.querySelector('.roster');
    if (!roster) return;

    const tiles = SKILLS.map((skill, i) => {
      const tile = document.createElement('div');
      tile.className = 'roster-tile';
      tile.style.setProperty('--tint', skill.tint);
      // Vary the crop so each logo shows a different part of itself
      tile.style.setProperty('--crop-x', `${[18, -14, 22, -20, 12, -8][i]}%`);
      tile.style.setProperty('--crop-y', `${[16, 4, 24, 10, 28, 12][i]}%`);

      const logo = document.createElement('span');
      logo.className = 'roster-logo';
      // Absolute URL: a relative url() inside a custom property would resolve
      // against the stylesheet's folder in some browsers, not the page's
      const iconUrl = new URL(`assets/icons/${skill.icon}.svg`, document.baseURI).href;
      logo.style.setProperty('--icon', `url("${iconUrl}")`);

      const tag = document.createElement('span');
      tag.className = 'roster-name';
      tag.textContent = skill.name;

      tile.append(logo, tag);
      roster.append(tile);
      return tile;
    });

    // order[i] = slot index currently held by tile i
    let order = tiles.map((_, i) => i);

    function layout() {
      const w = roster.clientWidth;
      const h = roster.clientHeight;
      const base = Math.round(w * 0.34);
      tiles.forEach((tile, i) => {
        const slot = SLOTS[order[i]];
        tile.style.width = `${base}px`;
        tile.style.height = `${base}px`;
        tile.style.transform =
          `translate3d(${Math.round(slot.x * w)}px, ${Math.round(slot.y * h)}px, 0) scale(${slot.s})`;
        tile.style.zIndex = slot.z;
        tile.classList.toggle('is-selected', !!slot.selected);
      });
    }

    // Random permutation where every tile moves
    function shuffle() {
      let next;
      do {
        next = order.slice().sort(() => Math.random() - 0.5);
      } while (next.some((slot, i) => slot === order[i]));
      order = next;
      layout();
    }

    layout();
    window.addEventListener('resize', layout);
    // Reveal after the first layout so tiles don't fly in from 0,0
    requestAnimationFrame(() => roster.classList.add('is-ready'));

    if (reducedMotion) return;

    let timer = null;
    let heroVisible = true;
    const start = () => {
      if (timer === null && heroVisible && !document.hidden) timer = setInterval(shuffle, SHUFFLE_EVERY);
    };
    const stop = () => {
      clearInterval(timer);
      timer = null;
    };

    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));

    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries) => {
        heroVisible = entries[0].isIntersecting;
        heroVisible ? start() : stop();
      }).observe(roster);
    }

    start();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
