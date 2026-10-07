// REDCARD — TikTok motion-design promo (1080x1920, 30fps, 25s)
// Fully procedural: every frame is a pure function of time t, so frames can be rendered in parallel.
const W = 1080, H = 1920, CX = 540, CY = 960, FPS = 30, DURATION = 25;

const out = document.getElementById('c');
const octx = out.getContext('2d');
function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
const scene = mk(W, H), sctx = scene.getContext('2d');
const acc = mk(W, H), actx = acc.getContext('2d');
const bloom1 = mk(W / 4, H / 4), b1 = bloom1.getContext('2d');
const bloom2 = mk(W / 10, H / 10), b2 = bloom2.getContext('2d');
const tmp = mk(W, 700), tctx = tmp.getContext('2d');
const tint = mk(W, 700), tictx = tint.getContext('2d');
const stripL = mk(W, 560), slctx = stripL.getContext('2d');
const stripA = mk(W, 560), sactx = stripA.getContext('2d');

// ---------- math ----------
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const P = (t, a, b) => clamp((t - a) / (b - a));
const eOutC = x => 1 - Math.pow(1 - x, 3);
const eInC = x => x * x * x;
const eIOC = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
const eOutExpo = x => x >= 1 ? 1 : 1 - Math.pow(2, -10 * x);
const eInExpo = x => x <= 0 ? 0 : Math.pow(2, 10 * x - 10);
const eOutQuart = x => 1 - Math.pow(1 - x, 4);
const eOutBack = (x, s = 1.70158) => 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2);
function hash(n) { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
function noise1(x, seed = 0) { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hash(i + seed * 57.3), hash(i + 1 + seed * 57.3), u) * 2 - 1; }
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const shakeAt = (t, t0, amp, decay, seed) => t < t0 ? 0 : amp * Math.exp(-(t - t0) * decay) * noise1(t * 38, seed);

// ---------- palette / type ----------
const RED = '#ff2440', RED2 = '#c8001e', WHITE = '#ffffff';
const FONT = '"Inter Display","Inter",sans-serif';
const font = (s, w = 900) => `${w} ${s}px ${FONT}`;

// ---------- sprites ----------
function glowSprite(r, g, b, core = 0.2) {
  const c = mk(128, 128), x = c.getContext('2d');
  const gr = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, `rgba(${r},${g},${b},1)`); gr.addColorStop(core, `rgba(${r},${g},${b},0.55)`);
  gr.addColorStop(0.55, `rgba(${r},${g},${b},0.12)`); gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
  x.fillStyle = gr; x.fillRect(0, 0, 128, 128); return c;
}
const SPR_R = glowSprite(255, 25, 50), SPR_W = glowSprite(255, 235, 235), SPR_O = glowSprite(255, 120, 60);
const SPR_SOFT = glowSprite(255, 20, 45, 0.02);

const VIG = (() => {
  const c = mk(W, H), x = c.getContext('2d');
  const g = x.createRadialGradient(CX, CY, H * 0.28, CX, CY, H * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.78)');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  x.fillStyle = 'rgba(0,0,0,0.10)';
  for (let y = 0; y < H; y += 4) x.fillRect(0, y, W, 1); // subtle scanlines
  return c;
})();
const GRAIN = [0, 1, 2, 3].map(k => {
  const c = mk(540, 960), x = c.getContext('2d'), im = x.createImageData(540, 960), r = mulberry32(99 + k);
  for (let i = 0; i < im.data.length; i += 4) { const v = r() * 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
  x.putImageData(im, 0, 0); return c;
});

// ---------- text ----------
function segsOf(str, color) { return typeof str === 'string' ? [[str, color]] : str; }
function measure(c, segs, size, w = 900, ls = 0) {
  c.font = font(size, w); c.letterSpacing = ls + 'px';
  return segs.reduce((s, [t]) => s + c.measureText(t).width, 0) - ls;
}
function fit(str, size, maxW, w = 900, ls = 0) {
  const m = measure(tctx, segsOf(str, '#fff'), size, w, ls); return m > maxW ? size * maxW / m : size;
}
function txt(c, str, x, y, size, o = {}) {
  const { color = WHITE, glow = 0, glowColor = 'rgba(255,20,45,1)', w = 900, ls = 0, align = 'center', alpha = 1 } = o;
  const segs = segsOf(str, color);
  c.save(); c.globalAlpha *= alpha; c.font = font(size, w); c.letterSpacing = ls + 'px';
  c.textBaseline = 'middle'; c.textAlign = 'left';
  const total = measure(c, segs, size, w, ls);
  let x0 = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  for (const [t, col] of segs) {
    if (glow > 0) { const wht = col === WHITE; c.save(); c.globalAlpha *= wht ? 1 : 0.55; c.shadowColor = wht ? 'rgba(255,60,80,0.9)' : glowColor; c.shadowBlur = wht ? glow : glow * 0.6; c.fillStyle = col; c.fillText(t, x0, y); c.restore(); }
    c.shadowBlur = 0;
    if (col !== WHITE && size > 22) { c.lineJoin = 'round'; c.strokeStyle = 'rgba(25,0,4,0.85)'; c.lineWidth = Math.max(2, size * 0.07); c.strokeText(t, x0, y); }
    c.fillStyle = col; c.fillText(t, x0, y);
    x0 += c.measureText(t).width;
  }
  c.restore();
}
// per-letter animated text; fn(i, n) -> {dx,dy,s,a}
function letters(c, str, x, y, size, o, fn) {
  const { w = 900, ls = 0 } = o;
  const segs = segsOf(str, o.color || WHITE);
  const chars = []; for (const [t, col] of segs) for (const ch of t) chars.push([ch, col]);
  c.save(); c.font = font(size, w); c.letterSpacing = ls + 'px';
  const total = measure(c, segs, size, w, ls);
  let x0 = x - total / 2;
  chars.forEach(([ch, col], i) => {
    c.font = font(size, w); c.letterSpacing = ls + 'px';
    const cw = c.measureText(ch).width;
    const st = fn(i, chars.length);
    if (st.a > 0.001 && ch !== ' ') {
      c.save(); c.translate(x0 + (cw - ls) / 2 + (st.dx || 0), y + (st.dy || 0)); c.scale(st.s ?? 1, st.s ?? 1); c.rotate(st.r || 0);
      txt(c, ch, 0, 0, size, { ...o, color: col, alpha: st.a, ls: 0 });
      c.restore();
    }
    x0 += cw;
  });
  c.restore();
}
// glitch text: RGB-split + horizontal slice displacement
function glitchTxt(c, str, x, y, size, o, g, seed) {
  if (g < 0.02) { txt(c, str, x, y, size, o); return; }
  tctx.clearRect(0, 0, W, 700); txt(tctx, str, W / 2, 350, size, o);
  tictx.globalCompositeOperation = 'source-over'; tictx.clearRect(0, 0, W, 700); tictx.drawImage(tmp, 0, 0);
  tictx.globalCompositeOperation = 'source-in'; tictx.fillStyle = '#ff0030'; tictx.fillRect(0, 0, W, 700);
  const fr = Math.floor(seed);
  const ox = x - W / 2, oy = y - 350;
  c.save(); c.globalAlpha *= (o.alpha ?? 1);
  c.globalCompositeOperation = 'lighter';
  const off = g * 26 * (0.5 + hash(fr * 3.3));
  c.globalAlpha *= 0.85; c.drawImage(tint, ox - off, oy + (hash(fr) - .5) * g * 10);
  c.globalAlpha /= 0.85;
  c.globalCompositeOperation = 'source-over';
  let yy = 0, k = 0;
  while (yy < 700) {
    const hgt = 10 + hash(fr * 7.1 + k * 1.7) * 70;
    const dx = hash(fr * 2.3 + k * 9.1) > 0.55 ? (hash(fr * 5.7 + k * 3.3) - 0.5) * g * 170 : 0;
    c.drawImage(tmp, 0, yy, W, hgt, ox + dx, oy + yy, W, hgt);
    yy += hgt; k++;
  }
  if (g > 0.35) { // block artefacts
    c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 6; i++) {
      if (hash(fr * 1.9 + i) < 0.5) continue;
      c.fillStyle = hash(fr + i * 4.4) > 0.5 ? 'rgba(255,20,50,0.55)' : 'rgba(255,255,255,0.35)';
      c.fillRect(x - 450 + hash(fr * 3 + i) * 800, y - size * 0.7 + hash(fr * 5 + i) * size * 1.4, 60 + hash(i + fr) * 260, 3 + hash(i * 2 + fr) * 12);
    }
  }
  c.restore();
}
const glitchPulse = (t, t0, len) => (t >= t0 && t < t0 + len) ? (1 - (t - t0) / len) * (0.6 + 0.4 * hash(Math.floor(t * 30))) : 0;

