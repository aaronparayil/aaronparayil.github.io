/**
 * hero-orb.js
 * Three.js particle sphere for Aaron Koshy Parayil's portfolio hero.
 * Uses BufferGeometry + PointsMaterial with crimson/gold/ash particles.
 * Mouse interactivity: particles near cursor get pushed outward.
 */

(function () {
  'use strict';

  // ── Configuration ──────────────────────────────────────────────
  const CONFIG = {
    particleCount:   2200,
    radius:          1.8,
    pointSize:       3.5,
    rotationSpeed:   0.0006,
    mouseInfluence:  0.45,
    returnSpeed:     0.025,
    colors: {
      crimson: new THREE.Color('#C41E3A'),
      gold:    new THREE.Color('#FFB800'),
      ash:     new THREE.Color('#F0ECE6'),
      dim:     new THREE.Color('#661020'),
    },
  };

  // ── State ───────────────────────────────────────────────────────
  let scene, camera, renderer, particles, particleGeo;
  let originalPositions; // Float32Array - sphere surface positions
  let mouse = { x: 0, y: 0 };        // normalized [-1, 1] relative to canvas
  let canvasEl;
  let animFrameId;
  let parentEl;

  // ── Init ────────────────────────────────────────────────────────
  function init() {
    parentEl  = document.getElementById('hero-canvas-wrapper');
    canvasEl  = document.getElementById('hero-canvas');
    if (!parentEl || !canvasEl) return;

    // Scene
    scene = new THREE.Scene();

    // Camera
    camera = new THREE.PerspectiveCamera(60, getAspect(), 0.1, 100);
    camera.position.z = 5.5;

    // Renderer — attach to existing canvas element
    renderer = new THREE.WebGLRenderer({
      canvas: canvasEl,
      alpha: true,
      antialias: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    setRendererSize();

    // Build particle geometry
    buildParticles();

    // Events
    window.addEventListener('resize', onResize);
    parentEl.addEventListener('mousemove', onMouseMove);
    parentEl.addEventListener('mouseleave', onMouseLeave);

    // Start loop
    animate();
  }

  // ── Build particles arranged on a sphere ─────────────────────────
  function buildParticles() {
    const count = CONFIG.particleCount;
    const positions = new Float32Array(count * 3);
    const colors    = new Float32Array(count * 3);
    const sizes     = new Float32Array(count);

    const r = CONFIG.radius;

    // Use Fibonacci sphere for even distribution
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));

    for (let i = 0; i < count; i++) {
      // Fibonacci sphere coords
      const y     = 1 - (i / (count - 1)) * 2;
      const radi  = Math.sqrt(1 - y * y);
      const theta = goldenAngle * i;

      const x = Math.cos(theta) * radi * r;
      const z = Math.sin(theta) * radi * r;
      const yPos = y * r;

      positions[i * 3]     = x;
      positions[i * 3 + 1] = yPos;
      positions[i * 3 + 2] = z;

      // Color distribution: ~55% crimson, ~25% gold, ~20% ash
      const rand = Math.random();
      let col;
      if (rand < 0.55) {
        col = CONFIG.colors.crimson.clone();
        col.lerp(CONFIG.colors.dim, Math.random() * 0.45);
      } else if (rand < 0.80) {
        col = CONFIG.colors.gold.clone();
        col.lerp(new THREE.Color('#AA7A00'), Math.random() * 0.5);
      } else {
        col = CONFIG.colors.ash.clone();
        col.multiplyScalar(0.3 + Math.random() * 0.35);
      }

      colors[i * 3]     = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;

      // Vary size slightly
      sizes[i] = CONFIG.pointSize * (0.6 + Math.random() * 0.8);
    }

    // Store original positions for displacement reset
    originalPositions = new Float32Array(positions);

    particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeo.setAttribute('color',    new THREE.BufferAttribute(colors, 3));
    particleGeo.setAttribute('size',     new THREE.BufferAttribute(sizes, 1));

    const mat = new THREE.PointsMaterial({
      size:          CONFIG.pointSize,
      vertexColors:  true,
      transparent:   true,
      opacity:       0.85,
      sizeAttenuation: true,
      depthWrite:    false,
    });

    particles = new THREE.Points(particleGeo, mat);
    scene.add(particles);
  }

  // ── Animation loop ───────────────────────────────────────────────
  let clock = { t: 0 };

  function animate() {
    animFrameId = requestAnimationFrame(animate);
    clock.t += CONFIG.rotationSpeed;

    // Slow auto-rotation
    particles.rotation.y = clock.t;
    particles.rotation.x = Math.sin(clock.t * 0.4) * 0.12;

    // Mouse distortion — displace particles near projected mouse
    applyMouseDistortion();

    renderer.render(scene, camera);
  }

  // ── Mouse distortion ──────────────────────────────────────────────
  function applyMouseDistortion() {
    const posAttr = particleGeo.attributes.position;
    const orig    = originalPositions;
    const count   = CONFIG.particleCount;
    const influence = CONFIG.mouseInfluence;
    const returnSpd = CONFIG.returnSpeed;

    // Project mouse to world space (z=0 plane at camera)
    const vFOV   = THREE.MathUtils.degToRad(60);
    const hH     = Math.tan(vFOV / 2) * camera.position.z;
    const hW     = hH * getAspect();
    const mxWorld = mouse.x * hW;
    const myWorld = mouse.y * hH;

    for (let i = 0; i < count; i++) {
      const ox = orig[i * 3];
      const oy = orig[i * 3 + 1];
      const oz = orig[i * 3 + 2];

      // Current displaced position
      let cx = posAttr.getX(i);
      let cy = posAttr.getY(i);
      let cz = posAttr.getZ(i);

      // Distance from mouse in XY
      const dx = cx - mxWorld;
      const dy = cy - myWorld;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const pushRadius = 1.2;
      if (dist < pushRadius) {
        const force    = (1 - dist / pushRadius) * influence;
        const nx       = dx / (dist + 0.001);
        const ny       = dy / (dist + 0.001);
        cx += nx * force;
        cy += ny * force;
        cz += (Math.random() - 0.5) * force * 0.3;
      }

      // Spring return to original
      cx += (ox - cx) * returnSpd;
      cy += (oy - cy) * returnSpd;
      cz += (oz - cz) * returnSpd;

      posAttr.setXYZ(i, cx, cy, cz);
    }

    posAttr.needsUpdate = true;
  }

  // ── Event Handlers ───────────────────────────────────────────────
  function onMouseMove(e) {
    const rect = parentEl.getBoundingClientRect();
    // Normalize to [-1, 1]
    mouse.x =  ((e.clientX - rect.left)  / rect.width  - 0.5) * 2;
    mouse.y = -((e.clientY - rect.top)   / rect.height - 0.5) * 2;
  }

  function onMouseLeave() {
    // Smoothly pull mouse to center so orb reforms
    mouse.x = 0;
    mouse.y = 0;
  }

  function onResize() {
    camera.aspect = getAspect();
    camera.updateProjectionMatrix();
    setRendererSize();
  }

  // ── Helpers ──────────────────────────────────────────────────────
  function getAspect() {
    if (!parentEl) return 1;
    return parentEl.clientWidth / parentEl.clientHeight || 1;
  }

  function setRendererSize() {
    if (!parentEl || !renderer) return;
    renderer.setSize(parentEl.clientWidth, parentEl.clientHeight, false);
  }

  // ── Boot ─────────────────────────────────────────────────────────
  // Wait for Three.js to be available and DOM ready
  function boot() {
    if (typeof THREE === 'undefined') {
      // retry after small delay
      setTimeout(boot, 150);
      return;
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  }

  boot();
})();
