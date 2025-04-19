(() => {
  const canvas = document.getElementById('visualizer');
  const ctx = canvas.getContext('2d');
  let audioCtx, analyser, dataArray, source;
  let animationId;
  const themes = {
    default: ['#ffffff'],
    neon: ['#ff007f', '#00ffff', '#7fff00'],
    sunset: ['#ff5e5e', '#ffca5e', '#5e5eff']
  };
  let currentTheme = themes.default;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  document.getElementById('theme-selector').addEventListener('change', (e) => {
    currentTheme = themes[e.target.value];
  });

  document.getElementById('start-btn').addEventListener('click', async () => {
    document.getElementById('start-btn').disabled = true;
    document.getElementById('stop-btn').disabled = false;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    const bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      draw();
    } catch (err) {
      console.error('Error accessing microphone', err);
    }
  });

  document.getElementById('stop-btn').addEventListener('click', () => {
    document.getElementById('start-btn').disabled = false;
    document.getElementById('stop-btn').disabled = true;
    if (source && source.mediaStream) {
      source.mediaStream.getTracks().forEach(track => track.stop());
    }
    if (audioCtx) {
      audioCtx.close();
    }
    cancelAnimationFrame(animationId);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  });

  function draw() {
    animationId = requestAnimationFrame(draw);
    analyser.getByteFrequencyData(dataArray);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const barWidth = (canvas.width / dataArray.length) * 2.5;
    let x = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const barHeight = (dataArray[i] / 255) * canvas.height;
      ctx.fillStyle = currentTheme[i % currentTheme.length];
      ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
      x += barWidth + 1;
    }
  }
})();
