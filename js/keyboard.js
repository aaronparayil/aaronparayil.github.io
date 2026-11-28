/**
 * keyboard.js
 * The hero's keyboard: a slow rainbow wave across the keys, and a ripple
 * from every key the visitor presses (or taps), in the spirit of
 * RaptorSense's typing effects.
 *
 * - Drawn on one canvas; only animates while it's on screen and the tab
 *   is visible.
 * - With reduced motion it stays still; pressed keys just light up.
 * - Types "AARONKP" once after the loader, so people see it reacts.
 */

(function () {
  'use strict';

  const wrap = document.querySelector('.hero-keys');
  const canvas = wrap && wrap.querySelector('canvas');
  if (!canvas || !canvas.getContext) return;

  const ctx = canvas.getContext('2d');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Layout in key units: [event.code, label, width]. Every row adds up to 15.
  const ROWS = [
    { h: 0.7, keys: [['Escape', 'Esc', 1], ...Array.from({ length: 12 }, (_, i) => [`F${i + 1}`, `F${i + 1}`, 1]), ['Insert', 'Ins', 1], ['Delete', 'Del', 1]] },
    { h: 1, keys: [['Backquote', '`', 1], ...'1234567890'.split('').map((d) => [`Digit${d}`, d, 1]), ['Minus', '-', 1], ['Equal', '=', 1], ['Backspace', 'Backspace', 2]] },
    { h: 1, keys: [['Tab', 'Tab', 1.5], ...'QWERTYUIOP'.split('').map((c) => [`Key${c}`, c, 1]), ['BracketLeft', '[', 1], ['BracketRight', ']', 1], ['Backslash', '\\', 1.5]] },
    { h: 1, keys: [['CapsLock', 'Caps', 1.75], ...'ASDFGHJKL'.split('').map((c) => [`Key${c}`, c, 1]), ['Semicolon', ';', 1], ['Quote', "'", 1], ['Enter', 'Enter', 2.25]] },
    { h: 1, keys: [['ShiftLeft', 'Shift', 2.25], ...'ZXCVBNM'.split('').map((c) => [`Key${c}`, c, 1]), ['Comma', ',', 1], ['Period', '.', 1], ['Slash', '/', 1], ['ShiftRight', 'Shift', 2.75]] },
    { h: 1, keys: [['ControlLeft', 'Ctrl', 1.25], ['Fn', 'Fn', 1], ['MetaLeft', 'Win', 1.25], ['AltLeft', 'Alt', 1.25], ['Space', '', 5.25], ['AltRight', 'Alt', 1], ['ControlRight', 'Ctrl', 1], ['ArrowLeft', '◀', 1], ['ARROWS', '', 1], ['ArrowRight', '▶', 1]] },
  ];
  const COLS = 15;
  const GAP = 0.12;
  const TOTAL_H = ROWS.reduce((sum, r) => sum + r.h, 0);

  const keys = [];
  const byCode = new Map();
  let y = 0;
  for (const row of ROWS) {
    let x = 0;
    for (const [code, label, w] of row.keys) {
      if (code === 'ARROWS') {
        // Up and down share one slot, half height each
        for (const [c, l, dy] of [['ArrowUp', '▲', 0], ['ArrowDown', '▼', 0.5]]) {
          const k = { code: c, label: l, x, y: y + dy, w, h: row.h / 2, pressAt: -1e9 };
          keys.push(k);
          byCode.set(c, k);
        }
      } else {
        const k = { code, label, x, y, w, h: row.h, pressAt: -1e9 };
        keys.push(k);
        byCode.set(code, k);
      }
      x += w;
    }
    y += row.h;
  }
  keys.forEach((k) => { k.cx = k.x + k.w / 2; k.cy = k.y + k.h / 2; });

  let unit = 0;
  let dpr = 1;
  const ripples = [];

  function resize() {
    const cssW = canvas.clientWidth;
    if (!cssW) return;
    unit = cssW / COLS;
    const cssH = unit * TOTAL_H;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.style.height = `${cssH}px`;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    draw(performance.now());
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) { ctx.roundRect(x, y, w, h, r); return; }
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function draw(now) {
    if (!unit) return;
    const t = reducedMotion ? 0 : now / 1000;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Forget ripples that have faded out
    for (let i = ripples.length - 1; i >= 0; i--) {
      if (now - ripples[i].t0 > 1100) ripples.splice(i, 1);
    }

    const showLabels = unit >= 24;
    ctx.font = `600 ${Math.max(9, Math.round(unit * 0.27))}px Inter, "Segoe UI", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const k of keys) {
      // Light from a direct press, plus any ripple passing through
      let e = Math.max(0, 1 - (now - k.pressAt) / 650);
      if (!reducedMotion) {
        for (const r of ripples) {
          const age = (now - r.t0) / 1000;
          const radius = age * 9; // key units per second
          const d = Math.hypot(k.cx - r.x, (k.cy - r.y) * 1.2);
          const ring = Math.max(0, 1 - Math.abs(d - radius) / 1.3);
          e = Math.max(e, ring * (1 - age / 1.1) * 0.85);
        }
      }

      const hue = ((k.cx / COLS) * 300 - t * 40) % 360;
      const px = k.x * unit + (GAP * unit) / 2;
      const py = k.y * unit + (GAP * unit) / 2;
      const pw = k.w * unit - GAP * unit;
      const ph = k.h * unit - GAP * unit;
      const radius = Math.min(6, unit * 0.16);

      roundRect(px, py, pw, ph, radius);
      ctx.fillStyle = '#121722';
      ctx.fill();
      ctx.fillStyle = `hsla(${hue}, 90%, ${55 + e * 15}%, ${0.13 + e * 0.72})`;
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = `hsla(${hue}, 90%, 62%, ${0.26 + e * 0.5})`;
      ctx.stroke();

      if (showLabels && k.label) {
        ctx.fillStyle = `rgba(232, 236, 245, ${0.42 + e * 0.55})`;
        ctx.fillText(k.label, px + pw / 2, py + ph / 2 + 0.5);
      }
    }
  }

  // ── Animation loop: only while visible ───────────────────────
  let onScreen = false;
  let raf = 0;

  function frame(now) {
    draw(now);
    raf = requestAnimationFrame(frame);
  }

  function updateLoop() {
    const run = onScreen && !document.hidden && !reducedMotion;
    if (run && !raf) raf = requestAnimationFrame(frame);
    if (!run && raf) { cancelAnimationFrame(raf); raf = 0; }
  }

  function press(k) {
    const now = performance.now();
    k.pressAt = now;
    ripples.push({ x: k.cx, y: k.cy, t0: now });
    if (ripples.length > 12) ripples.shift();
    // Light it straight away, whether or not the animation loop is running
    draw(now);
    if (reducedMotion || !raf) setTimeout(() => draw(performance.now()), 700);
  }

  window.addEventListener('keydown', (e) => {
    const k = byCode.get(e.code);
    if (k) press(k);
  });

  canvas.addEventListener('pointerdown', (e) => {
    const r = canvas.getBoundingClientRect();
    const ux = ((e.clientX - r.left) / r.width) * COLS;
    const uy = ((e.clientY - r.top) / r.height) * TOTAL_H;
    const k = keys.find((key) => ux >= key.x && ux < key.x + key.w && uy >= key.y && uy < key.y + key.h);
    if (k) press(k);
  });

  // ── Say hello once, after the loader has gone ─────────────────
  let greeted = false;
  function greet() {
    if (greeted || reducedMotion) return;
    if (document.querySelector('.loader')) { setTimeout(greet, 400); return; }
    greeted = true;
    'AARONKP'.split('').forEach((c, i) => {
      setTimeout(() => press(byCode.get(`Key${c}`)), 1400 + i * 150);
    });
  }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      onScreen = entries[0].isIntersecting;
      updateLoop();
      if (onScreen) greet();
    }).observe(canvas);
  } else {
    onScreen = true;
    updateLoop();
  }

  document.addEventListener('visibilitychange', updateLoop);
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas);
  else window.addEventListener('resize', resize);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => draw(performance.now()));

  resize();
  wrap.classList.add('is-ready');
})();
