/**
 * roster.js
 * "Character select" roster behind the hero player card.
 * Six original pixel-art characters, drawn once to tiny canvases and
 * scaled up with crisp pixels. Every few seconds the tiles shuffle slots.
 * Only transforms animate, and the loop pauses when the hero is off screen.
 */

(function () {
  'use strict';

  const PALETTE = {
    k: '#10121A', // outline
    s: '#C3CCDB', // steel
    r: '#FF5A5F', // red
    b: '#4C6FFF', // blue
    Y: '#FFD23F', // gold
    p: '#8B5CF6', // purple
    f: '#F1C6A0', // skin
    W: '#EEF1F7', // white
    G: '#8E98AC', // grey
    C: '#5EE6FF', // cyan
    e: '#57D27A', // green
    E: '#2F9E58', // dark green
    O: '#FF8A3D', // orange
    n: '#2B3350', // navy
  };

  // Each sprite is 16×16, written as its left half (8 px) and mirrored.
  const CHARACTERS = [
    {
      name: 'Knight', tint: '#4C6FFF',
      rows: [
        '......rr', '.....rrr', '....kkkk', '...kssss',
        '..ksssss', '..kskkkk', '..kskWkk', '..ksssss',
        '...kkkkk', '.kssbbbb', 'ksssbbbY', 'ksssbbYY',
        'kssbbbbY', '.kkbbbbb', '..kssk..', '..kkkk..',
      ],
    },
    {
      name: 'Wizard', tint: '#8B5CF6',
      rows: [
        '.......k', '......kp', '......kp', '.....kpp',
        '....kppY', '...kpppp', '.kkkkkkk', '..kfffkf',
        '..kfffff', '..kWWWWW', '.kpkWWWW', 'kppkWWWW',
        'kpppkWWW', '.kpppkWW', '.kppppkW', '..kkkkkk',
      ],
    },
    {
      name: 'Robot', tint: '#5EE6FF',
      rows: [
        '......YY', '.......k', '..kkkkkk', '.kGGGGGG',
        '.kGkkkkk', '.kGkCCkk', '.kGkkkkk', '.kGGGGGG',
        '..kkkkkk', '.kkbbbbb', 'kGkbbbbb', 'kGkbbYYb',
        'kGkbbbbb', '.kkkkkkk', '...kGk..', '..kkkk..',
      ],
    },
    {
      name: 'Slime', tint: '#57D27A',
      rows: [
        '........', '........', '........', '........',
        '........', '......kk', '....kkee', '...keeee',
        '..keWeee', '..keeeke', '.keeeeke', '.keeeeee',
        'keeeeeee', 'keeeeeee', 'kEEEEEEE', '.kkkkkkk',
      ],
    },
    {
      name: 'Astronaut', tint: '#FF8A3D',
      rows: [
        '....kkkk', '...kWWWW', '..kWWWWW', '.kWWkkkk',
        '.kWkCCCC', '.kWkCCCC', '.kWWkkkk', '..kWWWWW',
        '...kkkkk', '..kWWWWW', '.kWWWWOO', 'kWkWWWOO',
        'kWkWWWWW', '.kkkWWWW', '...kWWk.', '...kkkk.',
      ],
    },
    {
      name: 'Ninja', tint: '#FF5A5F',
      rows: [
        '........', '....kkkk', '...knnnn', '..knnnnn',
        '..krrrrr', '..knfkff', '..knnnnn', '...knnnn',
        '..kkkkkk', '.knnnnnn', 'knnnnnnn', 'knnrrrrr',
        '.knnnnnn', '..knnnnn', '..knnk..', '..kkkk..',
      ],
    },
  ];

  // Slot positions as fractions of the roster box (x, y), plus scale and stacking.
  // Some deliberately run off the edges so characters are only partly seen.
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

  function spriteToDataURL(rows) {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');
    rows.forEach((half, y) => {
      const row = half + half.split('').reverse().join('');
      for (let x = 0; x < row.length; x++) {
        const colour = PALETTE[row[x]];
        if (!colour) continue;
        ctx.fillStyle = colour;
        ctx.fillRect(x, y, 1, 1);
      }
    });
    return canvas.toDataURL();
  }

  function init() {
    const roster = document.querySelector('.roster');
    if (!roster) return;

    const tiles = CHARACTERS.map((ch, i) => {
      const tile = document.createElement('div');
      tile.className = 'roster-tile';
      tile.style.setProperty('--tint', ch.tint);
      // Vary the crop so each character shows a different part of itself
      tile.style.setProperty('--crop-y', `${[18, 4, 26, 10, 30, 14][i]}%`);

      const img = new Image(16, 16);
      img.src = spriteToDataURL(ch.rows);
      img.alt = '';
      img.className = 'roster-sprite';

      const tag = document.createElement('span');
      tag.className = 'roster-name';
      tag.textContent = ch.name;

      tile.append(img, tag);
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
