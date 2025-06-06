# Vibe Visualizer

A simple audio visualizer for entertainment purposes. Captures microphone input and renders real-time animated bars with waveform on an HTML5 canvas.

## Features

- Real-time FFT audio analysis
- Animated bar visualizer
- Multiple color themes (Default, Neon, Sunset, Cyberpunk, Galaxy)
- Galaxy theme cycles through the palette for a dynamic effect
- Start/Stop controls
- Fullscreen support

## Usage

1. Open `index.html` in a modern browser.
2. Click **Start** to begin.
   - In **Bars** mode (default), the app captures microphone audio and renders a bar visualizer.
   - In **Spiral** mode, the app animates a logarithmic spiral of particles reacting to audio.
   - In **Galaxy** mode, the app renders an audio-reactive 3D particle field using Three.js.
3. Use the **Mode** selector to switch between Bars, Spiral, and Galaxy.
4. Use the **Theme** selector to choose from Default, Neon, Sunset, Cyberpunk, or Galaxy palettes.
5. Click **Stop** to clear the canvas (and stop audio if in Bars mode).

## Development

```bash
git clone git@github.com:3sigm/vibe-visualizer.git
cd vibe-visualizer
# No build required—just open index.html
```

## License

MIT
