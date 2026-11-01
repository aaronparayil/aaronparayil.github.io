/* ═══════════════════════════════════════════════════════════════
   UPTIME — a tiny load-balancing game.
   Requests fly in towards the load balancer; send them to a server
   with room before it overloads. Red packets are attacks: zap them
   before they land. No dependencies; the loop only runs while playing.
═══════════════════════════════════════════════════════════════ */
(() => {
  'use strict';

  const section = document.getElementById('play');
  const canvas  = document.getElementById('uptime-game');
  if (!section || !canvas || !canvas.getContext) return;

  const ctx      = canvas.getContext('2d');
  const shell    = canvas.closest('.game-shell');
  const overlay  = shell.querySelector('.game-overlay');
  const titleEl  = overlay.querySelector('.game-title');
  const msgEl    = overlay.querySelector('.game-msg');
  const startBtn = overlay.querySelector('.game-start');
  const bestEl   = overlay.querySelector('.game-best span');

  // The section only exists for JS users
  section.hidden = false;

  const C = {
    text: '#E8ECF5', muted: '#8C95A8', line: 'rgba(232, 236, 245, 0.10)',
    panel: '#151A24', panel2: '#1B2130',
    ok: '#3DDC97', warn: '#FFB347', hot: '#FF6F91', bad: '#FF4D5E',
  };
  // No pinks/reds here, so attack packets always stand out
  const PACKET_COLORS = ['#FFB347', '#D257C9', '#8F5BFF'];
  const FONT = '"Chakra Petch", "Segoe UI", sans-serif';
  const SERVER_RATES = [16, 20, 13, 18];   // load drained per second
  const AUTOSCALE_AT = 60;                 // requests served before srv-4 spins up
  const FIREWALL_COOLDOWN = 6;
  const BEST_KEY = 'akp-uptime-best';
  const touch = window.matchMedia('(pointer: coarse)').matches;

  let W = 0, H = 0, u = 1, vertical = false;
  let lb = { x: 0, y: 0 };
  let servers = [], packets = [], sparks = [], floaters = [];
  let state = 'idle';   // idle | playing | paused | over
  let selected = 0, served = 0, uptime = 100, elapsed = 0;
  let spawnIn = 0, firewallIn = 0, sweep = 0, shake = 0, banner = null;
  let last = 0, raf = 0;
  let best = readBest();

  function readBest() {
    try { return parseInt(localStorage.getItem(BEST_KEY), 10) || 0; } catch (e) { return 0; }
  }

  function writeBest(n) {
    try { localStorage.setItem(BEST_KEY, String(n)); } catch (e) { /* storage blocked */ }
  }

  /* ── Setup ──────────────────────────────────────────────── */
  const makeServer = (i) => ({ load: 0, rate: SERVER_RATES[i], down: 0, flash: 0, x: 0, y: 0, w: 0, h: 0 });

  function reset() {
    servers  = [0, 1, 2].map(makeServer);
    packets  = []; sparks = []; floaters = [];
    selected = 0; served = 0; uptime = 100; elapsed = 0;
    spawnIn  = 0.6; firewallIn = 0; sweep = 0; shake = 0;
    banner   = { text: touch ? 'Tap a server to route traffic' : 'Click a server (or press 1–3) to route traffic', life: 3 };
    layout();
  }

  // Horizontal on wide screens; on phones the traffic falls top → bottom
  function layout() {
    vertical = W < 560;
    u = vertical ? Math.min(W / 420, H / 560) : Math.min(W / 960, H / 540);
    u = Math.max(0.65, Math.min(1.25, u));
    const n = servers.length;

    if (vertical) {
      lb = { x: W / 2, y: H * 0.44 };
      const gap = 10 * u;
      const w = (W - 28 - gap * (n - 1)) / n;
      const h = Math.min(H * 0.2, 112 * u);
      servers.forEach((s, i) => Object.assign(s, { x: 14 + i * (w + gap), y: H - h - 22 * u, w, h }));
    } else {
      const top = 70 * u, bottom = H - 40 * u, gap = 14 * u;
      const h = Math.min(96 * u, (bottom - top - gap * (n - 1)) / n);
      const w = Math.min(200 * u, W * 0.21);
      const y0 = top + (bottom - top - (n * h + gap * (n - 1))) / 2;
      lb = { x: W * 0.44, y: (top + bottom) / 2 };
      servers.forEach((s, i) => Object.assign(s, { x: W - w - 28 * u, y: y0 + i * (h + gap), w, h }));
    }
  }

  function resize() {
    const r = canvas.getBoundingClientRect();
    if (!r.width || !r.height) return;
    W = r.width; H = r.height;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width  = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    layout();
    if (state !== 'playing') draw();
  }

  /* ── Geometry helpers ───────────────────────────────────── */
  const port   = (s) => (vertical ? { x: s.x + s.w / 2, y: s.y } : { x: s.x, y: s.y + s.h / 2 });
  const centre = (s) => ({ x: s.x + s.w / 2, y: s.y + s.h / 2 });
  const ends   = (p) => (p.stage === 0 ? [p.from, lb] : [lb, port(servers[p.target])]);

  function pos(p) {
    const [a, b] = ends(p);
    return { x: a.x + (b.x - a.x) * p.t, y: a.y + (b.y - a.y) * p.t };
  }

  /* ── Game logic ─────────────────────────────────────────── */
  function spawn() {
    const bad   = elapsed > 12 && Math.random() < Math.min(0.2, 0.06 + elapsed * 0.0012);
    const heavy = !bad && Math.random() < 0.16;
    const from  = vertical
      ? { x: 20 + Math.random() * (W - 40), y: -12 }
      : { x: -12, y: 70 * u + Math.random() * (H - 110 * u) };
    packets.push({
      from, bad, heavy, stage: 0, t: 0, target: -1,
      color: PACKET_COLORS[(Math.random() * PACKET_COLORS.length) | 0],
      spin: Math.random() * Math.PI,
    });
  }

  const hurt = (n) => { uptime = Math.max(0, uptime - n); };

  function land(p) {
    const s = servers[p.target];
    const at = port(s);
    if (s.down > 0) { hurt(5); float(at, 'dropped', C.bad); return; }

    if (p.bad) {
      s.load += 42; s.flash = 1;
      burst(at, C.bad, 14);
      float(at, 'attack!', C.bad);
    } else {
      s.load += p.heavy ? 22 : 12;
      served += p.heavy ? 2 : 1;
      burst(at, p.color, 5);
    }

    if (s.load >= 100) {
      s.load = 100; s.down = 4; shake = 1;
      hurt(14);
      burst(centre(s), C.hot, 26);
      float(centre(s), `srv-${servers.indexOf(s) + 1} down`, C.hot);
    }
  }

  function zap(p, quiet) {
    const at = pos(p);
    packets.splice(packets.indexOf(p), 1);
    served += 1;
    burst(at, C.bad, 12);
    if (!quiet) float(at, '+1 blocked', C.ok);
  }

  function firewall() {
    if (firewallIn > 0) return;
    const attacks = packets.filter((p) => p.bad);
    attacks.forEach((p) => zap(p, true));
    firewallIn = FIREWALL_COOLDOWN; sweep = 1;
    banner = { text: attacks.length ? `Firewall blocked ${attacks.length}` : 'Firewall sweep', life: 1.4 };
  }

  function update(dt) {
    elapsed += dt;
    firewallIn = Math.max(0, firewallIn - dt);
    sweep = Math.max(0, sweep - dt * 1.6);
    shake = Math.max(0, shake - dt * 3);
    if (banner && (banner.life -= dt) <= 0) banner = null;

    spawnIn -= dt;
    if (spawnIn <= 0) {
      spawn();
      spawnIn = Math.max(0.24, 0.78 - elapsed * 0.0075) * (0.7 + Math.random() * 0.6);
    }

    for (const s of servers) {
      s.flash = Math.max(0, s.flash - dt * 2.5);
      if (s.down > 0) {
        s.down -= dt;
        if (s.down <= 0) { s.down = 0; s.load = 0; float(centre(s), 'back online', C.ok); }
      } else {
        s.load = Math.max(0, s.load - s.rate * dt);
      }
    }

    const speed = (150 + Math.min(elapsed, 120) * 1.6) * u;
    for (let i = packets.length - 1; i >= 0; i--) {
      const p = packets[i];
      const [a, b] = ends(p);
      p.t += (speed * dt) / (Math.hypot(b.x - a.x, b.y - a.y) || 1);
      p.spin += dt * 4;
      if (p.t < 1) continue;
      if (p.stage === 0) { p.stage = 1; p.t = 0; p.target = selected; continue; }
      packets.splice(i, 1);
      land(p);
    }

    if (servers.length < 4 && served >= AUTOSCALE_AT) {
      servers.push(makeServer(servers.length));
      layout();
      banner = { text: 'Traffic spike — autoscaled to 4 servers', life: 2.8 };
    }

    for (let i = sparks.length - 1; i >= 0; i--) {
      const k = sparks[i];
      k.x += k.vx * dt; k.y += k.vy * dt; k.vx *= 0.92; k.vy *= 0.92;
      if ((k.life -= dt * 1.8) <= 0) sparks.splice(i, 1);
    }
    for (let i = floaters.length - 1; i >= 0; i--) {
      const f = floaters[i];
      f.y -= 26 * u * dt;
      if ((f.life -= dt * 0.9) <= 0) floaters.splice(i, 1);
    }

    if (uptime <= 0) gameOver();
  }

  function burst(at, color, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = (60 + Math.random() * 160) * u;
      sparks.push({ x: at.x, y: at.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, color });
    }
  }

  function float(at, text, color) {
    floaters.push({ x: at.x, y: at.y - 10 * u, text, color, life: 1 });
  }

  /* ── Drawing ────────────────────────────────────────────── */
  function rr(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function sunset(x0, y0, x1, y1) {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, '#FFB347'); g.addColorStop(0.36, '#FF6F91');
    g.addColorStop(0.66, '#D257C9'); g.addColorStop(1, '#8F5BFF');
    return g;
  }

  const font = (size, weight = 600) => `${weight} ${Math.round(size * u)}px ${FONT}`;
  const loadColor = (l) => (l < 60 ? C.ok : l < 85 ? C.warn : C.hot);

  function drawWires() {
    servers.forEach((s, i) => {
      const p = port(s);
      ctx.beginPath(); ctx.moveTo(lb.x, lb.y); ctx.lineTo(p.x, p.y);
      if (i === selected && s.down <= 0) {
        ctx.strokeStyle = sunset(lb.x, lb.y, p.x, p.y);
        ctx.lineWidth = 3 * u;
        ctx.setLineDash([8 * u, 8 * u]);
        ctx.lineDashOffset = -elapsed * 70 * u;
      } else {
        ctx.strokeStyle = C.line;
        ctx.lineWidth = 1.5 * u;
        ctx.setLineDash([]);
      }
      ctx.stroke();
    });
    ctx.setLineDash([]);
  }

  function drawBalancer() {
    const r = 24 * u;
    if (sweep > 0) {
      ctx.beginPath(); ctx.arc(lb.x, lb.y, r + (1 - sweep) * Math.max(W, H) * 0.6, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(61, 220, 151, ${sweep * 0.6})`; ctx.lineWidth = 3 * u; ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(lb.x, lb.y, r, 0, Math.PI * 2);
    ctx.fillStyle = C.panel2; ctx.fill();
    ctx.strokeStyle = sunset(lb.x - r, lb.y, lb.x + r, lb.y); ctx.lineWidth = 2.5 * u; ctx.stroke();
    ctx.fillStyle = C.text; ctx.font = font(13, 700);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('LB', lb.x, lb.y + 1);
  }

  function drawServer(s, i) {
    const r = 8 * u, pad = 10 * u;
    rr(s.x, s.y, s.w, s.h, r);
    ctx.fillStyle = s.down > 0 ? 'rgba(255, 77, 94, 0.08)' : C.panel; ctx.fill();
    if (s.flash > 0) { ctx.fillStyle = `rgba(255, 77, 94, ${s.flash * 0.35})`; ctx.fill(); }
    if (i === selected) { ctx.strokeStyle = sunset(s.x, s.y, s.x + s.w, s.y + s.h); ctx.lineWidth = 2.5 * u; }
    else { ctx.strokeStyle = 'rgba(232, 236, 245, 0.16)'; ctx.lineWidth = 1.5 * u; }
    ctx.stroke();

    // Name + key hint
    ctx.textBaseline = 'top'; ctx.textAlign = 'left';
    ctx.fillStyle = C.text; ctx.font = font(13, 700);
    ctx.fillText(`srv-${i + 1}`, s.x + pad, s.y + pad);
    if (!touch && s.w > 90 * u) {
      ctx.textAlign = 'right'; ctx.fillStyle = C.muted; ctx.font = font(11);
      ctx.fillText(`[${i + 1}]`, s.x + s.w - pad, s.y + pad + 1);
    }

    // Status line
    ctx.textAlign = 'left'; ctx.font = font(11);
    if (s.down > 0) {
      ctx.fillStyle = C.bad;
      ctx.fillText(`rebooting ${s.down.toFixed(1)}s`, s.x + pad, s.y + pad + 18 * u);
    } else {
      ctx.fillStyle = C.muted;
      ctx.fillText(`${Math.round(s.load)}% load`, s.x + pad, s.y + pad + 18 * u);
    }

    // Load bar
    const bw = s.w - pad * 2, bh = 6 * u, by = s.y + s.h - pad - bh;
    rr(s.x + pad, by, bw, bh, bh / 2); ctx.fillStyle = C.panel2; ctx.fill();
    const fill = s.down > 0 ? 1 - s.down / 4 : s.load / 100;
    if (fill > 0.01) {
      rr(s.x + pad, by, Math.max(bh, bw * fill), bh, bh / 2);
      ctx.fillStyle = s.down > 0 ? 'rgba(140, 149, 168, 0.5)' : loadColor(s.load); ctx.fill();
    }
  }

  function drawPacket(p) {
    const q = pos(p);
    if (p.bad) {
      const r = 10 * u, pulse = 1 + Math.sin(elapsed * 10) * 0.15;
      ctx.beginPath(); ctx.arc(q.x, q.y, r * 1.7 * pulse, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 77, 94, 0.16)'; ctx.fill();
      ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(p.spin);
      ctx.fillStyle = C.bad; ctx.fillRect(-r * 0.7, -r * 0.7, r * 1.4, r * 1.4);
      ctx.restore();
      return;
    }
    const size = (p.heavy ? 15 : 10) * u;
    ctx.beginPath(); ctx.arc(q.x, q.y, size, 0, Math.PI * 2);
    ctx.globalAlpha = 0.18; ctx.fillStyle = p.color; ctx.fill(); ctx.globalAlpha = 1;
    rr(q.x - size / 2, q.y - size / 2, size, size, 3 * u);
    ctx.fill();
  }

  function drawHud() {
    const m = 18 * u;
    ctx.textBaseline = 'top';

    ctx.textAlign = 'left';
    ctx.fillStyle = C.muted; ctx.font = font(11);
    ctx.fillText('SERVED', m, m);
    ctx.fillStyle = C.text; ctx.font = font(24, 700);
    ctx.fillText(String(served), m, m + 14 * u);

    const bw = 120 * u, bh = 6 * u, bx = W - m - bw;
    ctx.textAlign = 'right';
    ctx.fillStyle = C.muted; ctx.font = font(11);
    ctx.fillText('UPTIME', W - m, m);
    ctx.fillStyle = uptime > 50 ? C.text : C.bad; ctx.font = font(18, 700);
    ctx.fillText(`${Math.ceil(uptime)}%`, W - m, m + 14 * u);
    rr(bx, m + 40 * u, bw, bh, bh / 2); ctx.fillStyle = C.panel2; ctx.fill();
    if (uptime > 0) {
      rr(bx, m + 40 * u, Math.max(bh, bw * uptime / 100), bh, bh / 2);
      ctx.fillStyle = sunset(bx, 0, bx + bw, 0); ctx.fill();
    }

    if (!vertical) {
      ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; ctx.font = font(11);
      ctx.fillStyle = firewallIn > 0 ? C.muted : C.ok;
      ctx.fillText(firewallIn > 0 ? `FIREWALL · ${firewallIn.toFixed(1)}s` : 'FIREWALL READY · [SPACE]', m, H - m);
    }

    if (banner) {
      ctx.globalAlpha = Math.min(1, banner.life * 2);
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillStyle = C.text; ctx.font = font(13, 600);
      ctx.fillText(banner.text, W / 2, vertical ? 78 * u : m + 4 * u);
      ctx.globalAlpha = 1;
    }
  }

  function draw() {
    if (!W) return;
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    if (shake > 0) ctx.translate((Math.random() - 0.5) * 10 * shake * u, (Math.random() - 0.5) * 10 * shake * u);

    drawWires();
    servers.forEach(drawServer);
    drawBalancer();
    packets.forEach(drawPacket);

    sparks.forEach((k) => {
      ctx.globalAlpha = Math.max(0, k.life);
      ctx.fillStyle = k.color;
      ctx.fillRect(k.x - 1.5 * u, k.y - 1.5 * u, 3 * u, 3 * u);
    });
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = font(12, 700);
    floaters.forEach((f) => {
      ctx.globalAlpha = Math.max(0, f.life);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    });
    ctx.globalAlpha = 1;

    ctx.restore();
    if (state !== 'idle') drawHud();
  }

  /* ── Loop + states ──────────────────────────────────────── */
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    update(dt);
    draw();
    if (state === 'playing') raf = requestAnimationFrame(frame);
  }

  function showOverlay(title, msg, button) {
    titleEl.textContent = title;
    msgEl.textContent = msg;
    startBtn.textContent = button;
    bestEl.textContent = best;
    overlay.hidden = false;
  }

  function start() {
    if (state !== 'paused') reset();
    state = 'playing';
    overlay.hidden = true;
    canvas.focus({ preventScroll: true });
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }

  function pause() {
    if (state !== 'playing') return;
    state = 'paused';
    cancelAnimationFrame(raf);
    showOverlay('Paused', 'Your servers are holding their breath.', 'Resume');
  }

  function gameOver() {
    state = 'over';
    const record = served > best;
    if (record) { best = served; writeBest(best); }
    const secs = Math.round(elapsed);
    showOverlay(
      'Outage',
      `You served ${served} requests in ${secs}s before going down.${record ? ' New best!' : ''}`,
      'Play again'
    );
    startBtn.focus({ preventScroll: true });
  }

  /* ── Input ──────────────────────────────────────────────── */
  canvas.addEventListener('pointerdown', (e) => {
    if (state !== 'playing') return;
    const r = canvas.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;

    // Attacks first: tapping one zaps it
    let hit = null, nearest = (touch ? 34 : 26) * u;
    for (const p of packets) {
      if (!p.bad) continue;
      const q = pos(p), d = Math.hypot(q.x - x, q.y - y);
      if (d < nearest) { nearest = d; hit = p; }
    }
    if (hit) { zap(hit); return; }

    // Otherwise pick the server closest to the pointer on the servers' side
    if (vertical ? y < lb.y : x < lb.x) return;
    let pick = 0, gap = Infinity;
    servers.forEach((s, i) => {
      const c = centre(s), d = vertical ? Math.abs(c.x - x) : Math.abs(c.y - y);
      if (d < gap) { gap = d; pick = i; }
    });
    selected = pick;
  });

  window.addEventListener('keydown', (e) => {
    if (state !== 'playing' || e.target.closest('input, textarea, select')) return;
    const n = servers.length, k = e.key;
    if (k >= '1' && k <= String(n)) selected = Number(k) - 1;
    else if (['ArrowUp', 'ArrowLeft', 'w', 'a'].includes(k)) selected = (selected + n - 1) % n;
    else if (['ArrowDown', 'ArrowRight', 's', 'd'].includes(k)) selected = (selected + 1) % n;
    else if (k === ' ') firewall();
    else if (k === 'Escape' || k === 'p') pause();
    else return;
    e.preventDefault();
  });

  startBtn.addEventListener('click', start);

  // Pause when the tab is hidden or the game scrolls out of view
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => { if (!entry.isIntersecting) pause(); }, { threshold: 0.3 }).observe(shell);
  }

  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(shell);
  else window.addEventListener('resize', resize);

  // Idle scene behind the start screen
  reset();
  resize();
  bestEl.textContent = best;
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (state !== 'playing') draw(); });
})();
