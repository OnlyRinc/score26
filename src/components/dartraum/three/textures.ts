// Gezeichnete Texturen (Canvas) für den 3D-Dartraum: Trikot, Dartboard, Böden, Wände, Schilder.
import * as THREE from "three";
import type { Jersey } from "@/lib/dartraum/catalog";

export const PINK = "#d63ce0", CYAN = "#5fe3f0", GOLD = "#e8c25a";
const FONT_DISPLAY = "Oswald, 'Arial Narrow', sans-serif";
const FONT_SCRIPT = "'Kaushan Script', cursive";

/** Schriftfamilien aus den CSS-Variablen der Seite holen (Next.js benennt Fonts um) */
function cssFont(varName: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return v ? `${v}, ${fallback}` : fallback;
}
export const fonts = () => ({ display: cssFont("--font-oswald", FONT_DISPLAY), script: cssFont("--font-kaushan", FONT_SCRIPT) });

export function shade(hex: string, amt: number): string {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const f = (c: number) => Math.round(amt >= 0 ? c + (255 - c) * amt : c * (1 + amt));
  r = f(r); g = f(g); b = f(b);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}
export const isLight = (hex: string) => {
  const n = parseInt(hex.replace("#", ""), 16);
  return ((n >> 16) & 255) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114 > 160;
};

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  return [c, c.getContext("2d")!] as const;
}
export function tex(c: HTMLCanvasElement, repeat?: [number, number]) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  return t;
}

