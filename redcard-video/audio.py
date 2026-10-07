# Procedural soundtrack: dark trap-ish beat, whooshes, glitches, roulette ticks, impact.
import json, sys, wave, numpy as np
SR = 48000; DUR = 25.0; N = int(SR * DUR)
L = np.zeros(N); R = np.zeros(N)
rng = np.random.default_rng(7)
ticks = json.load(open(sys.argv[1]))['ticks']
def add(sig, t, gain=1.0, pan=0.0):
    i = int(t * SR); n = min(len(sig), N - i)
    if n <= 0: return
    L[i:i+n] += sig[:n] * gain * (1 - max(pan, 0)); R[i:i+n] += sig[:n] * gain * (1 + min(pan, 0))
def env(n, a, d): x = np.arange(n) / SR; return np.minimum(1, x / max(a, 1e-4)) * np.exp(-x / d)
def lp(x, k):  # one-pole lowpass, k in (0,1]
    y = np.empty_like(x); s = 0.0
    for i in range(len(x)): s += k * (x[i] - s); y[i] = s
    return y
def kick():
    n = int(0.5 * SR); x = np.arange(n) / SR
    f = 45 + 120 * np.exp(-x * 30); ph = 2 * np.pi * np.cumsum(f) / SR
    return np.tanh(2.2 * np.sin(ph) * np.exp(-x * 6))
def snare():
    n = int(0.3 * SR); x = np.arange(n) / SR
    nz = rng.standard_normal(n); nz = nz - lp(nz, 0.15)
    return 0.6 * nz * np.exp(-x * 18) + 0.4 * np.sin(2 * np.pi * 190 * x) * np.exp(-x * 25)
def hat(o=False):
    n = int((0.25 if o else 0.06) * SR); nz = rng.standard_normal(n); nz = nz - lp(nz, 0.5)
    return nz * env(n, 0.001, 0.08 if o else 0.015)
def sub(dur, f=55.0):
    n = int(dur * SR); x = np.arange(n) / SR
    return np.tanh(1.5 * np.sin(2 * np.pi * f * x)) * env(n, 0.005, dur * 0.6)
def whoosh(dur=0.6, rise=True):
    n = int(dur * SR); x = np.linspace(0, 1, n); nz = rng.standard_normal(n)
    y = np.empty(n); s = 0.0; k = 0.02 + 0.5 * (x if rise else 1 - x) ** 2
    for i in range(n): s += k[i] * (nz[i] - s); y[i] = s
    e = np.sin(np.pi * x) ** 2 if rise else (1 - x) ** 2
    return y * e * 3
def glitch(dur=0.25):
    n = int(dur * SR); x = np.arange(n) / SR
    sq = np.sign(np.sin(2 * np.pi * (300 + 900 * rng.random()) * x * (1 + 3 * x)))
    crush = np.repeat(rng.standard_normal(n // 40 + 1), 40)[:n]
    gate = (np.floor(x * 40) % 2 == 0)
    return (0.4 * sq + 0.5 * crush) * gate * env(n, 0.001, dur * 0.5)
def tick():
    n = int(0.05 * SR); x = np.arange(n) / SR
    return (np.sin(2 * np.pi * 2400 * x) + 0.5 * np.sin(2 * np.pi * 4100 * x)) * np.exp(-x * 140)
def impact(dur=2.5):
    n = int(dur * SR); x = np.arange(n) / SR
    f = 32 + 90 * np.exp(-x * 10); boom = np.tanh(3 * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * 1.6))
    nz = rng.standard_normal(n); crash = (nz - lp(nz, 0.2)) * np.exp(-x * 2.2)
    return boom + 0.35 * crash
def riser(dur):
    n = int(dur * SR); x = np.linspace(0, 1, n); f = 200 + 1600 * x ** 2
    return (0.4 * np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.3 * whoosh(dur)) * x ** 2
def pad(dur, notes):
    n = int(dur * SR); x = np.arange(n) / SR; y = np.zeros(n)
    for f in notes:
        for d in (-0.15, 0.0, 0.15):
            ph = (x * f * (1 + d / 100)) % 1; y += 2 * ph - 1
    y = lp(lp(y / (len(notes) * 3), 0.02), 0.03)
    return y * np.minimum(1, x / 1.5) * np.minimum(1, (dur - x) / 1.0)

BPM = 140; B = 60 / BPM
# pad bed (A minor / F)
add(pad(11.5, [55, 110, 130.8, 164.8]), 0.0, 0.5)
add(pad(6.5, [43.65, 87.3, 130.8, 174.6]), 11.0, 0.45)
add(pad(8.5, [55, 110, 130.8, 164.8, 220]), 16.8, 0.55)
# beat
t = 0.0; beat = 0
while t < DUR:
    sec = t
    if 3.0 <= sec < 17.0 or 20.0 <= sec < 24.5:
        if beat % 4 in (0,) or (sec >= 6 and beat % 8 == 6): add(kick(), t, 0.9 if not 11 <= sec < 17 else 0.6); add(sub(B * 1.8), t, 0.35)
        if sec >= 6 and beat % 4 == 2: add(snare(), t, 0.45 if not 11 <= sec < 17 else 0.3)
        add(hat(), t, 0.12, 0.3); add(hat(), t + B / 2, 0.08, -0.3)
        if sec >= 6 and beat % 2: add(hat(), t + B * 0.75, 0.06, 0.4)
    if 17.0 <= sec < 20.0:
        if beat % 2 == 0: add(kick(), t, 0.95); add(sub(B * 1.8, 43.65), t, 0.35)
        if beat % 4 == 2: add(snare(), t, 0.5)
        add(hat(), t, 0.1, 0.3); add(hat(), t + B / 2, 0.1, -0.3)
    t += B; beat += 1
# sound design
for tt in (0.3, 0.7, 1.55, 2.25, 3.2, 3.56, 7.0, 8.6, 18.0, 18.22, 19.1): add(glitch(0.22), tt, 0.25, (rng.random() - .5) * .6)
for tt, d in ((2.45, 0.6), (4.75 - 0.5, 0.5), (4.9, 0.6), (10.3, 0.75), (19.45, 0.6)): add(whoosh(d), tt, 0.5)
add(whoosh(0.7, False), 5.5, 0.4)
for tt in (3.2, 3.56): add(kick(), tt, 0.7)
add(impact(1.8), 4.72, 0.55)                  # logo hit
add(impact(1.2), 11.98, 0.4); add(whoosh(0.5, False), 12.0, 0.35)  # case opens
for i, tt in enumerate(ticks): add(tick(), tt, 0.22 * (0.6 + 0.4 * min(1, (tt - 12.15) / 4)), 0.15 * ((-1) ** i))
add(riser(1.6), 15.4, 0.35)
add(impact(2.8), 17.0, 0.9)                   # the drop
add(impact(2.0), 20.62, 0.7)                  # final logo
add(glitch(0.3), 23.0, 0.2); add(tick(), 23.05, 0.4)
# master
mix = np.stack([L, R], 1)
fade = np.ones(N); fn = int(0.6 * SR); fade[-fn:] = np.linspace(1, 0, fn); mix *= fade[:, None]
mix = np.tanh(mix * 1.1); mix /= np.max(np.abs(mix)) / 0.89
with wave.open(sys.argv[2], 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype('<i2').tobytes())
print('ok', len(ticks), 'ticks')
