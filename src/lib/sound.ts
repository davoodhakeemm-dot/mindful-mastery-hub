// Ambient hypnotic music + feedback sounds generated in the browser (no files needed).
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let playing = false;

function getCtx() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function isMusicPlaying() {
  return playing;
}

export function startMusic() {
  const c = getCtx();
  if (!c || playing) return;
  playing = true;
  master = c.createGain();
  master.gain.value = 0;
  master.gain.linearRampToValueAtTime(0.09, c.currentTime + 4);
  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 700;
  filter.connect(master);
  master.connect(c.destination);

  // Slow drone chord (A minor-ish), lightly detuned for a gentle shimmer
  [110, 110.6, 164.8, 220.4, 261.6].forEach((f, i) => {
    const o = c.createOscillator();
    o.type = i % 2 ? "triangle" : "sine";
    o.frequency.value = f;
    const g = c.createGain();
    g.gain.value = 0.18;
    const lfo = c.createOscillator();
    lfo.frequency.value = 0.05 + i * 0.023;
    const lfoGain = c.createGain();
    lfoGain.gain.value = 0.12;
    lfo.connect(lfoGain).connect(g.gain);
    o.connect(g).connect(filter);
    o.start();
    lfo.start();
  });

  // Slow "breathing" sweep on the filter
  const sweep = c.createOscillator();
  sweep.frequency.value = 0.07;
  const sweepGain = c.createGain();
  sweepGain.gain.value = 300;
  sweep.connect(sweepGain).connect(filter.frequency);
  sweep.start();
}

export function stopMusic() {
  if (!ctx || !master || !playing) return;
  const m = master;
  m.gain.cancelScheduledValues(ctx.currentTime);
  m.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.2);
  setTimeout(() => m.disconnect(), 1400);
  master = null;
  playing = false;
}

function tone(freq: number, dur: number, type: OscillatorType, vol: number, delay = 0) {
  const c = getCtx();
  if (!c) return;
  const t = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.05);
}

export function playChime() {
  tone(659, 1.2, "sine", 0.15);
  tone(988, 1.4, "sine", 0.1, 0.15);
  tone(1318, 1.6, "sine", 0.06, 0.3);
}

export function playTap() {
  tone(880, 0.25, "sine", 0.06);
}

export function playError() {
  tone(150, 0.35, "sawtooth", 0.08);
  tone(120, 0.4, "sawtooth", 0.08, 0.12);
}

/** Wrong key feedback: buzz sound + phone vibration. */
export function wrongFeedback() {
  playError();
  if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate([90, 50, 90, 50, 140]);
}
