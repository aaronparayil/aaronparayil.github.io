/**
 * hero-orb.js
 * Three.js particle sphere for Aaron Koshy Parayil's portfolio hero.
 * Crimson/gold/ash particles on a Fibonacci sphere. The mouse push is done
 * in the vertex shader on the GPU, so the CPU only updates a few uniforms.
 */

(function () {
  'use strict';

  // ── Configuration ──────────────────────────────────────────────
  const CONFIG = {
    particleCount:   2200,
    radius:          1.8,
    pointSize:       0.065,  // world units
    opacity:         0.85,
    rotationSpeed:   0.0006,
    pushForce:       0.6,
    pushRadius:      1.2,
    maxPixelRatio:   1.5,
    colors: {
      crimson: '#C41E3A',
      gold:    '#FFB800',
      goldDim: '#AA7A00',
      ash:     '#F0ECE6',
      dim:     '#661020',
    },
  };

  const VERTEX_SHADER = `
    uniform float uSize;
    uniform float uScale;
    uniform float uRadius;
    uniform float uForce;
    uniform float uStrength;
    uniform vec2  uMouse;
    attribute vec3 aColor;
    varying vec3 vColor;

    void main() {
      vColor = aColor;
      vec4 world = modelMatrix * vec4(position, 1.0);

      // Push particles away from the mouse in screen-aligned XY
      vec2 d = world.xy - uMouse;
      float dist = length(d);
      float f = max(0.0, 1.0 - dist / uRadius) * uForce * uStrength;
      world.xy += d / (dist + 0.001) * f;

      vec4 mv = viewMatrix * world;
      gl_PointSize = uSize * (uScale / -mv.z);
      gl_Position = projectionMatrix * mv;
    }
  `;

  const FRAGMENT_SHADER = `
    uniform float uOpacity;
    varying vec3 vColor;

    void main() {
      vec2 c = gl_PointCoord - 0.5;
      if (dot(c, c) > 0.25) discard; // round points
      gl_FragColor = vec4(vColor, uOpacity);
    }
  `;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── State ───────────────────────────────────────────────────────
  let scene, camera, renderer, particles, uniforms;
  let mouse = { x: 0, y: 0, active: false }; // normalized [-1, 1] relative to canvas
  let rect = null;                           // cached canvas rect
  let canvasEl;
  let animFrameId = null;
  let parentEl;
  let isVisible = true;

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
    try {
      renderer = new THREE.WebGLRenderer({
        canvas: canvasEl,
        alpha: true,
        antialias: false, // round points don't need MSAA
        powerPreference: 'low-power',
      });
    } catch (err) {
      return; // WebGL unavailable — hero still works without the orb
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, CONFIG.maxPixelRatio));
    renderer.setClearColor(0x000000, 0);

    // Build particle geometry
    buildParticles();
    setRendererSize();

    // Events
    window.addEventListener('resize', onResize);

    if (reducedMotion) {
      // Static orb: render once, no rotation or mouse distortion
      renderer.render(scene, camera);
      return;
    }

    parentEl.addEventListener('mouseenter', updateRect);
    parentEl.addEventListener('mousemove', onMouseMove);
    parentEl.addEventListener('mouseleave', onMouseLeave);

    // Pause the loop while the hero is scrolled out of view
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries) => {
        isVisible = entries[0].isIntersecting;
        if (isVisible) start(); else stop();
      }).observe(parentEl);
    }

    start();
  }

  // ── Build particles arranged on a sphere ─────────────────────────
  function buildParticles() {
    const count = CONFIG.particleCount;
    const positions = new Float32Array(count * 3);
    const colors    = new Float32Array(count * 3);

    const r = CONFIG.radius;
    const c = {};
    Object.keys(CONFIG.colors).forEach((k) => { c[k] = new THREE.Color(CONFIG.colors[k]); });

    // Use Fibonacci sphere for even distribution
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));

    for (let i = 0; i < count; i++) {
      // Fibonacci sphere coords
      const y     = 1 - (i / (count - 1)) * 2;
      const radi  = Math.sqrt(1 - y * y);
      const theta = goldenAngle * i;

      positions[i * 3]     = Math.cos(theta) * radi * r;
      positions[i * 3 + 1] = y * r;
      positions[i * 3 + 2] = Math.sin(theta) * radi * r;

      // Color distribution: ~55% crimson, ~25% gold, ~20% ash
      const rand = Math.random();
      let col;
      if (rand < 0.55) {
        col = c.crimson.clone().lerp(c.dim, Math.random() * 0.45);
      } else if (rand < 0.80) {
        col = c.gold.clone().lerp(c.goldDim, Math.random() * 0.5);
      } else {
        col = c.ash.clone().multiplyScalar(0.3 + Math.random() * 0.35);
      }

      colors[i * 3]     = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aColor',   new THREE.BufferAttribute(colors, 3));

    uniforms = {
      uSize:     { value: CONFIG.pointSize * renderer.getPixelRatio() },
      uScale:    { value: 300 },
      uRadius:   { value: CONFIG.pushRadius },
      uForce:    { value: CONFIG.pushForce },
      uStrength: { value: 0 },
      uMouse:    { value: new THREE.Vector2(0, 0) },
      uOpacity:  { value: CONFIG.opacity },
    };

    const mat = new THREE.ShaderMaterial({
      uniforms,
      vertexShader:   VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      transparent:    true,
      depthWrite:     false,
    });

    particles = new THREE.Points(geo, mat);
    scene.add(particles);
  }

  // ── Animation loop ───────────────────────────────────────────────
  let clock = { t: 0 };

  function start() {
    if (animFrameId === null && isVisible) animate();
  }

  function stop() {
    if (animFrameId !== null) cancelAnimationFrame(animFrameId);
    animFrameId = null;
  }

  function animate() {
    animFrameId = requestAnimationFrame(animate);
    clock.t += CONFIG.rotationSpeed;

    // Slow auto-rotation
    particles.rotation.y = clock.t;
    particles.rotation.x = Math.sin(clock.t * 0.4) * 0.12;

    // Ease the mouse position and push strength (smooth in/out)
    const hH = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * camera.position.z;
    const hW = hH * camera.aspect;
    const m  = uniforms.uMouse.value;
    m.x += (mouse.x * hW - m.x) * 0.12;
    m.y += (mouse.y * hH - m.y) * 0.12;
    uniforms.uStrength.value += ((mouse.active ? 1 : 0) - uniforms.uStrength.value) * 0.06;

    renderer.render(scene, camera);
  }

  // ── Event Handlers ───────────────────────────────────────────────
  function updateRect() {
    rect = parentEl.getBoundingClientRect();
  }

  function onMouseMove(e) {
    if (!rect) updateRect();
    // Normalize to [-1, 1]
    mouse.x =  ((e.clientX - rect.left)  / rect.width  - 0.5) * 2;
    mouse.y = -((e.clientY - rect.top)   / rect.height - 0.5) * 2;
    mouse.active = true;
  }

  function onMouseLeave() {
    // Stop pushing so the orb eases back into shape
    mouse.active = false;
    rect = null;
  }

  function onResize() {
    camera.aspect = getAspect();
    camera.updateProjectionMatrix();
    setRendererSize();
    rect = null;
    if (reducedMotion) renderer.render(scene, camera);
  }

  // ── Helpers ──────────────────────────────────────────────────────
  function getAspect() {
    if (!parentEl) return 1;
    return parentEl.clientWidth / parentEl.clientHeight || 1;
  }

  function setRendererSize() {
    if (!parentEl || !renderer) return;
    renderer.setSize(parentEl.clientWidth, parentEl.clientHeight, false);
    if (uniforms) uniforms.uScale.value = parentEl.clientHeight * 0.5;
  }

  // ── Boot ─────────────────────────────────────────────────────────
  // Wait for Three.js to be available and DOM ready (give up after ~6s)
  let tries = 0;
  function boot() {
    if (typeof THREE === 'undefined') {
      if (++tries < 40) setTimeout(boot, 150);
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