// ---------------- Trikot ----------------
// Muster im Raum x -30..30, y -84..-34 (wie die alte 2D-Figur), auf die Leinwand gestreckt.
function jerseyPattern(ctx: CanvasRenderingContext2D, j: Jersey, back: boolean) {
  const { primary: p, secondary: s, accent: a } = j;
  const fill = (d: string, c: string) => { ctx.fillStyle = c; ctx.fill(new Path2D(d)); };
  const line = (d: string, c: string, w: number) => { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.stroke(new Path2D(d)); };
  const hem = () => { ctx.fillStyle = s; ctx.fillRect(-30, -44, 60, 4); };
  ctx.fillStyle = p; ctx.fillRect(-30, -84, 60, 50);
  switch (j.design) {
    case "panels":
      fill("M-30 -84 L-12 -66 L-11 -34 L-30 -34 Z", s); fill("M30 -84 L12 -66 L11 -34 L30 -34 Z", s);
      line("M-12 -66 L-11 -34 M12 -66 L11 -34", a, 1.3); break;
    case "flames":
      fill("M-30 -34 L-30 -50 C-24 -46 -26 -56 -20 -62 C-20 -54 -14 -52 -12 -58 C-10 -50 -6 -48 -4 -64 C0 -56 4 -52 6 -60 C8 -52 12 -50 14 -58 C16 -50 22 -48 20 -64 C26 -56 30 -52 30 -50 L30 -34 Z", s);
      fill("M-30 -34 L-30 -44 C-24 -42 -24 -48 -18 -52 C-18 -46 -12 -44 -10 -48 C-8 -42 -2 -42 0 -52 C2 -44 6 -42 8 -48 C10 -42 16 -42 16 -50 C22 -44 26 -42 30 -44 L30 -34 Z", a); break;
    case "bolts": {
      const d = "M-30 -60 L-6 -68 L-8 -60 L14 -68 L11 -58 L30 -64 L30 -54 L8 -47 L11 -56 L-10 -49 L-8 -57 L-30 -50 Z";
      fill(d, s); ctx.lineJoin = "round"; line(d, a, 1.2); hem(); break;
    }
    case "shards":
      fill("M-30 -84 L-8 -84 L-22 -60 Z", s); fill("M-22 -60 L-6 -50 L-26 -40 Z", a); fill("M30 -70 L8 -56 L30 -48 Z", s);
      fill("M2 -84 L16 -84 L6 -70 Z", a); fill("M-4 -40 L10 -48 L18 -34 Z", s); break;
    case "diagonal":
      fill(back ? "M30 -84 L16 -84 L-30 -42 L-30 -30 Z" : "M-30 -84 L-16 -84 L30 -42 L30 -30 Z", s);
      line(back ? "M17 -84 L-30 -41 M30 -71 L-17 -30" : "M-17 -84 L30 -41 M-30 -71 L17 -30", a, 1.4); break;
    case "fade": {
      const g = ctx.createLinearGradient(0, -84, 0, -34); g.addColorStop(0, p); g.addColorStop(1, s);
      ctx.fillStyle = g; ctx.fillRect(-30, -84, 60, 50);
      ctx.fillStyle = a;
      for (let row = 0; row < 6; row++) for (let i = 0; i < 13; i++) { ctx.beginPath(); ctx.arc(-29 + i * 5 + (row % 2) * 2.5, -37 - row * 4, Math.max(0.3, 1.5 - row * 0.22), 0, Math.PI * 2); ctx.fill(); }
      break;
    }
    case "camo": {
      const blobs: [number, number, number, number, number, string][] = [[-14, -70, 8, 5, 20, s], [8, -62, 9, 5, -30, a], [-6, -50, 10, 4, 10, s], [14, -46, 7, 4, 40, a], [-20, -48, 6, 4, -20, s], [4, -76, 6, 3, 0, a], [-2, -64, 5, 3, 30, shade(p, -0.35)], [18, -70, 5, 3, 0, shade(p, -0.35)], [-18, -60, 4, 3, 60, shade(p, -0.35)], [22, -38, 6, 3, 10, s], [-24, -76, 5, 3, 30, a]];
      for (const [x, y, rx, ry, rot, c] of blobs) { ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, (rot * Math.PI) / 180, 0, Math.PI * 2); ctx.fill(); }
      break;
    }
    case "checker":
      for (let row = 0; row < 3; row++) for (let i = 0; i < 16; i++) { ctx.fillStyle = (i + row) % 2 ? s : a; ctx.fillRect(-30 + i * 3.8, -66 + row * 3.8, 3.85, 3.85); }
      hem(); break;
    case "waves":
      fill("M-30 -56 C-20 -68 -10 -44 0 -58 C10 -72 20 -46 30 -60 L30 -52 C20 -38 10 -64 0 -50 C-10 -36 -20 -60 -30 -48 Z", s);
      line("M-30 -46 C-20 -58 -10 -36 0 -48 C10 -60 20 -38 30 -50", a, 1.6); hem(); break;
    case "club26":
      ctx.fillStyle = s; ctx.fillRect(-30, -46, 60, 6); ctx.fillStyle = a; ctx.fillRect(-30, -47, 60, 1); break;
    case "club26neon":
      ctx.shadowColor = s; ctx.shadowBlur = 3; line("M-30 -62 L30 -72", s, 2.2);
      ctx.shadowColor = a; line("M-30 -46 L30 -56", a, 2.2); ctx.shadowBlur = 0; break;
    default: hem();
  }
}

