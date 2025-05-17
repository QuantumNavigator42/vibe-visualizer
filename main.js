
(() => {
  const canvas = document.getElementById('visualizer');
  const ctx = canvas.getContext('2d');

  /* UI */
  const modeSelector = document.getElementById('mode-selector');
  const themeSelector = document.getElementById('theme-selector');
  const startBtn = document.getElementById('start-btn');
  const stopBtn = document.getElementById('stop-btn');
  const fsBtn = document.getElementById('fullscreen-btn');
  const gainSlider = document.getElementById('gain-slider');
  const gainOutput = document.getElementById('gain-val');

  // Initialize gain output display
  gainOutput.textContent = parseFloat(gainSlider.value).toFixed(2);
  gainSlider.addEventListener('input', (e) => {
    gainOutput.textContent = parseFloat(e.target.value).toFixed(2);
  });

  /* Audio */
  let audioCtx, analyser, dataArray, source, mediaStream;

  /* Animation */
  let animationId = null;
  let lastFrame = performance.now();

  /* Constants */
  const BAR_SENSITIVITY = 2.0;
  const SPIRAL_SENSITIVITY = 2.5;
  const GALAXY_SENSITIVITY = 3.0;  // sensitivity multiplier for Galaxy mode
  const GALAXY_COLOR_CYCLE_MS = 1000; // color cycling interval for Galaxy theme
  const TWO_PI = Math.PI * 2;

  /* Themes */
  const themes = {
    default: ['#ffffff'],
    neon: ['#ff007f', '#00ffff', '#7fff00'],
    sunset: ['#ff5e5e', '#ffca5e', '#5e5eff'],
    cyberpunk: ['#f209a4', '#05f2c6', '#16146d', '#f2fa05'],
    galaxy: ['#f9f871', '#f984e5', '#7be0f9', '#a0f977']
  };
  let currentTheme = themes.default;  // start with default palette

  /* Canvas size */
  let MAX_RADIUS;
  function resize() {
    // handle high-DPI displays
    const width = window.innerWidth;
    const height = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    // reset transform and scale for CSS pixels
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    MAX_RADIUS = Math.min(width, height) * 0.6;
  }
  window.addEventListener('resize', resize);
  resize();

  // Galaxy mode using Three.js
  let galaxyVis = null;
  class GalaxyVis {
    constructor() {
      this.canvas = canvas;
      // bind resize handler
      this.onResize = this.onResize.bind(this);
      // setup renderer, scene, camera
      const { WebGLRenderer, Scene, PerspectiveCamera, BufferGeometry, BufferAttribute, PointsMaterial, Points } = THREE;
      this.renderer = new WebGLRenderer({ canvas: this.canvas, alpha: true, antialias: true });
      this.renderer.setPixelRatio(devicePixelRatio);
      this.renderer.setSize(innerWidth, innerHeight);
      this.scene = new Scene();
      this.camera = new PerspectiveCamera(75, innerWidth / innerHeight, 1, 5000);
      this.camera.position.z = 1000;
      window.addEventListener('resize', this.onResize);
      this.initGalaxy();
      this.animate = this.animate.bind(this);
    }
    initGalaxy() {
      const PARTICLE_COUNT = 2000;
      const positions = new Float32Array(PARTICLE_COUNT * 3);
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        positions[3 * i] = (Math.random() - 0.5) * 2000;
        positions[3 * i + 1] = (Math.random() - 0.5) * 2000;
        positions[3 * i + 2] = (Math.random() - 0.5) * 2000;
      }
      const geometry = new BufferGeometry();
      geometry.setAttribute('position', new BufferAttribute(positions, 3));
      const material = new PointsMaterial({ size: 2, sizeAttenuation: true, color: 0xffffff, transparent: true, opacity: 0.8 });
      this.points = new Points(geometry, material);
      this.scene.add(this.points);
    }
    animate() {
      // audio-reactive intensity
      analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0, len = dataArray.length; i < len; i++) sum += dataArray[i];
      const intensity = Math.min(sum / dataArray.length / 255 * GALAXY_SENSITIVITY, 1);
      // rotate galaxy
      this.points.rotation.y += 0.001 + intensity * 0.01;
      // cycle through theme colors
      if (Array.isArray(currentTheme) && currentTheme.length) {
        const idx = Math.floor(performance.now() / GALAXY_COLOR_CYCLE_MS) % currentTheme.length;
        this.points.material.color.set(currentTheme[idx]);
      }
      // render scene
      this.renderer.render(this.scene, this.camera);
      this._id = requestAnimationFrame(this.animate);
    }
    stop() {
      // stop animation and cleanup
      cancelAnimationFrame(this._id);
      window.removeEventListener('resize', this.onResize);
    }
    onResize() {
      this.camera.aspect = innerWidth / innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(innerWidth, innerHeight);
    }
  }

  /* Fullscreen toggle */
  fsBtn.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  });
  document.addEventListener('fullscreenchange', () => {
    fsBtn.textContent = document.fullscreenElement ? 'Exit Fullscreen' : 'Fullscreen';
  });

  /* Theme change */
  themeSelector.addEventListener('change', e => {
    currentTheme = themes[e.target.value] || themes.default;
  });

  /* Audio init */
  async function initAudio(gainValue, fftSize) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = fftSize;
    dataArray = new Uint8Array(analyser.frequencyBinCount);
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      source = audioCtx.createMediaStreamSource(mediaStream);
      const gainNode = audioCtx.createGain();
      gainNode.gain.value = gainValue;
      source.connect(gainNode);
      gainNode.connect(analyser);
    } catch (err) {
      console.error('Microphone error:', err);
    }
  }

  /* Bars mode (kept simple) */
  function drawBars() {
    animationId = requestAnimationFrame(drawBars);
    // update audio data and clear
    analyser.getByteFrequencyData(dataArray);
    // use CSS pixel dimensions
    const cw = canvas.clientWidth, ch = canvas.clientHeight;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cw, ch);
    // precompute constants
    const len = dataArray.length;
    const barW = cw / len;
    const step = barW + 1;
    const mid = len * 0.5;
    const invSigma = 6 / len;      // 1/(len/6)
    const inv255 = 1 / 255;
    const themeLen = currentTheme.length;
    let x = 0;
    // draw bars
    for (let i = 0; i < len; i++) {
      const d = (i - mid) * invSigma;
      const env = Math.exp(-0.5 * d * d);
      const v = dataArray[i] * inv255;
      const hgt = v * env * ch;
      ctx.fillStyle = currentTheme[i % themeLen];
      ctx.fillRect(x, ch - hgt, barW, hgt);
      x += step;
    }
  }

  /* Spiral mode advanced */
  const particles = [];
  const PARTICLE_COUNT = 1200;

  let globalTime = 0;

  /* Black hole */
  let blackHoleActive = false;
  let blackHoleRadius = 0;
  const BLACK_HOLE_MAX = 160;
  const BLACK_HOLE_GROW_SPEED = 2.5;
  const BLACK_HOLE_INTERVAL = 18000;
  let lastBlackHole = 0;

  function initParticles() {
    particles.length = 0;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        theta: Math.random() * TWO_PI,
        radius: Math.random() * MAX_RADIUS,
        speed: 0
      });
    }
  }

  function updateBlackHole(dt, timestamp) {
    if (!blackHoleActive && timestamp - lastBlackHole > BLACK_HOLE_INTERVAL) {
      blackHoleActive = true;
      blackHoleRadius = 0;
      lastBlackHole = timestamp;
    }
    if (blackHoleActive) {
      blackHoleRadius += BLACK_HOLE_GROW_SPEED;
      if (blackHoleRadius >= BLACK_HOLE_MAX) {
        blackHoleActive = false;
        blackHoleRadius = 0;
      }
    }
  }

  function drawBlackHole() {
    if (!blackHoleActive) return;
    const cx = canvas.clientWidth  / 2;
    const cy = canvas.clientHeight / 2;
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, blackHoleRadius);
    gradient.addColorStop(0, '#000000');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cx, cy, blackHoleRadius, 0, TWO_PI);
    ctx.fill();
  }

  /* Evolving spiral parameters */
  function evolvingA(t) {
    return 1.5 + Math.sin(t * 0.0001) * 0.5;
  }
  function evolvingB(t) {
    return 0.15 + Math.sin(t * 0.00007) * 0.05;
  }

  function drawSpiral(timestamp = performance.now()) {
    // frame timing
    const dt = timestamp - lastFrame;
    lastFrame = timestamp;
    globalTime += dt;
    animationId = requestAnimationFrame(drawSpiral);
    // audio data
    analyser.getByteFrequencyData(dataArray);
    // use CSS pixel dimensions
    const cw = canvas.clientWidth, ch = canvas.clientHeight;
    // background fade
    ctx.fillStyle = 'rgba(0,0,0,0.06)'; ctx.fillRect(0, 0, cw, ch);
    // black hole update
    updateBlackHole(dt, timestamp);
    // compute intensity
    const len = dataArray.length;
    let sum = 0;
    for (let j = 0; j < len; j++) sum += dataArray[j];
    const invLen = 1 / len, inv255 = 1 / 255;
    const intensity = Math.min(sum * invLen * inv255 * SPIRAL_SENSITIVITY, 1);
    // center
    const cx = cw * 0.5, cy = ch * 0.5;
    // evolving params
    const aParam = evolvingA(globalTime), bParam = evolvingB(globalTime);
    // theme
    const themeLen = currentTheme.length;
    const colorOffset = ((globalTime / 4000) | 0) % themeLen;
    // black hole drain factor
    const drain = 3 * intensity + 0.8;
    // draw particles
    for (let i = 0, count = particles.length; i < count; i++) {
      const p = particles[i];
      if (blackHoleActive) {
        p.radius -= drain;
        if (p.radius < 2) { p.radius = MAX_RADIUS; p.theta = Math.random() * TWO_PI; }
      } else {
        p.theta += 0.0015 + 0.009 * intensity + (i % 7) * 0.00015;
        p.radius = (aParam * Math.exp(bParam * p.theta)) % MAX_RADIUS;
      }
      // position
      const x = cx + p.radius * Math.cos(p.theta);
      const y = cy + p.radius * Math.sin(p.theta);
      // draw point
      const size = 1.2 + 2.5 * intensity;
      const idx = (i + colorOffset) % themeLen;
      ctx.fillStyle = currentTheme[idx];
      ctx.beginPath(); ctx.arc(x, y, size, 0, TWO_PI); ctx.fill();
    }
    // overlay black hole
    drawBlackHole();
  }

  /* Stop */
  function stopVisualization() {
    startBtn.disabled = false;
    stopBtn.disabled = true;
    if (mediaStream) {
      mediaStream.getTracks().forEach(t => t.stop());
      mediaStream = null;
    }
    if (audioCtx) {
      audioCtx.close();
      audioCtx = null;
    }
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
    // stop Galaxy mode if active
    if (galaxyVis) {
      galaxyVis.stop();
      galaxyVis = null;
    }
    // clear using CSS pixel dimensions
    ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
  }

  /* Start button */
  startBtn.addEventListener('click', async () => {
    startBtn.disabled = true;
    stopBtn.disabled = false;
    const mode = modeSelector.value;
    const gainMult = parseFloat(gainSlider.value);
    if (mode === 'bars') {
      await initAudio(BAR_SENSITIVITY * gainMult, 2048);
      drawBars();
    } else if (mode === 'spiral') {
      await initAudio(SPIRAL_SENSITIVITY * gainMult, 512);
      initParticles();
      globalTime = 0;
      lastFrame = performance.now();
      drawSpiral(lastFrame);
    } else if (mode === 'galaxy') {
      await initAudio(GALAXY_SENSITIVITY * gainMult, 1024);
      galaxyVis = new GalaxyVis();
      galaxyVis.animate();
    }
  });

  stopBtn.addEventListener('click', stopVisualization);
})();
