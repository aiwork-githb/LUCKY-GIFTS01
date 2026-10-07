# REDCARD — TikTok promo (motion design)

`REDCARD_tiktok.mp4` — 1080×1920 (9:16), 30 fps, 25 s, H.264 + AAC. Only graphics: no people, hands or faces.

Fully procedural: `scene.js` draws every frame on a canvas as a function of time, `render.mjs` renders it in headless Chromium, `audio.py` synthesizes the soundtrack (beat, whooshes, glitches, roulette ticks synced to the spin, impact).

Rebuild:
```bash
ln -s /path/to/node_modules node_modules   # needs playwright
node render.mjs frames                      # -> frames/*.jpg + ticks.json
python3 audio.py ticks.json audio.wav
ffmpeg -framerate 30 -i frames/f%05d.jpg -i audio.wav -c:v libx264 -crf 18 -pix_fmt yuv420p \
  -c:a aac -b:a 192k -movflags +faststart -shortest REDCARD_tiktok.mp4
```
Preview a frame in a browser: open `index.html` and run `renderFrame(300)` in the console.
