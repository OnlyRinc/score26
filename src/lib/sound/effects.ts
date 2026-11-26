"use client";
// Soundeffekte werden direkt im Browser erzeugt (keine Audiodateien nötig, funktioniert offline).
let ctx: AudioContext | null = null;
function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AC();
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(c: AudioContext, freq: number, start: number, dur: number, type: OscillatorType = "sawtooth", vol = 0.12) {
  const o = c.createOscillator();
  const g = c.createGain();
  const f = c.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.value = 3200;
  o.type = type;
  o.frequency.setValueAtTime(freq, c.currentTime + start);
  g.gain.setValueAtTime(0.0001, c.currentTime + start);
  g.gain.exponentialRampToValueAtTime(vol, c.currentTime + start + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + dur);
  o.connect(f).connect(g).connect(c.destination);
  o.start(c.currentTime + start);
  o.stop(c.currentTime + start + dur + 0.05);
}

/** Rauschen, das wie jubelndes Publikum anschwillt. */
function crowd(c: AudioContext, start: number, dur: number, vol = 0.18) {
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (0.6 + 0.4 * Math.sin(i / 900));
  const src = c.createBufferSource();
  src.buffer = buf;
  const bp = c.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 1100;
  bp.Q.value = 0.6;
  const g = c.createGain();
  const t = c.currentTime + start;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.35);
  g.gain.setValueAtTime(vol, t + dur * 0.6);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(bp).connect(g).connect(c.destination);
  src.start(t);
}

export function sound180() {
  const c = ac();
  if (!c) return;
  [523.25, 659.25, 783.99].forEach((f, i) => tone(c, f, i * 0.12, 0.25));
  tone(c, 1046.5, 0.36, 0.9, "sawtooth", 0.16);
  tone(c, 1318.5, 0.36, 0.9, "square", 0.05);
  crowd(c, 0.3, 2.4);
}

export function soundHighFinish() {
  const c = ac();
  if (!c) return;
  [392, 523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(c, f, i * 0.08, 0.3, "triangle", 0.18));
  tone(c, 1568, 0.42, 0.8, "sawtooth", 0.1);
  crowd(c, 0.35, 2.0, 0.14);
}

export function soundLeg() {
  const c = ac();
  if (!c) return;
  tone(c, 659.25, 0, 0.18, "triangle", 0.18);
  tone(c, 987.77, 0.14, 0.4, "triangle", 0.18);
}

export function soundMatch() {
  const c = ac();
  if (!c) return;
  [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5].forEach((f, i) => tone(c, f, i * 0.13, 0.35, "sawtooth", 0.13));
  crowd(c, 0.4, 3, 0.2);
}

export function soundTon() {
  const c = ac();
  if (!c) return;
  tone(c, 880, 0, 0.12, "triangle", 0.1);
  tone(c, 1174.66, 0.08, 0.2, "triangle", 0.1);
}