// ---------- background ----------
function drawGrid(c, t, a, hz = 1220) {
  c.save(); c.globalCompositeOperation = 'lighter';
  c.lineWidth = 2;
  for (let i = -16; i <= 16; i++) {
    const g = c.createLinearGradient(0, hz, 0, H);
    g.addColorStop(0, 'rgba(255,30,50,0)'); g.addColorStop(1, `rgba(255,30,50,${0.38 * a})`);
    c.strokeStyle = g; c.beginPath(); c.moveTo(CX + i * 18, hz); c.lineTo(CX + i * 230, H + 60); c.stroke();
  }
  const sp = (t * 1.4) % 1;
  for (let k = 0; k < 22; k++) {
    const d = (k + 1 - sp) * 0.9; const y = hz + 520 / d; if (y > H + 10) continue;
    c.strokeStyle = `rgba(255,30,50,${0.42 * a * clamp(1 - d / 20)})`;
    c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke();
  }
  // horizon glow
  c.globalAlpha = 0.5 * a; c.drawImage(SPR_R, -200, hz - 80, W + 400, 160);
  c.restore();
}
function drawParticles(c, t, a) {
  if (a <= 0) return;
  c.save(); c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 12; i++) { // bokeh
    const x = hash(i * 4.1) * W + Math.sin(t * 0.3 + i) * 60, y = hash(i * 8.3) * H + Math.cos(t * 0.25 + i * 2) * 80;
    const s = 220 + hash(i * 6.6) * 380;
    c.globalAlpha = a * 0.10; c.drawImage(SPR_SOFT, x - s / 2, y - s / 2, s, s);
  }
  for (let i = 0; i < 150; i++) { // embers
    const sp = 50 + hash(i * 3.1) * 170, life = (H + 300) / sp;
    const ph = (t + hash(i * 7.7) * life) % life;
    const y = H + 120 - ph * sp, x = hash(i * 1.3) * W + Math.sin(t * 0.9 + i) * 34;
    const s = (1.5 + hash(i * 5.1) * 5) * (hash(i * 9.9) > 0.88 ? 2.4 : 1);
    const tw = 0.5 + 0.5 * Math.sin(t * 3 + i * 1.7);
    c.globalAlpha = a * (0.2 + 0.7 * tw);
    c.drawImage(hash(i * 2.2) > 0.75 ? SPR_W : SPR_R, x - s * 4, y - s * 4, s * 8, s * 8);
  }
  c.restore();
}
function drawBG(c, t, o = {}) {
  c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; c.filter = 'none';
  c.fillStyle = '#030002'; c.fillRect(0, 0, W, H);
  const gi = o.glow ?? 0.5, gy = o.gy ?? CY;
  if (gi > 0) {
    const g = c.createRadialGradient(CX, gy, 0, CX, gy, 1150);
    g.addColorStop(0, `rgba(170,0,25,${0.55 * gi})`); g.addColorStop(0.45, `rgba(70,0,12,${0.4 * gi})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
  }
  if ((o.grid ?? 0) > 0) drawGrid(c, t, o.grid, o.hz);
  drawParticles(c, t, o.particles ?? 1);
}
function rays(c, x, y, t, a, n = 14, len = 1400, spd = 0.25, color = '255,30,50') {
  if (a <= 0) return;
  c.save(); c.translate(x, y); c.rotate(t * spd); c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const ang = i / n * Math.PI * 2, wd = 0.07 + 0.05 * hash(i * 3.7);
    const g = c.createRadialGradient(0, 0, 0, 0, 0, len);
    g.addColorStop(0, `rgba(${color},${0.35 * a})`); g.addColorStop(1, `rgba(${color},0)`);
    c.fillStyle = g; c.beginPath(); c.moveTo(0, 0);
    c.arc(0, 0, len, ang - wd, ang + wd); c.closePath(); c.fill();
  }
  c.restore();
}
function shock(c, x, y, t, t0, dur = 0.6, maxR = 900, wd = 26) {
  const p = P(t, t0, t0 + dur); if (p <= 0 || p >= 1) return;
  const r = maxR * eOutExpo(p);
  c.save(); c.globalCompositeOperation = 'lighter';
  c.strokeStyle = `rgba(255,40,60,${(1 - p) * 0.9})`; c.lineWidth = wd * (1 - p) + 2;
  c.shadowColor = 'rgba(255,0,40,1)'; c.shadowBlur = 40;
  c.beginPath(); c.ellipse(x, y, r, r, 0, 0, Math.PI * 2); c.stroke();
  c.strokeStyle = `rgba(255,255,255,${(1 - p) * 0.6})`; c.lineWidth = 3;
  c.beginPath(); c.ellipse(x, y, r * 0.96, r * 0.96, 0, 0, Math.PI * 2); c.stroke();
  c.restore();
}
function burst(c, x, y, t, t0, n = 160, spd = 2200, seed = 1) {
  const dt = t - t0; if (dt < 0 || dt > 2.2) return;
  c.save(); c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const ang = hash(i * 1.37 + seed) * Math.PI * 2, v = spd * (0.25 + 0.75 * Math.pow(hash(i * 2.91 + seed), 1.5));
    const k = 2.4; const dist = v * (1 - Math.exp(-k * dt)) / k;
    const px = x + Math.cos(ang) * dist, py = y + Math.sin(ang) * dist + 260 * dt * dt;
    const life = 0.8 + hash(i * 4.4 + seed) * 1.3; const a = clamp(1 - dt / life); if (a <= 0) continue;
    const s = (2 + hash(i * 6.1 + seed) * 6) * (1 + (1 - a));
    const vx = Math.cos(ang) * v * Math.exp(-k * dt), vy = Math.sin(ang) * v * Math.exp(-k * dt) + 520 * dt;
    // streak
    c.globalAlpha = a; c.strokeStyle = hash(i + seed) > 0.7 ? 'rgba(255,240,240,0.9)' : 'rgba(255,40,60,0.9)';
    c.lineWidth = s * 0.7; c.beginPath(); c.moveTo(px, py); c.lineTo(px - vx * 0.03, py - vy * 0.03); c.stroke();
    c.drawImage(hash(i + seed) > 0.7 ? SPR_W : SPR_R, px - s * 4, py - s * 4, s * 8, s * 8);
  }
  c.restore();
}
function flash(c, a, color = '255,30,50') {
  if (a <= 0) return;
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'lighter';
  c.fillStyle = `rgba(${color},${clamp(a)})`; c.fillRect(0, 0, W, H); c.restore();
}
function cam(c, { z = 1, x = CX, y = CY, r = 0, sx = 0, sy = 0 } = {}) {
  c.translate(CX + sx, CY + sy); c.rotate(r); c.scale(z, z); c.translate(-x, -y);
}
function rr(c, x, y, w, h, r) { c.beginPath(); c.roundRect(x, y, w, h, r); }

// ---------- brand ----------
function drawEmblem(c, x, y, h, o = {}) {
  const { rot = -0.18, flip = 0, alpha = 1, glow = 50, shine = -1 } = o;
  const w = h * 0.7, sx = Math.cos(flip), front = sx >= 0;
  c.save(); c.translate(x, y); c.rotate(rot); c.scale(Math.max(Math.abs(sx), 0.02), 1); c.globalAlpha *= alpha;
  c.shadowColor = 'rgba(255,15,45,0.95)'; c.shadowBlur = glow;
  rr(c, -w / 2, -h / 2, w, h, h * 0.09);
  const g = c.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
  if (front) { g.addColorStop(0, '#ff4659'); g.addColorStop(0.5, '#e00022'); g.addColorStop(1, '#6a000d'); }
  else { g.addColorStop(0, '#2a0008'); g.addColorStop(1, '#0d0003'); }
  c.fillStyle = g; c.fill(); c.shadowBlur = 0;
  c.save(); rr(c, -w / 2, -h / 2, w, h, h * 0.09); c.clip();
  if (front) {
    c.strokeStyle = 'rgba(255,255,255,0.95)'; c.lineWidth = h * 0.022;
    rr(c, -w / 2 + h * 0.055, -h / 2 + h * 0.055, w - h * 0.11, h - h * 0.11, h * 0.05); c.stroke();
    txt(c, 'R', 0, h * 0.04, h * 0.6, { color: WHITE });
    // corner pips
    c.fillStyle = '#fff'; c.beginPath(); const pip = (px, py, s) => { c.moveTo(px, py - s); c.lineTo(px + s * 0.7, py); c.lineTo(px, py + s); c.lineTo(px - s * 0.7, py); c.closePath(); };
    pip(-w / 2 + h * 0.14, -h / 2 + h * 0.15, h * 0.045); pip(w / 2 - h * 0.14, h / 2 - h * 0.15, h * 0.045); c.fill();
    if (shine > -1) {
      const sxp = lerp(-w * 1.5, w * 1.5, shine);
      const sg = c.createLinearGradient(sxp - w * 0.4, 0, sxp + w * 0.4, 0);
      sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, 'rgba(255,255,255,0.55)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = sg; c.fillRect(-w, -h, w * 2, h * 2);
    }
  } else {
    c.strokeStyle = 'rgba(255,30,50,0.5)'; c.lineWidth = h * 0.02;
    for (let i = -10; i < 10; i++) { c.beginPath(); c.moveTo(i * h * 0.08, -h); c.lineTo(i * h * 0.08 + h, h); c.stroke(); }
  }
  c.restore(); c.restore();
}
// REDCARD wordmark, centered at x,y. reveal(i,n) -> {dx,dy,s,a}
function drawWordmark(c, x, y, size, o = {}) {
  const { alpha = 1, sweep = -1, fn = null, glow = 34 } = o;
  const segs = [['RED', RED], ['CARD', WHITE]];
  c.save(); c.globalAlpha *= alpha;
  if (fn) letters(c, segs, x, y, size, { glow, ls: size * 0.02 }, fn);
  else txt(c, segs, x, y, size, { glow, ls: size * 0.02 });
  if (sweep > 0 && sweep < 1) {
    tctx.clearRect(0, 0, W, 700); txt(tctx, segs, W / 2, 350, size, { ls: size * 0.02 });
    tctx.globalCompositeOperation = 'source-atop';
    const sx = lerp(-300, W + 300, sweep);
    const g = tctx.createLinearGradient(sx - 140, 0, sx + 140, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.95)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    tctx.fillStyle = g; tctx.fillRect(0, 0, W, 700); tctx.globalCompositeOperation = 'source-over';
    c.globalCompositeOperation = 'lighter'; c.drawImage(tmp, x - W / 2, y - 350);
  }
  c.restore();
}

// ---------- CS2 items ----------
const GUNS = {
  ak: [[0, 15], [6, 12], [22, 11], [26, 9.5], [58, 9.5], [60, 7.5], [64, 7.5], [64, 9.5], [90, 10], [90, 8.5], [92.5, 8.5], [92.5, 10.2], [100, 10.4], [100, 12.6], [72, 13], [70, 15], [61, 15.5], [57, 16], [60, 23], [61, 31], [54, 32.5], [51, 24], [48, 17.5], [43, 17.5], [41, 25], [35.5, 25.5], [35.5, 18], [26, 18.5], [19, 23], [3, 27.5], [0, 26]],
  m4: [[0, 13], [4, 11], [21, 11], [24, 9.5], [36, 9.5], [37, 7], [53, 7], [54, 9.5], [66, 9.5], [66, 10.5], [100, 10.6], [100, 12.8], [70, 13.2], [66, 16], [56, 16], [55, 29], [48, 29.5], [47.5, 17], [42, 17], [40, 25], [34.5, 25.5], [34.5, 17.5], [24, 17.5], [20, 20], [3, 24], [0, 23]],
  awp: [[0, 16], [3, 12], [19, 12], [23, 13.5], [30, 13], [33, 10], [37, 10], [38, 6.5], [62, 6.5], [63, 10], [67, 10], [67, 12], [100, 12.2], [100, 14.6], [66, 15], [61, 17.5], [52, 17.5], [50, 25.5], [45.5, 25.5], [45.5, 17.5], [38, 17.5], [33, 19.5], [27, 20], [20, 26.5], [14, 29], [2, 29]],
  deagle: [[16, 9], [86, 9], [87, 11], [86, 17], [48, 17], [45, 19.5], [44, 22], [49, 35], [36, 37], [31, 24], [27, 20.5], [16, 19]],
  usp: [[10, 10], [64, 10], [64, 11], [98, 11], [98, 16], [64, 16], [44, 16.5], [42, 19], [46, 33], [34, 35], [29, 22], [25, 18.5], [10, 18]],
  glock: [[18, 10], [82, 10], [83, 17], [48, 17], [46, 19.5], [50, 34], [38, 36], [33, 23], [29, 19.5], [18, 18.5]],
  knife: [[2, 22], [30, 18.5], [36, 17], [40, 19], [46, 18], [62, 15.5], [80, 10], [98, 4], [92, 13], [78, 21], [62, 25.5], [46, 26], [40, 24.5], [32, 27], [2, 27]],
};
const GUN_SCALE = { deagle: 0.78, usp: 0.82, glock: 0.74, knife: 0.92 };
function drawGun(c, type, x, y, w, ca, cb, seed = 0) {
  const pts = GUNS[type], s = w * (GUN_SCALE[type] || 1) / 100;
  c.save(); c.translate(x - 50 * s, y - 19 * s); c.scale(s, s);
  const path = new Path2D(); pts.forEach(([px, py], i) => i ? path.lineTo(px, py) : path.moveTo(px, py)); path.closePath();
  c.shadowColor = 'rgba(0,0,0,0.8)'; c.shadowBlur = 6 * s; c.shadowOffsetY = 2;
  const g = c.createLinearGradient(0, 0, 100, 36); g.addColorStop(0, ca); g.addColorStop(1, cb);
  c.fillStyle = g; c.fill(path); c.shadowBlur = 0; c.shadowOffsetY = 0;
  c.save(); c.clip(path);
  c.globalAlpha = 0.35; c.strokeStyle = cb; c.lineWidth = 3;
  for (let i = -6; i < 16; i++) { c.beginPath(); c.moveTo(i * 9 + seed * 3, 0); c.lineTo(i * 9 + 24 + seed * 3, 40); c.stroke(); }
  c.globalAlpha = 0.5; const hg = c.createLinearGradient(0, 4, 0, 30); hg.addColorStop(0, 'rgba(255,255,255,0.7)'); hg.addColorStop(0.35, 'rgba(255,255,255,0)'); hg.addColorStop(1, 'rgba(0,0,0,0.5)');
  c.fillStyle = hg; c.fillRect(0, 0, 100, 40);
  c.restore();
  c.globalAlpha = 1; c.strokeStyle = 'rgba(0,0,0,0.7)'; c.lineWidth = 0.7; c.stroke(path);
  c.restore();
}
const RAR = { blue: '#4b69ff', purple: '#8847ff', pink: '#d32ce6', red: '#eb4b4b', gold: '#ffc934' };
const POOL = {
  blue: [{ g: 'ak', n: 'AK-47', s: 'Elite Build', a: '#a9b2c4', b: '#2d3340' }, { g: 'glock', n: 'Glock-18', s: 'Off World', a: '#5f7cff', b: '#1d2350' }, { g: 'm4', n: 'M4A1-S', s: 'Briefing', a: '#9db0a0', b: '#2e3a30' }, { g: 'usp', n: 'USP-S', s: 'Cortex', a: '#6d8cff', b: '#202a55' }],
  purple: [{ g: 'deagle', n: 'Desert Eagle', s: 'Blaze', a: '#ffb02e', b: '#c02a08' }, { g: 'glock', n: 'Glock-18', s: 'Fade', a: '#ff6ad5', b: '#ffd23f' }, { g: 'awp', n: 'AWP', s: 'Phobos', a: '#9fb4ff', b: '#25305f' }],
  pink: [{ g: 'ak', n: 'AK-47', s: 'Redline', a: '#2a2a2a', b: '#e0001b' }, { g: 'awp', n: 'AWP', s: 'Electric Hive', a: '#35c6ff', b: '#20304a' }, { g: 'm4', n: 'M4A4', s: 'Desolate Space', a: '#7a4dff', b: '#ffb347' }],
  red: [{ g: 'awp', n: 'AWP', s: 'Asiimov', a: '#f4f4f4', b: '#ff6a00' }, { g: 'ak', n: 'AK-47', s: 'Vulcan', a: '#ececec', b: '#1d6cff' }, { g: 'usp', n: 'USP-S', s: 'Kill Confirmed', a: '#e6d7b0', b: '#c22' }, { g: 'deagle', n: 'Desert Eagle', s: 'Code Red', a: '#ff2030', b: '#1a1a1a' }, { g: 'm4', n: 'M4A1-S', s: 'Hyper Beast', a: '#22d3c5', b: '#ff2a8a' }],
  gold: [{ g: 'knife', n: '★ Karambit', s: 'Fade', a: '#ff5ac8', b: '#ffd23f' }, { g: 'knife', n: '★ Butterfly Knife', s: 'Doppler', a: '#8a2be2', b: '#ff3366' }],
};
const WINNER = { g: 'awp', n: 'AWP', s: 'Dragon Lore', a: '#f6d77c', b: '#2f6b33', r: 'red' };
const ITEMS = (() => {
  const r = mulberry32(2024), arr = [];
  for (let i = 0; i < 80; i++) {
    const x = r(); const rar = x < 0.42 ? 'blue' : x < 0.70 ? 'purple' : x < 0.86 ? 'pink' : x < 0.97 ? 'red' : 'gold';
    const pool = POOL[rar]; arr.push({ ...pool[Math.floor(r() * pool.length)], r: rar });
  }
  return arr;
})();
const WIN = 64;
ITEMS[WIN] = WINNER;
ITEMS[WIN - 2] = { ...POOL.purple[0], r: 'purple' };
ITEMS[WIN - 1] = { ...POOL.blue[0], r: 'blue' };
ITEMS[WIN + 1] = { ...POOL.gold[0], r: 'gold' };
ITEMS[WIN + 2] = { ...POOL.pink[0], r: 'pink' };

function drawItem(c, x, y, w, h, it, o = {}) {
  const { alpha = 1, hl = 0, names = true } = o;
  const col = RAR[it.r];
  c.save(); c.globalAlpha *= alpha; c.translate(x, y);
  if (hl > 0) { c.shadowColor = col; c.shadowBlur = 60 * hl; }
  rr(c, -w / 2, -h / 2, w, h, w * 0.06);
  const g = c.createLinearGradient(0, -h / 2, 0, h / 2); g.addColorStop(0, '#16080b'); g.addColorStop(1, '#0a0405');
  c.fillStyle = g; c.fill(); c.shadowBlur = 0;
  c.save(); rr(c, -w / 2, -h / 2, w, h, w * 0.06); c.clip();
  const rg = c.createRadialGradient(0, h * 0.05, 0, 0, h * 0.05, w * 0.75);
  rg.addColorStop(0, col + '88'); rg.addColorStop(1, col + '00');
  c.fillStyle = rg; c.fillRect(-w / 2, -h / 2, w, h);
  c.fillStyle = col; c.fillRect(-w / 2, h / 2 - h * 0.028, w, h * 0.028);
  const lg = c.createLinearGradient(0, h / 2 - h * 0.3, 0, h / 2); lg.addColorStop(0, col + '00'); lg.addColorStop(1, col + '55');
  c.fillStyle = lg; c.fillRect(-w / 2, h / 2 - h * 0.3, w, h * 0.3);
  c.restore();
  c.strokeStyle = col + '99'; c.lineWidth = Math.max(1.5, w * 0.006); rr(c, -w / 2, -h / 2, w, h, w * 0.06); c.stroke();
  drawGun(c, it.g, 0, -h * 0.08, w * 0.88, it.a, it.b, it.s.length);
  if (names) {
    txt(c, it.n, 0, h * 0.27, w * 0.085, { color: '#ffffff', w: 700, alpha: 0.95 });
    txt(c, it.s, 0, h * 0.36, w * 0.075, { color: col, w: 800 });
  }
  c.restore();
}

// ---------- cases ----------
const CASES = [
  { name: 'НОВИЧОК', price: '49 ₽', a: '#3a3d44', b: '#121318', acc: '#ffffff' },
  { name: 'ОГНЕННЫЙ', price: '149 ₽', a: '#ff4a1c', b: '#5a0a00', acc: '#ffcc33' },
  { name: 'НОЧНОЙ', price: '99 ₽', a: '#1d1d26', b: '#050507', acc: '#ff1a33' },
  { name: 'ЛЕГЕНДА', price: '499 ₽', a: '#e0001e', b: '#3a0008', acc: '#ffc934' },
  { name: 'ЭЛИТНЫЙ', price: '299 ₽', a: '#f2f2f2', b: '#8a8a92', acc: '#ff1a33' },
  { name: 'КРАСНЫЙ', price: '199 ₽', a: '#b80018', b: '#300006', acc: '#ffffff' },
];
function drawCase(c, x, y, w, cs, o = {}) {
  const { open = 0, alpha = 1, glow = 1, light = 0 } = o;
  const h = w * 0.55, dep = w * 0.2;
  c.save(); c.translate(x, y); c.globalAlpha *= alpha;
  c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha *= 0.45 * glow;
  c.drawImage(SPR_R, -w * 0.9, -h * 0.9, w * 1.8, h * 1.9); c.restore();
  // shadow
  c.fillStyle = 'rgba(0,0,0,0.6)'; c.beginPath(); c.ellipse(0, h * 0.62, w * 0.55, h * 0.08, 0, 0, Math.PI * 2); c.fill();
  const top = -h * 0.08; // seam between lid & body
  // body front
  const bg = c.createLinearGradient(0, top, 0, h * 0.55); bg.addColorStop(0, cs.a); bg.addColorStop(1, cs.b);
  rr(c, -w / 2, top, w, h * 0.55 - top, [0, 0, w * 0.04, w * 0.04]); c.fillStyle = bg; c.fill();
  c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(-w / 2, top, w, h * 0.06);
  c.fillStyle = cs.acc; c.globalAlpha *= 0.9; c.fillRect(-w / 2, h * 0.30, w, h * 0.045); c.globalAlpha /= 0.9;
  c.fillStyle = 'rgba(210,210,220,0.9)';
  [[-w / 2, top], [w / 2 - w * 0.07, top], [-w / 2, h * 0.55 - w * 0.07], [w / 2 - w * 0.07, h * 0.55 - w * 0.07]].forEach(([px, py]) => c.fillRect(px, py, w * 0.07, w * 0.07));
  // latch
  c.fillStyle = '#d9d9e0'; rr(c, -w * 0.06, top - h * 0.02, w * 0.12, h * 0.12, w * 0.015); c.fill();
  drawEmblem(c, 0, h * 0.20, h * 0.34, { rot: 0, glow: 18 });
  // inner light
  if (open > 0 || light > 0) {
    const L = Math.max(open, light);
    c.save(); c.globalCompositeOperation = 'lighter';
    const lg = c.createLinearGradient(0, top, 0, top - h * 2.4);
    lg.addColorStop(0, `rgba(255,220,220,${0.9 * L})`); lg.addColorStop(0.25, `rgba(255,40,60,${0.55 * L})`); lg.addColorStop(1, 'rgba(255,0,30,0)');
    c.fillStyle = lg; c.beginPath(); c.moveTo(-w * 0.46, top); c.lineTo(w * 0.46, top); c.lineTo(w * 0.95, top - h * 2.4); c.lineTo(-w * 0.95, top - h * 2.4); c.closePath(); c.fill();
    c.globalAlpha = L; c.drawImage(SPR_W, -w * 0.6, top - h * 0.25, w * 1.2, h * 0.5);
    c.restore();
  }
  // lid
  c.save();
  c.translate(0, top - dep); c.rotate(-open * 0.55); c.translate(open * w * 0.05, -open * h * 0.55);
  const lh = h * 0.28; // lid front height
  const lgd = c.createLinearGradient(0, -lh, 0, dep); lgd.addColorStop(0, cs.a); lgd.addColorStop(1, cs.b);
  // top face (trapezoid)
  c.beginPath(); c.moveTo(-w / 2, dep - lh); c.lineTo(w / 2, dep - lh); c.lineTo(w / 2 - dep * 0.7, -lh); c.lineTo(-w / 2 + dep * 0.7, -lh); c.closePath();
  const tg = c.createLinearGradient(0, -lh, 0, dep - lh); tg.addColorStop(0, 'rgba(255,255,255,0.35)'); tg.addColorStop(1, 'rgba(255,255,255,0.08)');
  c.fillStyle = cs.a; c.fill(); c.fillStyle = tg; c.fill();
  // lid front
  rr(c, -w / 2, dep - lh, w, lh, [w * 0.03, w * 0.03, 0, 0]); c.fillStyle = lgd; c.fill();
  c.fillStyle = cs.acc; c.fillRect(-w / 2, dep - lh * 0.45, w, lh * 0.12);
  // handle
  c.strokeStyle = '#d9d9e0'; c.lineWidth = w * 0.022; c.beginPath();
  c.moveTo(-w * 0.15, -lh + dep * 0.45); c.lineTo(-w * 0.12, -lh - dep * 0.1); c.lineTo(w * 0.12, -lh - dep * 0.1); c.lineTo(w * 0.15, -lh + dep * 0.45); c.stroke();
  c.restore();
  c.restore();
}
function drawCaseCard(c, x, y, w, h, cs, t, o = {}) {
  const { hl = 0, press = 0 } = o;
  c.save();
  c.translate(x + w / 2, y + h / 2); const s = 1 - press * 0.05; c.scale(s, s); c.translate(-w / 2, -h / 2);
  c.shadowColor = `rgba(255,20,45,${0.25 + hl * 0.75})`; c.shadowBlur = 20 + hl * 60;
  rr(c, 0, 0, w, h, 26);
  const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#1a070b'); g.addColorStop(1, '#0b0305');
  c.fillStyle = g; c.fill(); c.shadowBlur = 0;
  c.save(); rr(c, 0, 0, w, h, 26); c.clip();
  const rg = c.createRadialGradient(w / 2, h * 0.38, 0, w / 2, h * 0.38, w * 0.7);
  rg.addColorStop(0, `rgba(255,20,45,${0.28 + hl * 0.3})`); rg.addColorStop(1, 'rgba(255,20,45,0)');
  c.fillStyle = rg; c.fillRect(0, 0, w, h);
  c.restore();
  c.strokeStyle = `rgba(255,40,60,${0.3 + hl * 0.7})`; c.lineWidth = 2 + hl * 2; rr(c, 0, 0, w, h, 26); c.stroke();
  const fl = Math.sin(t * 2.2 + x * 0.01 + y * 0.003) * 8;
  drawCase(c, w / 2, h * 0.40 + fl, w * 0.6, cs, { glow: 0.6 + hl * 0.6, light: hl * 0.0 });
  txt(c, cs.name, w / 2, h * 0.73, w * 0.085, { color: WHITE, w: 900, ls: 2 });
  // price button
  const bw = w * 0.56, bh = h * 0.12, bx = (w - bw) / 2, by = h * 0.82;
  c.shadowColor = 'rgba(255,20,45,0.9)'; c.shadowBlur = 16 + hl * 30;
  const pg = c.createLinearGradient(bx, 0, bx + bw, 0); pg.addColorStop(0, '#ff2a40'); pg.addColorStop(1, '#c4001b');
  rr(c, bx, by, bw, bh, bh / 2); c.fillStyle = pg; c.fill(); c.shadowBlur = 0;
  txt(c, cs.price, w / 2, by + bh / 2 + 1, bh * 0.5, { color: WHITE, w: 800 });
  c.restore();
}

// =================== SCENES ===================
// S1 0–3: "ПРИВЕТ, Я ДАНИЛ"
function S1(c, t) {
  drawBG(c, t, { glow: 0.15 + 0.3 * P(t, 0.3, 1.2), particles: P(t, 0.4, 1.6) });
  const z = 1 + 0.07 * eIOC(P(t, 0, 2.7)) + 2.6 * eInExpo(P(t, 2.72, 3.0));
  c.save(); cam(c, { z, y: 950, r: 0.01 * Math.sin(t * 1.3) });
  if (t < 0.9) { // opening light streak
    const p = P(t, 0.0, 0.45), a = 1 - P(t, 0.45, 0.9), lw = W * 1.4 * eOutExpo(p);
    c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = a;
    c.drawImage(SPR_R, CX - lw / 2, 950 - 90, lw, 180); c.drawImage(SPR_W, CX - lw / 2, 950 - 10, lw, 20); c.restore();
  }
  const s1 = fit('ПРИВЕТ,', 160, 820), s2 = fit('Я ДАНИЛ', 200, 860);
  const g = Math.max(glitchPulse(t, 1.55, 0.22), glitchPulse(t, 2.25, 0.18), 0.9 * P(t, 2.6, 2.95));
  const line1 = 'ПРИВЕТ,', line2 = [['Я ', WHITE], ['ДАНИЛ', RED]];
  const fr = t * 30;
  const anim = (t0, stag) => (i) => {
    const p = P(t, t0 + i * stag, t0 + i * stag + 0.32), e = eOutExpo(p);
    const jit = p < 1 ? (hash(i * 13 + Math.floor(fr)) - 0.5) * 70 * (1 - e) : 0;
    return { a: clamp(p * 2.2), s: lerp(2.4, 1, e), dx: jit, dy: (1 - e) * -40 };
  };
  if (t < 1.25) {
    letters(c, line1, CX, 860, s1, { glow: 30 }, anim(0.3, 0.055));
    letters(c, line2, CX, 1060, s2, { glow: 40 }, anim(0.7, 0.06));
  } else {
    glitchTxt(c, line1, CX, 860, s1, { glow: 30 }, g, fr);
    glitchTxt(c, line2, CX, 1060, s2, { glow: 40 }, g * 1.1, fr + 7);
  }
  // underline accent
  const ul = eOutExpo(P(t, 1.05, 1.5));
  if (ul > 0) { c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = RED; c.shadowColor = RED; c.shadowBlur = 25;
    c.fillRect(CX - 300 * ul, 1180, 600 * ul, 8); c.restore(); }
  c.restore();
  flash(c, 0.6 * P(t, 2.85, 3.0), '255,60,80');
}

// S2 3–5.5: "И Я СДЕЛАЛ СВОЙ САЙТ" -> REDCARD logo
function S2(c, t) {
  drawBG(c, t, { glow: 0.45 + 0.35 * P(t, 4.3, 4.8), grid: P(t, 3.0, 3.6) * 0.8, particles: 1 });
  const dive = eInC(P(t, 5.05, 5.5));
  const sh = shakeAt(t, 3.2, 16, 9, 1) + shakeAt(t, 3.56, 20, 9, 2) + shakeAt(t, 4.72, 26, 7, 3);
  const shy = shakeAt(t, 3.2, 12, 9, 4) + shakeAt(t, 3.56, 14, 9, 5) + shakeAt(t, 4.72, 20, 7, 6);
  c.save(); cam(c, { z: 1 + 0.03 * (t - 3) + 0.6 * dive, y: lerp(960, 880, dive), sx: sh, sy: shy });
  // text
  if (t < 4.5) {
    const slam = (t0) => { const p = P(t, t0, t0 + 0.2); return p < 1 ? lerp(2.8, 1, eInC(p)) : 1 + 0.05 * Math.exp(-(t - t0 - 0.2) * 10) * Math.cos((t - t0 - 0.2) * 38); };
    const ex = eInC(P(t, 4.15, 4.45));
    const g = Math.max(glitchPulse(t, 3.2, 0.15), glitchPulse(t, 3.56, 0.15), ex);
    const s1 = fit('И Я СДЕЛАЛ', 150, 880), s2 = fit('СВОЙ САЙТ', 170, 880);
    for (const [str, y, t0, sz, gl] of [['И Я СДЕЛАЛ', 850, 3.0, s1, 30], [[['СВОЙ ', WHITE], ['САЙТ', RED]], 1060, 3.36, s2, 44]]) {
      if (t < t0) continue;
      const sc = slam(t0) * (1 + ex * 0.5);
      c.save(); c.translate(CX, y); c.scale(sc, sc); c.translate(-CX, -y);
      glitchTxt(c, str, CX, y, sz, { glow: gl, alpha: clamp(P(t, t0, t0 + 0.08)) * (1 - ex) }, g, t * 30 + y);
      c.restore();
    }
    for (const t0 of [3.2, 3.56]) shock(c, CX, 960, t, t0, 0.5, 700, 14);
  }
  // logo
  if (t >= 4.3) {
    const fp = P(t, 4.3, 4.75);
    rays(c, CX, 830, t, P(t, 4.6, 5.0), 16, 1500, 0.3);
    shock(c, CX, 760, t, 4.72, 0.7, 1000, 30);
    if (t > 4.7 && t < 5.3) { // anamorphic flare
      const a = (1 - P(t, 4.72, 5.3)); c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = a;
      c.drawImage(SPR_R, -300, 760 - 70, W + 600, 140); c.drawImage(SPR_W, CX - 500, 760 - 6, 1000, 12); c.restore();
    }
    drawEmblem(c, CX, 760, 300, { flip: (1 - eOutBack(fp, 1.2)) * Math.PI * 1.5, alpha: clamp(fp * 3), shine: P(t, 4.85, 5.3) * 1.0 || -1, rot: -0.18 + (1 - eOutExpo(fp)) * 0.5 });
    const ws = fit([['RED', RED], ['CARD', WHITE]], 180, 880, 900, 4);
    drawWordmark(c, CX, 1010, ws, {
      sweep: P(t, 4.95, 5.4),
      fn: (i) => { const p = P(t, 4.5 + i * 0.045, 4.5 + i * 0.045 + 0.3); return { a: clamp(p * 2), dy: (1 - eOutBack(p)) * 90, s: lerp(1.6, 1, eOutExpo(p)) }; },
    });
  }
  c.restore();
  flash(c, 0.7 * (1 - P(t, 3.0, 3.25)), '255,70,90');
  flash(c, 0.35 * (1 - P(t, 4.72, 5.0)) * (t >= 4.72 ? 1 : 0), '255,40,60');
}

// S3 5.5–11: logo morphs into the site UI, case cards, caption
const CARD = { w: 455, h: 440, xs: [60, 565], ys: [620, 1090, 1560] };
function S3(c, t) {
  drawBG(c, t, { glow: 0.35, grid: 0.25 * (1 - P(t, 5.5, 6.2)) + 0.0, particles: 0.6 });
  const m = eIOC(P(t, 5.5, 6.15));
  const cz = eOutExpo(P(t, 5.5, 6.1));
  const zoomOut = eInExpo(P(t, 10.4, 11.0));
  const scroll = 300 * eIOC(P(t, 7.4, 9.4));
  const hc = 3, hx = CARD.xs[1] + CARD.w / 2, hy = CARD.ys[1] - scroll + CARD.h * 0.40;
  const z = lerp(1.6, 1, cz) * (1 + 0.025 * Math.sin((t - 5.5) * 0.9)) * (1 + 2.2 * zoomOut);
  c.save(); cam(c, { z, x: lerp(CX, lerp(CX, hx, eOutC(P(t, 10.3, 10.8))), 1), y: lerp(880, lerp(CY, hy, eOutC(P(t, 10.3, 10.8))), cz), r: 0.008 * Math.sin(t * 0.8) });
  const ui = P(t, 5.75, 6.3);
  // UI frame build
  if (ui > 0) {
    c.save(); c.globalAlpha = ui;
    const fg = c.createLinearGradient(0, 0, 0, H); fg.addColorStop(0, 'rgba(18,4,7,0.92)'); fg.addColorStop(1, 'rgba(8,2,4,0.92)');
    rr(c, 24, 30, W - 48, H - 60, 40); c.fillStyle = fg; c.fill();
    c.restore();
    const per = 2 * (W - 48 + H - 60);
    c.save(); c.strokeStyle = 'rgba(255,30,50,0.9)'; c.lineWidth = 3; c.shadowColor = RED; c.shadowBlur = 20;
    c.setLineDash([per * eOutC(ui), per]); rr(c, 24, 30, W - 48, H - 60, 40); c.stroke(); c.restore();
  }
  // scrolled content (clipped below header)
  c.save(); c.beginPath(); c.rect(24, 232, W - 48, H - 262); c.clip();
  c.translate(0, -scroll);
  // nav tabs
  const tabs = ['КЕЙСЫ', 'АПГРЕЙД', 'КОНТРАКТЫ', 'БОНУСЫ'];
  let tx = 70;
  tabs.forEach((tb, i) => {
    const p = eOutC(P(t, 6.0 + i * 0.06, 6.35 + i * 0.06));
    c.font = font(32, 800); c.letterSpacing = '1px'; const tw = c.measureText(tb).width;
    txt(c, tb, tx, 290 + (1 - p) * 30, 32, { align: 'left', w: 800, color: i === 0 ? WHITE : 'rgba(255,255,255,0.45)', alpha: p, ls: 1 });
    if (i === 0) { c.save(); c.fillStyle = RED; c.shadowColor = RED; c.shadowBlur = 14; c.fillRect(tx, 318, tw * p, 5); c.restore(); }
    tx += tw + 52;
  });
  // live feed
  const lf = P(t, 6.1, 6.5);
  if (lf > 0) {
    c.save(); c.globalAlpha = lf;
    const dot = 0.5 + 0.5 * Math.sin(t * 8);
    c.fillStyle = `rgba(255,30,50,${0.5 + dot * 0.5})`; c.beginPath(); c.arc(80, 376, 8, 0, Math.PI * 2); c.fill();
    txt(c, 'ЖИВАЯ ЛЕНТА', 100, 377, 24, { align: 'left', w: 800, color: 'rgba(255,255,255,0.75)', ls: 2 });
    c.beginPath(); c.rect(50, 400, W - 100, 120); c.clip();
    const pitch = 142, shift = (t * 70) % pitch;
    for (let k = -1; k < 8; k++) {
      const it = ITEMS[(k + 20 + Math.floor(t * 70 / pitch)) % ITEMS.length];
      drawItem(c, 50 + 64 + k * pitch - shift + pitch, 460, 128, 110, it, { names: false });
    }
    c.restore();
  }
  // section title
  const st = eOutC(P(t, 6.25, 6.6));
  if (st > 0) {
    c.save(); c.globalAlpha = st; c.fillStyle = RED; c.shadowColor = RED; c.shadowBlur = 16; c.fillRect(64, 548, 8, 46); c.restore();
    txt(c, 'ПОПУЛЯРНЫЕ КЕЙСЫ', 90 - (1 - st) * 40, 572, 46, { align: 'left', alpha: st, ls: 1 });
  }
  // cards
  CASES.forEach((cs, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const t0 = 6.35 + i * 0.17, p = P(t, t0, t0 + 0.55);
    if (p <= 0) return;
    const e = eOutBack(p, 1.3);
    const x = CARD.xs[col], y = CARD.ys[row];
    const hl = i === hc ? eOutC(P(t, 9.5, 9.9)) * (0.85 + 0.15 * Math.sin(t * 10)) : 0;
    const press = i === hc ? Math.sin(Math.PI * P(t, 10.05, 10.3)) : 0;
    const dim = i !== hc ? 1 - 0.55 * P(t, 9.5, 9.9) : 1;
    c.save(); c.globalAlpha = clamp(p * 2.5) * dim;
    c.translate(x + CARD.w / 2, y + CARD.h / 2 + (1 - e) * 260);
    c.rotate((1 - e) * (col ? 0.25 : -0.25)); c.scale(lerp(0.5, 1, e), lerp(0.5, 1, e) * (0.85 + 0.15 * clamp(p * 1.5)));
    c.translate(-CARD.w / 2, -CARD.h / 2);
    drawCaseCard(c, 0, 0, CARD.w, CARD.h, cs, t, { hl, press });
    // entrance sheen
    if (p < 1) { c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = (1 - p) * 0.8; rr(c, 0, 0, CARD.w, CARD.h, 26); c.fillStyle = 'rgba(255,40,60,0.5)'; c.fill(); c.restore(); }
    c.restore();
  });
  c.restore(); // end scroll content
  // header (fixed) — the logo morphs into it
  if (ui > 0) {
    c.save(); c.globalAlpha = ui;
    const hg = c.createLinearGradient(0, 30, 0, 232); hg.addColorStop(0, 'rgba(40,4,10,0.95)'); hg.addColorStop(1, 'rgba(20,3,6,0.95)');
    c.beginPath(); c.roundRect(24, 30, W - 48, 202, [40, 40, 0, 0]); c.fillStyle = hg; c.fill();
    c.fillStyle = 'rgba(255,30,50,0.35)'; c.fillRect(24, 231, W - 48, 2);
    // balance chip
    const bp = eOutBack(P(t, 6.05, 6.45));
    c.save(); c.translate(860, 140); c.scale(bp, bp);
    rr(c, -150, -38, 300, 76, 38); c.fillStyle = 'rgba(255,255,255,0.06)'; c.fill(); c.strokeStyle = 'rgba(255,40,60,0.6)'; c.lineWidth = 2; c.stroke();
    c.fillStyle = RED; c.shadowColor = RED; c.shadowBlur = 14; c.beginPath(); c.arc(-108, 0, 20, 0, Math.PI * 2); c.fill(); c.shadowBlur = 0;
    txt(c, 'R', -108, 1, 24, { color: WHITE });
    txt(c, '12 450 ₽', 18, 2, 34, { w: 800 });
    c.restore();
    c.restore();
  }
  // morphing logo
  const ex = lerp(CX, 92, m), ey = lerp(760, 140, m), eh = lerp(300, 92, m);
  drawEmblem(c, ex, ey, eh, { glow: lerp(50, 20, m) });
  const ws0 = fit([['RED', RED], ['CARD', WHITE]], 180, 880, 900, 4);
  drawWordmark(c, lerp(CX, 284, m), lerp(1010, 142, m), lerp(ws0, 58, m), { glow: lerp(34, 14, m) });
  // caption (screen-ish space, inside camera so it zooms with the push)
  const cp = P(t, 7.0, 7.45);
  if (cp > 0) {
    const ca = 1 - P(t, 10.3, 10.6);
    c.save(); c.globalAlpha = ca;
    const og = c.createLinearGradient(0, 1180, 0, 1700); og.addColorStop(0, 'rgba(3,0,2,0)'); og.addColorStop(0.35, 'rgba(3,0,2,0.88)'); og.addColorStop(1, 'rgba(3,0,2,0.95)');
    c.fillStyle = og; c.globalAlpha = ca * cp; c.fillRect(24, 1180, W - 48, 710); c.globalAlpha = ca;
    const s1 = fit('ЗДЕСЬ МОЖНО', 96, 900), s2 = fit('ОТКРЫВАТЬ КЕЙСЫ', 120, 960);
    const g = Math.max(glitchPulse(t, 7.0, 0.3), glitchPulse(t, 8.6, 0.15));
    const e1 = eOutExpo(P(t, 7.0, 7.4)), e2 = eOutExpo(P(t, 7.15, 7.55));
    c.save(); c.translate((1 - e1) * -500, 0); glitchTxt(c, 'ЗДЕСЬ МОЖНО', CX, 1420, s1, { glow: 24, alpha: e1 }, g, t * 30); c.restore();
    c.save(); c.translate((1 - e2) * 500, 0); glitchTxt(c, [['ОТКРЫВАТЬ ', WHITE], ['КЕЙСЫ', RED]], CX, 1535, s2, { glow: 40, alpha: e2 }, g, t * 30 + 5); c.restore();
    c.restore();
  }
  c.restore();
  flash(c, 0.55 * P(t, 10.8, 11.0), '255,20,40');
}

// --- roulette motion ---
const PITCH = 330, IW = 300, IH = 362, STRIP_Y = 1000;
const TS = 12.15, TE = 17.0, OFF0 = 2 * PITCH, LAND = 38;
const DIST = WIN * PITCH + LAND - OFF0;
function spinOff(t) {
  if (t <= TS) return OFF0;
  if (t >= TE) return OFF0 + DIST;
  const u = (t - TS) / (TE - TS);
  return OFF0 + DIST * (0.88 * eOutQuart(u) + 0.12 * u);
}
const spinVel = t => (spinOff(t + 0.001) - spinOff(t - 0.001)) / 0.002;
const TICKS = (() => { const r = []; let last = Math.floor((spinOff(TS) + PITCH / 2) / PITCH);
  for (let t = TS; t <= TE; t += 0.0005) { const k = Math.floor((spinOff(t) + PITCH / 2) / PITCH); if (k !== last) { r.push(+t.toFixed(4)); last = k; } } return r; })();
function lastTick(t) { let lo = 0, hi = TICKS.length - 1, best = -1; while (lo <= hi) { const mid = (lo + hi) >> 1; if (TICKS[mid] <= t) { best = mid; lo = mid + 1; } else hi = mid - 1; } return best < 0 ? -10 : TICKS[best]; }

function drawStripItems(c, off, cy, alphaF, o = {}) {
  const first = Math.floor((off - W / 2) / PITCH) - 1, last = Math.ceil((off + W / 2) / PITCH) + 1;
  for (let i = Math.max(0, first); i <= Math.min(ITEMS.length - 1, last); i++) {
    if (o.skip === i) continue;
    const dx = i * PITCH - off, x = CX + dx;
    const d = Math.min(1, Math.abs(dx) / (W * 0.62));
    const sc = 1 - 0.2 * d * d;
    const a = alphaF(i) * (1 - 0.55 * d * d);
    if (a <= 0.01) continue;
    drawItem(c, x + (o.spread ? Math.sign(dx) * o.spread : 0), cy + d * d * 26, IW * sc, IH * sc, ITEMS[i], { alpha: a, names: o.names ?? true });
  }
}
function drawStripFrame(c, t, wF, a) {
  if (a <= 0) return;
  const hw = W * 0.5 * wF;
  c.save(); c.globalAlpha = a;
  const g = c.createLinearGradient(0, STRIP_Y - 230, 0, STRIP_Y + 230); g.addColorStop(0, 'rgba(20,2,6,0.9)'); g.addColorStop(0.5, 'rgba(35,4,10,0.9)'); g.addColorStop(1, 'rgba(20,2,6,0.9)');
  c.fillStyle = g; c.fillRect(CX - hw, STRIP_Y - 225, hw * 2, 450);
  c.fillStyle = RED; c.shadowColor = RED; c.shadowBlur = 24;
  c.fillRect(CX - hw, STRIP_Y - 228, hw * 2, 4); c.fillRect(CX - hw, STRIP_Y + 224, hw * 2, 4);
  c.restore();
}
function drawMarker(c, t, a) {
  if (a <= 0) return;
  const k = Math.exp(-(t - lastTick(t)) * 18);
  c.save(); c.globalAlpha = a; c.globalCompositeOperation = 'lighter';
  c.drawImage(SPR_R, CX - 60, STRIP_Y - 260, 120, 520);
  c.fillStyle = `rgba(255,${200 + 55 * k},${200 + 55 * k},1)`; c.shadowColor = RED; c.shadowBlur = 30 + 30 * k;
  c.fillRect(CX - 3, STRIP_Y - 215, 6, 430);
  c.globalCompositeOperation = 'source-over'; c.fillStyle = RED;
  const tri = (y, dir) => { c.beginPath(); c.moveTo(CX - 26, y); c.lineTo(CX + 26, y); c.lineTo(CX, y + dir * 32); c.closePath(); c.fill(); };
  tri(STRIP_Y - 236, 1); tri(STRIP_Y + 236, -1);
  c.restore();
}

// S4 11–17: case opens, roulette
function S4(c, t) {
  drawBG(c, t, { glow: 0.5 + 0.2 * Math.sin(t * 2), grid: 0.6, particles: 1, gy: 900 });
  const v = spinVel(t);
  const vs = clamp(v / 16000);
  const sh = shakeAt(t, 11.9, 14, 8, 11) + vs * 3 * noise1(t * 50, 3) + shakeAt(t, 11.55, 3, 2, 12);
  const z = 1.0 + 0.1 * eIOC(P(t, 12.2, 16.6)) + 0.08 * eInC(P(t, 16.5, 17.0)) + 0.25 * (1 - eOutExpo(P(t, 11.0, 11.6)));
  c.save(); cam(c, { z, y: 960, r: 0.012 * Math.sin(t * 1.1), sx: sh, sy: sh * 0.6 });
  // title
  const tp = eOutExpo(P(t, 11.2, 11.6));
  txt(c, [['КЕЙС ', WHITE], ['«ЛЕГЕНДА»', RED]], CX, 330 - (1 - tp) * 40, fit('КЕЙС «ЛЕГЕНДА»', 64, 900), { glow: 24, alpha: tp, ls: 2 });
  // case: arrive -> anticipate -> open -> move up
  const arrive = eOutExpo(P(t, 11.0, 11.5));
  const open = eOutBack(P(t, 11.95, 12.35), 1.4);
  const up = eIOC(P(t, 12.15, 12.7));
  const jitter = (t > 11.55 && t < 11.95) ? (hash(Math.floor(t * 60)) - 0.5) * 0.06 * P(t, 11.55, 11.95) : 0;
  const cw = lerp(lerp(1000, 640, arrive), 330, up), cy = lerp(880, 610, up);
  rays(c, CX, cy - 60, t, P(t, 11.95, 12.2) * (1 - 0.6 * up), 18, 1500, 0.5);
  c.save(); c.translate(CX, cy); c.rotate(jitter); c.translate(-CX, -cy);
  drawCase(c, CX, cy, cw, CASES[3], { open, light: open * (1 - 0.4 * up), glow: 1.3, alpha: lerp(1, 0.9, up) });
  c.restore();
  burst(c, CX, cy - 60, t, 11.98, 110, 1700, 21);
  shock(c, CX, cy - 40, t, 11.98, 0.6, 900, 22);
  // strip
  const wF = eOutExpo(P(t, 12.0, 12.45));
  drawStripFrame(c, t, wF, 1);
  if (wF > 0) {
    const off = spinOff(t);
    const shutter = 1 / 60, smear = v * shutter, n = smear > 20 ? Math.min(9, Math.ceil(smear / 26)) : 1;
    slctx.setTransform(1, 0, 0, 1, 0, 0);
    sactx.clearRect(0, 0, W, 560);
    for (let k = 0; k < n; k++) {
      slctx.clearRect(0, 0, W, 560);
      const o2 = n > 1 ? off + smear * (k / (n - 1) - 0.5) : off;
      drawStripItems(slctx, o2, 280, () => 1, { names: v < 3000 });
      sactx.globalAlpha = 1 / (k + 1); sactx.drawImage(stripL, 0, 0);
    }
    c.save(); c.beginPath(); c.rect(CX - W * 0.5 * wF, STRIP_Y - 280, W * wF, 560); c.clip();
    c.globalAlpha = clamp(P(t, 12.05, 12.35)); c.drawImage(stripA, 0, STRIP_Y - 280); c.restore();
    // speed lines
    if (vs > 0.05) {
      c.save(); c.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 26; i++) {
        const y = STRIP_Y - 240 + hash(i * 3.3) * 480, len = 200 + hash(i * 5.5) * 500;
        const x = W - ((t * 4000 * (0.5 + hash(i)) + hash(i * 9.1) * W * 2) % (W * 2 + len));
        c.globalAlpha = vs * 0.35; c.fillStyle = hash(i * 2.2) > 0.6 ? '#fff' : RED; c.fillRect(x, y, len, 2);
      }
      c.restore();
    }
  }
  drawMarker(c, t, wF);
  c.restore();
  flash(c, 0.55 * (1 - P(t, 11.0, 11.25)), '255,20,40');
  flash(c, 0.35 * (1 - P(t, 11.98, 12.3)) * (t > 11.98 ? 1 : 0), '255,200,200');
}

// S5 17–20: stop on the rare skin
function S5(c, t) {
  drawBG(c, t, { glow: 0.7 + 0.3 * Math.exp(-(t - 17) * 3), grid: 0.6, particles: 1.2, gy: 900 });
  const sx = shakeAt(t, 17.0, 34, 4.2, 31), sy = shakeAt(t, 17.0, 26, 4.2, 32) + shakeAt(t, 18.02, 10, 8, 33) + shakeAt(t, 18.24, 12, 8, 34);
  const out = eInExpo(P(t, 19.55, 20.0));
  const z = 1.18 - 0.1 * eOutC(P(t, 17.0, 17.8)) + 0.02 * (t - 17) + 1.6 * out;
  c.save(); cam(c, { z, y: lerp(980, 930, eOutC(P(t, 17.2, 18))), sx, sy, r: 0.01 * Math.sin(t * 1.4) + out * 0.25 });
  const off = spinOff(TE);
  const lift = eOutBack(P(t, 17.25, 17.85), 1.3);
  const wx = CX + WIN * PITCH - off, wy = STRIP_Y;
  const cx = lerp(wx, CX, lift), cyy = lerp(wy, 880, lift), sc = lerp(1, 1.75, lift);
  rays(c, cx, cyy, t, clamp(P(t, 17.0, 17.3)) * (0.9 + 0.1 * Math.sin(t * 6)), 20, 1700, 0.35);
  c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.7 + 0.3 * Math.sin(t * 5);
  c.drawImage(SPR_R, cx - 520, cyy - 620, 1040, 1240); c.restore();
  const fade = 1 - P(t, 17.25, 17.7);
  drawStripFrame(c, t, 1, fade);
  if (fade > 0) drawStripItems(c, off, STRIP_Y, () => fade, { skip: WIN, spread: 240 * eInC(1 - fade) });
  drawMarker(c, t, fade);
  // rarity chip
  const cp = eOutBack(P(t, 17.55, 17.9));
  if (cp > 0) {
    c.save(); c.translate(cx, cyy - IH * sc / 2 - 70); c.scale(cp, cp);
    rr(c, -150, -34, 300, 68, 34); c.fillStyle = RAR.red; c.shadowColor = RED; c.shadowBlur = 30; c.fill(); c.shadowBlur = 0;
    txt(c, 'ТАЙНОЕ', 0, 2, 36, { color: WHITE, ls: 4 });
    c.restore();
  }
  drawItem(c, cx, cyy, IW * sc, IH * sc, WINNER, { hl: 1 });
  // shimmer on card
  const shp = P(t, 17.35, 17.95);
  if (shp > 0 && shp < 1) {
    c.save(); c.translate(cx, cyy); rr(c, -IW * sc / 2, -IH * sc / 2, IW * sc, IH * sc, IW * sc * 0.06); c.clip();
    const xx = lerp(-IW * sc, IW * sc, shp); const g = c.createLinearGradient(xx - 120, -200, xx + 120, 200);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.globalCompositeOperation = 'lighter'; c.fillStyle = g; c.fillRect(-IW * sc, -IH * sc, IW * sc * 2, IH * sc * 2); c.restore();
  }
  burst(c, wx, wy, t, 17.0, 220, 2600, 7);
  shock(c, wx, wy, t, 17.0, 0.8, 1300, 40);
  shock(c, wx, wy, t, 17.12, 0.8, 900, 18);
  // caption
  if (t >= 18.0) {
    const slam = (t0) => { const p = P(t, t0, t0 + 0.18); return p < 1 ? lerp(2.6, 1, eInC(p)) : 1 + 0.05 * Math.exp(-(t - t0 - 0.18) * 10) * Math.cos((t - t0 - 0.18) * 38); };
    const g = Math.max(glitchPulse(t, 18.0, 0.3), glitchPulse(t, 18.22, 0.25), glitchPulse(t, 19.1, 0.15));
    const s1 = fit('И ЧТО', 130, 800), s2 = fit('ТЕБЕ ВЫПАДЕТ?', 130, 800);
    const lines = [['И ЧТО', 1380, 18.0, s1], [[['ТЕБЕ ', WHITE], ['ВЫПАДЕТ?', RED]], 1510, 18.22, s2]];
    for (const [str, y, t0, sz] of lines) {
      if (t < t0) continue;
      const k = slam(t0);
      c.save(); c.translate(CX, y); c.scale(k, k); c.translate(-CX, -y);
      glitchTxt(c, str, CX, y, sz, { glow: 40, alpha: clamp(P(t, t0, t0 + 0.07)) }, g, t * 30 + y);
      c.restore();
    }
  }
  c.restore();
  flash(c, (t < 17.03 ? 1 : 0.95 * Math.exp(-(t - 17.03) * 6)), '255,40,60');
  flash(c, 0.6 * Math.exp(-(t - 17.0) * 14), '255,255,255');
  flash(c, 0.9 * P(t, 19.8, 20.0), '255,50,70');
}

// S6 20–25: final composition
const DECOR = [
  { k: 'case', i: 3, x: 190, y: 330, w: 250, r: -0.22, from: [-500, -400] },
  { k: 'item', it: WINNER, x: 890, y: 370, w: 200, r: 0.16, from: [1600, -300] },
  { k: 'item', it: { ...POOL.gold[0], r: 'gold' }, x: 130, y: 640, w: 170, r: -0.14, from: [-600, 600] },
  { k: 'case', i: 1, x: 960, y: 650, w: 190, r: 0.2, from: [1700, 600] },
  { k: 'item', it: { ...POOL.red[0], r: 'red' }, x: 210, y: 1480, w: 210, r: 0.12, from: [-500, 2400] },
  { k: 'case', i: 5, x: 870, y: 1470, w: 240, r: -0.16, from: [1600, 2400] },
];
function S6(c, t) {
  drawBG(c, t, { glow: 0.85, grid: 0.7, particles: 1.2, gy: 760, hz: 1300 });
  const z = lerp(1.12, 1.0, eOutC(P(t, 20.0, 21.2))) + 0.01 * (t - 20);
  const sx = shakeAt(t, 20.62, 18, 8, 41), sy = shakeAt(t, 20.62, 14, 8, 42);
  c.save(); cam(c, { z, y: 930, sx, sy, r: 0.006 * Math.sin(t * 0.9) });
  rays(c, CX, 680, t, clamp(P(t, 20.3, 20.9)), 18, 1600, 0.22);
  // orbit ring of particles around emblem
  c.save(); c.globalCompositeOperation = 'lighter';
  const ra = clamp(P(t, 20.5, 21.2));
  for (let i = 0; i < 70; i++) {
    const ang = i / 70 * Math.PI * 2 + t * 0.6, rx = 400 * (1 + (1 - ra) * 0.6), ry = 105;
    const px = CX + Math.cos(ang) * rx, py = 690 + Math.sin(ang) * ry, s = 3 + 3 * hash(i);
    c.globalAlpha = ra * (0.35 + 0.5 * (Math.sin(ang) * 0.5 + 0.5)); c.drawImage(i % 4 ? SPR_R : SPR_W, px - s * 4, py - s * 4, s * 8, s * 8);
  }
  c.restore();
  // decor flying in
  DECOR.forEach((d, i) => {
    const p = eOutExpo(P(t, 20.0 + i * 0.07, 20.8 + i * 0.07)); if (p <= 0) return;
    const fx = d.x + Math.sin(t * 1.3 + i * 2) * 10, fy = d.y + Math.cos(t * 1.1 + i) * 14;
    const x = lerp(d.from[0], fx, p), y = lerp(d.from[1], fy, p);
    c.save(); c.globalAlpha = 0.9 * clamp(p * 1.5); c.translate(x, y); c.rotate(d.r + (1 - p) * 1.2 + Math.sin(t * 0.9 + i) * 0.04); c.scale(lerp(2.2, 1, p), lerp(2.2, 1, p));
    if (d.k === 'case') drawCase(c, 0, 0, d.w, CASES[d.i], { glow: 0.8 });
    else drawItem(c, 0, 0, d.w, d.w * 1.2, d.it, { hl: 0.6, names: false });
    c.restore();
  });
  // emblem
  const ep = P(t, 20.15, 20.62);
  if (ep > 0) {
    const e = eInC(ep);
    drawEmblem(c, CX, lerp(-300, 660, ep < 1 ? e : 1) + (ep >= 1 ? Math.sin((t - 20.62) * 2) * 6 : 0), 290, {
      rot: -0.18 + (1 - ep) * 1.5 + (ep >= 1 ? 0.03 * Math.sin((t - 20.62) * 1.5) : 0),
      flip: (1 - ep) * Math.PI * 2, shine: P(t, 21.1, 21.6) || -1, glow: 60 });
  }
  burst(c, CX, 680, t, 20.62, 150, 2000, 51);
  shock(c, CX, 680, t, 20.62, 0.8, 1200, 30);
  // wordmark letters converge
  const ws = fit([['RED', RED], ['CARD', WHITE]], 190, 900, 900, 4);
  if (t > 20.3) drawWordmark(c, CX, 935, ws, {
    sweep: P(t, 21.05, 21.6), glow: 40,
    fn: (i) => { const p = P(t, 20.3 + i * 0.04, 20.75 + i * 0.04), e = eOutExpo(p);
      return { a: clamp(p * 1.8), dx: (1 - e) * (hash(i * 3.1) - 0.5) * 1400, dy: (1 - e) * (hash(i * 7.7) - 0.5) * 1400, s: lerp(3, 1, e), r: (1 - e) * (hash(i) - 0.5) * 2 }; },
  });
  // tagline
  const tp = P(t, 21.4, 22.0);
  if (tp > 0) {
    const e = eOutExpo(tp), tg = 'ОТКРЫВАЙ. ИСПЫТЫВАЙ УДАЧУ.';
    const ls = lerp(24, 3, e), ts = fit(tg, 64, 960, 800, ls);
    c.save(); c.beginPath(); const half = 520 * e; c.rect(CX - half, 1020, half * 2, 120); c.clip();
    txt(c, [['ОТКРЫВАЙ. ', WHITE], ['ИСПЫТЫВАЙ УДАЧУ.', RED]], CX, 1080, ts, { w: 800, ls, glow: 22 });
    c.restore();
    c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = 1 - P(t, 21.7, 22.2);
    c.drawImage(SPR_W, CX - half - 20, 1060, 40, 40); c.drawImage(SPR_W, CX + half - 20, 1060, 40, 40); c.restore();
  }
  // CTA
  const bp = P(t, 23.0, 23.45);
  if (bp > 0) {
    const e = eOutBack(bp, 2.0), pulse = 1 + 0.03 * Math.sin((t - 23.4) * 7) * clamp(P(t, 23.4, 23.6));
    const label = 'ССЫЛКА В ПРОФИЛЕ', ls = fit(label, 50, 600, 900, 3);
    c.save(); c.translate(CX, 1250); c.scale(e * pulse, e * pulse);
    const bw = 700, bh = 120;
    c.shadowColor = RED; c.shadowBlur = 50 + 20 * Math.sin(t * 7);
    const g = c.createLinearGradient(-bw / 2, 0, bw / 2, 0); g.addColorStop(0, '#ff2a40'); g.addColorStop(1, '#c0001b');
    rr(c, -bw / 2, -bh / 2, bw, bh, bh / 2); c.fillStyle = g; c.fill(); c.shadowBlur = 0;
    c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = 3; rr(c, -bw / 2, -bh / 2, bw, bh, bh / 2); c.stroke();
    c.save(); rr(c, -bw / 2, -bh / 2, bw, bh, bh / 2); c.clip();
    const sxp = lerp(-bw, bw, ((t - 23.2) / 1.1) % 1);
    const sg = c.createLinearGradient(sxp - 80, 0, sxp + 80, 0); sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, 'rgba(255,255,255,0.5)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = sg; c.fillRect(-bw / 2, -bh / 2, bw, bh); c.restore();
    txt(c, label, 0, 3, ls, { color: WHITE, ls: 3 });
    c.restore();
    shock(c, CX, 1250, t, 23.05, 0.6, 600, 10);
  }
  c.restore();
  flash(c, 0.9 * (1 - P(t, 20.0, 20.3)), '255,50,70');
  flash(c, 0.5 * Math.exp(-(t - 20.62) * 9) * (t >= 20.62 ? 1 : 0), '255,255,255');
}

// ---------- frame ----------
function drawScene(c, t) {
  c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; c.filter = 'none';
  if (t < 3.0) S1(c, t); else if (t < 5.5) S2(c, t); else if (t < 11.0) S3(c, t);
  else if (t < 17.0) S4(c, t); else if (t < 20.0) S5(c, t); else S6(c, t);
}
const BLUR_RANGES = [[2.7, 3.08], [3.0, 3.6], [4.15, 4.8], [5.05, 6.2], [10.35, 11.5], [16.95, 17.35], [18.0, 18.45], [19.5, 20.9]];
function samplesAt(t) { return BLUR_RANGES.some(([a, b]) => t >= a && t <= b) ? 5 : 1; }
function renderFrame(f) {
  const t = f / FPS, S = samplesAt(t);
  let src = scene;
  if (S === 1) drawScene(sctx, t);
  else {
    actx.globalAlpha = 1; actx.clearRect(0, 0, W, H);
    for (let k = 0; k < S; k++) {
      const tk = t + (k / (S - 1) - 0.5) / (FPS * 2);
      drawScene(sctx, Math.max(0, tk));
      actx.globalAlpha = 1 / (k + 1); actx.drawImage(scene, 0, 0);
    }
    src = acc;
  }
  octx.setTransform(1, 0, 0, 1, 0, 0); octx.globalAlpha = 1; octx.globalCompositeOperation = 'source-over';
  octx.drawImage(src, 0, 0);
  b1.filter = 'blur(6px)'; b1.clearRect(0, 0, W / 4, H / 4); b1.drawImage(src, 0, 0, W / 4, H / 4); b1.filter = 'none';
  b2.filter = 'blur(5px)'; b2.clearRect(0, 0, W / 10, H / 10); b2.drawImage(src, 0, 0, W / 10, H / 10); b2.filter = 'none';
  octx.globalCompositeOperation = 'lighter';
  octx.globalAlpha = 0.3; octx.drawImage(bloom1, 0, 0, W, H);
  octx.globalAlpha = 0.24; octx.drawImage(bloom2, 0, 0, W, H);
  octx.globalCompositeOperation = 'source-over'; octx.globalAlpha = 1; octx.drawImage(VIG, 0, 0);
  octx.globalCompositeOperation = 'overlay'; octx.globalAlpha = 0.07; octx.drawImage(GRAIN[f % 4], 0, 0, W, H);
  octx.globalCompositeOperation = 'source-over'; octx.globalAlpha = 1;
}
window.renderFrame = renderFrame;
window.frameJPEG = (f) => { renderFrame(f); return out.toDataURL('image/jpeg', 0.94); };
window.TICKS = TICKS;
window.META = { FPS, DURATION, TE };