/** Trikot-Texturen für Vorder- und Rückseite sowie die Seiten */
export function jerseyTextures(j: Jersey, name: string) {
  const f = fonts();
  const W = 384, H = 512;
  const face = (back: boolean) => {
    const [c, ctx] = canvas(W, H);
    ctx.save();
    ctx.scale(W / 60, H / 50); ctx.translate(30, 84);
    jerseyPattern(ctx, j, back);
    ctx.restore();
    // Stoffstruktur: feine Linien
    ctx.globalAlpha = 0.05; ctx.fillStyle = "#000";
    for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1);
    ctx.globalAlpha = 1;
    const txt = isLight(j.primary) ? "#15101c" : "#ffffff";
    if (!back) {
      if (j.design === "club26") { ctx.fillStyle = "#fff"; ctx.font = `110px ${f.script}`; ctx.textAlign = "center"; ctx.fillText("Club26", W / 2, H * 0.62); }
      if (j.design === "club26neon") { ctx.shadowColor = j.secondary; ctx.shadowBlur = 16; ctx.fillStyle = j.secondary; ctx.font = `150px ${f.script}`; ctx.textAlign = "center"; ctx.fillText("26", W / 2, H * 0.66); ctx.shadowBlur = 0; }
      if (j.sponsors) {
        // Sponsor rechts auf der Brust, Vereinslogo links
        ctx.fillStyle = "#fff"; roundRect(ctx, W * 0.56, H * 0.2, W * 0.32, H * 0.085, 8); ctx.fill();
        ctx.fillStyle = "#15101c"; ctx.font = `700 34px ${f.display}`; ctx.textAlign = "center"; ctx.fillText("SCORE26", W * 0.72, H * 0.268);
        ctx.fillStyle = j.accent; ctx.beginPath(); ctx.arc(W * 0.26, H * 0.245, 30, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "#fff"; ctx.lineWidth = 4; ctx.stroke();
        ctx.fillStyle = "#fff"; ctx.font = `36px ${f.script}`; ctx.fillText("26", W * 0.26, H * 0.262);
      }
      // Knopfleiste
      if (j.collar === "polo") {
        ctx.fillStyle = shade(j.primary, -0.18); ctx.fillRect(W / 2 - 14, 0, 28, H * 0.2);
        ctx.fillStyle = "#fff"; [0.07, 0.14].forEach((y) => { ctx.beginPath(); ctx.arc(W / 2, H * y, 5, 0, Math.PI * 2); ctx.fill(); });
      } else {
        ctx.fillStyle = j.secondary; ctx.beginPath(); ctx.moveTo(W * 0.3, 0); ctx.lineTo(W / 2, H * 0.17); ctx.lineTo(W * 0.7, 0); ctx.lineTo(W * 0.62, 0); ctx.lineTo(W / 2, H * 0.11); ctx.lineTo(W * 0.38, 0); ctx.fill();
      }
    } else {
      const shown = name.toUpperCase().slice(0, 12);
      if (shown) {
        // Name in Bogenform wie auf echten Dart-Trikots
        ctx.font = `700 120px ${f.display}`;
        const w = ctx.measureText(shown).width;
        const sx = Math.min(1, (W * 0.86) / w);
        ctx.save(); ctx.translate(W / 2, H * 0.34); ctx.scale(sx, 1);
        ctx.textAlign = "center"; ctx.lineJoin = "round";
        ctx.lineWidth = 14; ctx.strokeStyle = j.accent === j.primary ? shade(j.primary, -0.4) : j.accent; ctx.strokeText(shown, 0, 0);
        ctx.fillStyle = txt; ctx.fillText(shown, 0, 0);
        ctx.restore();
      }
      if (j.sponsors) {
        ctx.fillStyle = "#fff"; roundRect(ctx, W * 0.28, H * 0.47, W * 0.44, H * 0.08, 8); ctx.fill();
        ctx.fillStyle = "#15101c"; ctx.font = `700 36px ${f.display}`; ctx.textAlign = "center"; ctx.fillText("SCORE26", W / 2, H * 0.533);
      }
      ctx.fillStyle = j.collar === "polo" ? j.secondary : shade(j.primary, -0.3); ctx.fillRect(W * 0.3, 0, W * 0.4, 14);
    }
    return tex(c);
  };
  const side = () => {
    const [c, ctx] = canvas(128, 512);
    ctx.save(); ctx.scale(128 / 20, 512 / 50); ctx.translate(30, 84);
    jerseyPattern(ctx, j, false);
    ctx.restore();
    return tex(c);
  };
  return { front: face(false), back: face(true), side: side() };
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

// ---------------- Dartboard ----------------
const NUMBERS = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
export function boardTexture() {
  const f = fonts();
  const S = 1024, [c, ctx] = canvas(S, S), R = S / 2;
  ctx.translate(R, R);
  ctx.fillStyle = "#111"; ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fill();
  const scale = R / 225; // reale mm: Doppel außen 170, Board 225
  const ring = (r1: number, r2: number, a1: number, a2: number, col: string) => {
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(0, 0, r1 * scale, a1, a2); ctx.arc(0, 0, r2 * scale, a2, a1, true); ctx.closePath(); ctx.fill();
  };
  for (let i = 0; i < 20; i++) {
    const a1 = ((i * 18 - 9 - 90) * Math.PI) / 180, a2 = a1 + (18 * Math.PI) / 180;
    const dark = i % 2 === 0;
    ring(170, 0, a1, a2, dark ? "#1b1b1b" : "#efe0bd");
    ring(170, 162, a1, a2, dark ? "#c8282b" : "#178a49");
    ring(107, 99, a1, a2, dark ? "#c8282b" : "#178a49");
  }
  ctx.fillStyle = "#178a49"; ctx.beginPath(); ctx.arc(0, 0, 16 * scale, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#c8282b"; ctx.beginPath(); ctx.arc(0, 0, 6.35 * scale, 0, Math.PI * 2); ctx.fill();
  // Drähte
  ctx.strokeStyle = "#cfd3da"; ctx.lineWidth = 2.2;
  for (const r of [170, 162, 107, 99, 16, 6.35]) { ctx.beginPath(); ctx.arc(0, 0, r * scale, 0, Math.PI * 2); ctx.stroke(); }
  for (let i = 0; i < 20; i++) {
    const a = ((i * 18 - 9 - 90) * Math.PI) / 180;
    ctx.beginPath(); ctx.moveTo(Math.cos(a) * 16 * scale, Math.sin(a) * 16 * scale); ctx.lineTo(Math.cos(a) * 170 * scale, Math.sin(a) * 170 * scale); ctx.stroke();
  }
  // Zahlenring
  ctx.fillStyle = "#f4f4f6"; ctx.font = `700 ${Math.round(40)}px ${f.display}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  NUMBERS.forEach((n, i) => {
    const a = ((i * 18 - 90) * Math.PI) / 180, r = 196 * scale;
    ctx.save(); ctx.translate(Math.cos(a) * r, Math.sin(a) * r); ctx.rotate(a + Math.PI / 2); ctx.fillText(String(n), 0, 0); ctx.restore();
  });
  ctx.strokeStyle = "#cfd3da"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 180 * scale, 0, Math.PI * 2); ctx.stroke();
  // Sisal-Körnung
  ctx.globalAlpha = 0.07;
  for (let k = 0; k < 9000; k++) { const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * 170 * scale; ctx.fillStyle = Math.random() < 0.5 ? "#000" : "#fff"; ctx.fillRect(Math.cos(a) * r, Math.sin(a) * r, 2, 2); }
  ctx.globalAlpha = 1;
  return tex(c);
}

// ---------------- Böden und Wände ----------------
function noise(ctx: CanvasRenderingContext2D, w: number, h: number, n: number, alpha: number) {
  ctx.globalAlpha = alpha;
  for (let k = 0; k < n; k++) { ctx.fillStyle = Math.random() < 0.5 ? "#000" : "#fff"; ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
  ctx.globalAlpha = 1;
}
export function woodTexture(base: string) {
  const [c, ctx] = canvas(512, 512);
  for (let i = 0; i < 8; i++) {
    const col = shade(base, (Math.random() - 0.5) * 0.18);
    ctx.fillStyle = col; ctx.fillRect(0, i * 64, 512, 64);
    // Maserung
    ctx.strokeStyle = shade(col, -0.18); ctx.globalAlpha = 0.35; ctx.lineWidth = 1.5;
    for (let k = 0; k < 6; k++) { ctx.beginPath(); const y = i * 64 + 6 + Math.random() * 52; ctx.moveTo(0, y); for (let x = 0; x <= 512; x += 32) ctx.lineTo(x, y + Math.sin(x / 40 + k) * 2.5); ctx.stroke(); }
    ctx.globalAlpha = 1;
    ctx.fillStyle = shade(base, -0.45); ctx.fillRect(0, i * 64, 512, 2);
    const cut = Math.random() * 512; ctx.fillRect(cut, i * 64, 2, 64);
  }
  return tex(c, [2, 2]);
}
export function tileTexture(a: string, b: string) {
  const [c, ctx] = canvas(256, 256);
  for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) { ctx.fillStyle = (x + y) % 2 ? a : b; ctx.fillRect(x * 128, y * 128, 128, 128); }
  ctx.strokeStyle = shade(a, -0.4); ctx.lineWidth = 3; for (let i = 0; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * 128, 0); ctx.lineTo(i * 128, 256); ctx.moveTo(0, i * 128); ctx.lineTo(256, i * 128); ctx.stroke(); }
  noise(ctx, 256, 256, 2500, 0.05);
  return tex(c, [4, 4]);
}
export function concreteTexture() {
  const [c, ctx] = canvas(512, 512);
  ctx.fillStyle = "#8b8781"; ctx.fillRect(0, 0, 512, 512);
  for (let k = 0; k < 60; k++) { ctx.globalAlpha = 0.06; ctx.fillStyle = Math.random() < 0.5 ? "#5b5751" : "#b4afa8"; ctx.beginPath(); ctx.arc(Math.random() * 512, Math.random() * 512, 20 + Math.random() * 60, 0, Math.PI * 2); ctx.fill(); }
  noise(ctx, 512, 512, 14000, 0.08);
  ctx.globalAlpha = 0.4; ctx.strokeStyle = "#55514c"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(256, 0); ctx.lineTo(256, 512); ctx.moveTo(0, 256); ctx.lineTo(512, 256); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(90, 300); ctx.lineTo(130, 320); ctx.lineTo(150, 312); ctx.lineTo(190, 340); ctx.stroke(); ctx.globalAlpha = 1;
  return tex(c, [2, 2]);
}
export function brickTexture() {
  const [c, ctx] = canvas(512, 512);
  ctx.fillStyle = "#6f6a64"; ctx.fillRect(0, 0, 512, 512);
  const bh = 32, bw = 96;
  for (let row = 0; row < 16; row++) for (let i = -1; i < 7; i++) {
    const x = i * bw + (row % 2) * (bw / 2), y = row * bh;
    ctx.fillStyle = shade("#8e8a84", (Math.random() - 0.5) * 0.14); ctx.fillRect(x + 3, y + 3, bw - 6, bh - 6);
  }
  noise(ctx, 512, 512, 9000, 0.07);
  return tex(c, [3, 1.5]);
}
export function panelTexture(base: string, line: string) {
  const [c, ctx] = canvas(256, 256);
  ctx.fillStyle = base; ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 4; i++) { ctx.fillStyle = shade(base, (i % 2 ? 0.03 : -0.03)); ctx.fillRect(i * 64, 0, 64, 256); ctx.fillStyle = line; ctx.fillRect(i * 64, 0, 3, 256); }
  noise(ctx, 256, 256, 1500, 0.04);
  return tex(c, [8, 1]);
}
export function foamTexture(base: string) {
  const [c, ctx] = canvas(256, 256);
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
    const g = ctx.createLinearGradient(x * 64, y * 64, x * 64 + ((x + y) % 2 ? 64 : 0), y * 64 + ((x + y) % 2 ? 0 : 64));
    g.addColorStop(0, shade(base, 0.12)); g.addColorStop(1, shade(base, -0.25));
    ctx.fillStyle = g; ctx.fillRect(x * 64, y * 64, 64, 64);
    ctx.strokeStyle = shade(base, -0.5); ctx.strokeRect(x * 64, y * 64, 64, 64);
  }
  return tex(c, [6, 2]);
}

// ---------------- Schilder ----------------
export function signTexture(draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void, w = 512, h = 256) {
  const [c, ctx] = canvas(w, h);
  draw(ctx, w, h);
  return tex(c);
}
export function neonText(text: string, color: string, color2?: string, split?: number, w = 1024, h = 320) {
  const f = fonts();
  return signTexture((ctx) => {
    ctx.font = `${h * 0.62}px ${f.script}`; ctx.textAlign = "left"; ctx.textBaseline = "middle";
    const a = split ? text.slice(0, split) : text, b = split ? text.slice(split) : "";
    const wa = ctx.measureText(a).width, wb = b ? ctx.measureText(b).width : 0;
    let x = (w - wa - wb) / 2;
    for (const [t, col] of [[a, color], [b, color2 ?? color]] as const) {
      if (!t) continue;
      for (const blur of [40, 18, 6]) { ctx.shadowColor = col; ctx.shadowBlur = blur; ctx.fillStyle = col; ctx.fillText(t, x, h / 2); }
      ctx.shadowBlur = 0; ctx.fillStyle = "#fff"; ctx.globalAlpha = 0.55; ctx.fillText(t, x, h / 2); ctx.globalAlpha = 1;
      x += ctx.measureText(t).width;
    }
  }, w, h);
}
export { FONT_DISPLAY };
