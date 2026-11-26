"use client";
// Ganzkörper-Figur im Comic-Stil mit Umrissen und Schattierung.
// Nullpunkt = zwischen den Füßen. Kopf oben bei etwa y = -104.
import { HAIR_COLORS, PANTS, SHOES, SKIN_TONES, type Jersey, type Look } from "@/lib/dartraum/catalog";
import { Dart } from "./Dart";

export type Pose = "stand" | "walk" | "throw" | "sit" | "drink";
const OUT = "#1a1222";
const PINK = "#d63ce0", CYAN = "#5fe3f0", GOLD = "#e8c25a";

/** Farbe heller (amt > 0) oder dunkler (amt < 0) machen */
export function shade(hex: string, amt: number): string {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const f = (c: number) => Math.round(amt >= 0 ? c + (255 - c) * amt : c * (1 + amt));
  r = f(r); g = f(g); b = f(b);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}
const isLight = (hex: string) => {
  const n = parseInt(hex.replace("#", ""), 16);
  return ((n >> 16) & 255) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114 > 160;
};

const TORSO = "M-16 -76 C-8 -79.5 8 -79.5 16 -76 L18.5 -41 Q0 -37.5 -18.5 -41 Z";

// ---------------- Trikot-Muster ----------------
function JerseyPattern({ j, uid, back }: { j: Jersey; uid: string; back: boolean }) {
  const { primary: p, secondary: s, accent: a } = j;
  const base = <rect x="-30" y="-84" width="60" height="50" fill={p} />;
  const hem = <rect x="-30" y="-44" width="60" height="4" fill={s} />;
  switch (j.design) {
    case "panels": return <>{base}
      <path d="M-30 -84 L-12 -66 L-11 -34 L-30 -34 Z" fill={s} /><path d="M30 -84 L12 -66 L11 -34 L30 -34 Z" fill={s} />
      <path d="M-12 -66 L-11 -34 M12 -66 L11 -34" stroke={a} strokeWidth="1.3" /></>;
    case "flames": return <>{base}
      <path d="M-30 -34 L-30 -50 C-24 -46 -26 -56 -20 -62 C-20 -54 -14 -52 -12 -58 C-10 -50 -6 -48 -4 -64 C0 -56 4 -52 6 -60 C8 -52 12 -50 14 -58 C16 -50 22 -48 20 -64 C26 -56 30 -52 30 -50 L30 -34 Z" fill={s} />
      <path d="M-30 -34 L-30 -44 C-24 -42 -24 -48 -18 -52 C-18 -46 -12 -44 -10 -48 C-8 -42 -2 -42 0 -52 C2 -44 6 -42 8 -48 C10 -42 16 -42 16 -50 C22 -44 26 -42 30 -44 L30 -34 Z" fill={a} /></>;
    case "bolts": return <>{base}
      <path d="M-30 -60 L-6 -68 L-8 -60 L14 -68 L11 -58 L30 -64 L30 -54 L8 -47 L11 -56 L-10 -49 L-8 -57 L-30 -50 Z" fill={s} stroke={a} strokeWidth="1.2" strokeLinejoin="round" />{hem}</>;
    case "shards": return <>{base}
      <path d="M-30 -84 L-8 -84 L-22 -60 Z" fill={s} /><path d="M-22 -60 L-6 -50 L-26 -40 Z" fill={a} /><path d="M30 -70 L8 -56 L30 -48 Z" fill={s} />
      <path d="M2 -84 L16 -84 L6 -70 Z" fill={a} /><path d="M-4 -40 L10 -48 L18 -34 Z" fill={s} /><path d="M-14 -72 L-4 -64 L-14 -58 Z" fill={a} opacity=".7" /></>;
    case "diagonal": return <>{base}
      <path d={back ? "M30 -84 L16 -84 L-30 -42 L-30 -30 Z" : "M-30 -84 L-16 -84 L30 -42 L30 -30 Z"} fill={s} />
      <path d={back ? "M17 -84 L-30 -41 M30 -71 L-17 -30" : "M-17 -84 L30 -41 M-30 -71 L17 -30"} stroke={a} strokeWidth="1.4" /></>;
    case "fade": return <>
      <defs><linearGradient id={`fd${uid}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={p} /><stop offset="1" stopColor={s} /></linearGradient></defs>
      <rect x="-30" y="-84" width="60" height="50" fill={`url(#fd${uid})`} />
      {Array.from({ length: 6 }, (_, row) => Array.from({ length: 12 }, (_, i) => <circle key={`${row}-${i}`} cx={-27 + i * 5 + (row % 2) * 2.5} cy={-44 - row * 4} r={1.5 - row * 0.22} fill={a} opacity=".8" />))}</>;
    case "camo": return <>{base}
      {[[-14, -70, 8, 5, 20], [8, -62, 9, 5, -30], [-6, -50, 10, 4, 10], [14, -46, 7, 4, 40], [-20, -48, 6, 4, -20], [4, -76, 6, 3, 0]].map(([x, y, rx, ry, rot], i) =>
        <ellipse key={i} cx={x} cy={y} rx={rx} ry={ry} transform={`rotate(${rot} ${x} ${y})`} fill={i % 2 ? a : s} />)}
      {[[-2, -64, 5, 3, 30], [18, -70, 5, 3, 0], [-18, -60, 4, 3, 60]].map(([x, y, rx, ry, rot], i) =>
        <ellipse key={"b" + i} cx={x} cy={y} rx={rx} ry={ry} transform={`rotate(${rot} ${x} ${y})`} fill={shade(p, -0.35)} />)}</>;
    case "checker": return <>{base}
      {Array.from({ length: 3 }, (_, row) => Array.from({ length: 16 }, (_, i) => <rect key={`${row}-${i}`} x={-30 + i * 3.8} y={-66 + row * 3.8} width="3.8" height="3.8" fill={(i + row) % 2 ? s : a} />))}
      {hem}</>;
    case "waves": return <>{base}
      <path d="M-30 -56 C-20 -68 -10 -44 0 -58 C10 -72 20 -46 30 -60 L30 -52 C20 -38 10 -64 0 -50 C-10 -36 -20 -60 -30 -48 Z" fill={s} />
      <path d="M-30 -46 C-20 -58 -10 -36 0 -48 C10 -60 20 -38 30 -50" fill="none" stroke={a} strokeWidth="1.6" />{hem}</>;
    case "club26": return <>{base}
      <rect x="-30" y="-46" width="60" height="6" fill={s} /><rect x="-30" y="-47" width="60" height="1" fill={a} />
      {!back && <text x="-7" y="-55" textAnchor="middle" fontSize="8.5" fontFamily="var(--font-kaushan), cursive" fill="#fff">Club26</text>}</>;
    case "club26neon": return <>{base}
      <path d="M-30 -62 L30 -72" stroke={s} strokeWidth="2.2" style={{ filter: `drop-shadow(0 0 2px ${s})` }} />
      <path d="M-30 -46 L30 -56" stroke={a} strokeWidth="2.2" style={{ filter: `drop-shadow(0 0 2px ${a})` }} />
      {!back && <text x="0" y="-54" textAnchor="middle" fontSize="11" fontFamily="var(--font-kaushan), cursive" fill={s} style={{ filter: `drop-shadow(0 0 2px ${s})` }}>26</text>}</>;
    default: return <>{base}{hem}</>;
  }
}
const sleeveColor = (j: Jersey) => (j.design === "panels" || j.design === "club26neon" ? j.secondary : j.primary);

// ---------------- Kopf ----------------
function HairBack({ id, c }: { id: string; c: string }) {
  if (id === "long") return <path d="M-15 -92 C-17 -107 17 -107 15 -92 L16.5 -71 C10 -67 -10 -67 -16.5 -71 Z" fill={c} stroke={OUT} strokeWidth="1" />;
  if (id === "ponytail") return <path d="M10 -96 C20 -96 20 -84 16 -74 C14 -70 12 -74 13 -78 C14 -84 12 -90 10 -92 Z" fill={c} stroke={OUT} strokeWidth="1" />;
  return null;
}
function HairFront({ id, c }: { id: string; c: string }) {
  const hl = shade(c, 0.35);
  const st = { stroke: OUT, strokeWidth: 1, strokeLinejoin: "round" as const };
  switch (id) {
    case "bald": return <ellipse cx="-4" cy="-99" rx="5" ry="2" fill="#fff" opacity=".35" />;
    case "buzz": return <path d="M-13.5 -90 C-15 -103 15 -103 13.5 -90 C12 -96 7 -98.5 0 -98.5 C-7 -98.5 -12 -96 -13.5 -90 Z" fill={c} opacity=".7" />;
    case "fade": return <g><path d="M-13.5 -89 C-15 -96 -14 -100 -12 -101 L12 -101 C14 -100 15 -96 13.5 -89 C12 -94 -12 -94 -13.5 -89 Z" fill={c} opacity=".45" /><path d="M-12 -97 C-13 -106 13 -106 12 -97 C8 -100 -8 -100 -12 -97 Z" fill={c} {...st} /><path d="M-5 -102 C-2 -104 3 -104 6 -102" stroke={hl} strokeWidth="1.2" fill="none" /></g>;
    case "quiff": return <g><path d="M-13.5 -89 C-15.5 -100 -9 -104 -3 -104 C0 -111 12 -112 15 -103 C16 -98 14.5 -93 13.5 -89 C12 -95 6 -97.5 0 -97.5 C-6 -97.5 -11 -95 -13.5 -89 Z" fill={c} {...st} /><path d="M-1 -104 C3 -108 9 -108 12 -104" stroke={hl} strokeWidth="1.3" fill="none" /></g>;
    case "side": return <g><path d="M-13.5 -88 C-15.5 -102 -4 -106.5 4 -105 C11 -104 15.5 -98 13.5 -88 C12.5 -93 10 -96.5 5 -96.5 C1 -96 -3 -99.5 -8 -97 C-11 -95 -13 -92 -13.5 -88 Z" fill={c} {...st} /><path d="M-4 -105 L-3 -99" stroke={shade(c, -0.4)} strokeWidth="1" /><path d="M2 -103 C6 -103 10 -101 11 -98" stroke={hl} strokeWidth="1.2" fill="none" /></g>;
    case "curly": return <g fill={c} stroke={OUT} strokeWidth=".9">{[[-12, -92], [-11, -99], [-6, -103], [0, -105], [6, -103], [11, -99], [12, -92], [-3, -99], [4, -99]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="5" />)}</g>;
    case "long": return <g><path d="M-14 -88 C-16 -103 16 -103 14 -88 C12 -96 6 -99 0 -97 C-6 -99 -12 -96 -14 -88 Z" fill={c} {...st} /><path d="M-4 -101 C0 -103 5 -102 8 -100" stroke={hl} strokeWidth="1.2" fill="none" /></g>;
    case "ponytail": return <g><path d="M-13.5 -89 C-15 -103 15 -103 13.5 -89 C12 -96 6 -98.5 0 -98.5 C-6 -98.5 -12 -96 -13.5 -89 Z" fill={c} {...st} /><path d="M-5 -101 C-1 -103 4 -103 7 -101" stroke={hl} strokeWidth="1.2" fill="none" /></g>;
    case "bun": return <g><circle cx="0" cy="-106" r="5.5" fill={c} stroke={OUT} strokeWidth="1" /><path d="M-13.5 -89 C-15 -103 15 -103 13.5 -89 C12 -96 6 -98.5 0 -98.5 C-6 -98.5 -12 -96 -13.5 -89 Z" fill={c} {...st} /></g>;
    case "mohawk": return <g><path d="M-13.5 -90 C-15 -102 15 -102 13.5 -90 C12 -96 -12 -96 -13.5 -90 Z" fill={c} opacity=".4" /><path d="M-4.5 -97 L-3.5 -110 L0 -114 L3.5 -110 L4.5 -97 Z" fill={c} {...st} /><path d="M-1 -110 L0 -112" stroke={hl} strokeWidth="1.2" /></g>;
    case "slick": return <g><path d="M-13.5 -90 C-14.5 -104 14.5 -104 13.5 -90 C11 -97 -11 -97 -13.5 -90 Z" fill={c} {...st} />{[-6, -1, 4].map((x) => <path key={x} d={`M${x} -97 C${x + 1} -101 ${x + 3} -102 ${x + 5} -102`} stroke={hl} strokeWidth=".9" fill="none" />)}</g>;
    default: return <g><path d="M-13.5 -89 C-15.5 -103 -6 -106 1 -105.5 C9 -105.5 15.5 -100 13.5 -89 C12.5 -95 9 -98 4 -97.5 C-1 -99.5 -8 -98.5 -11 -95 Z" fill={c} {...st} /><path d="M-3 -103 C1 -104.5 6 -104 9 -101" stroke={hl} strokeWidth="1.2" fill="none" /></g>;
  }
}
function HairFromBehind({ id, c }: { id: string; c: string }) {
  const st = { stroke: OUT, strokeWidth: 1 };
  if (id === "bald") return <ellipse cx="-3" cy="-99" rx="5" ry="2" fill="#fff" opacity=".3" />;
  if (id === "buzz" || id === "fade") return <path d="M-13.5 -90 C-15 -104 15 -104 13.5 -90 C13 -84 9 -81 0 -81 C-9 -81 -13 -84 -13.5 -90 Z" fill={c} opacity={id === "buzz" ? 0.7 : 0.55} />;
  const cap = <path d="M-14 -90 C-15.5 -105 15.5 -105 14 -90 C13.5 -84 9 -80 0 -80 C-9 -80 -13.5 -84 -14 -90 Z" fill={c} {...st} />;
  if (id === "long") return <path d="M-15 -92 C-17 -107 17 -107 15 -92 L16.5 -70 C10 -66 -10 -66 -16.5 -70 Z" fill={c} {...st} />;
  if (id === "ponytail") return <g>{cap}<path d="M-3 -88 C-5 -78 -3 -70 0 -66 C3 -70 5 -78 3 -88 Z" fill={c} {...st} /><rect x="-3" y="-89" width="6" height="2.5" rx="1" fill={PINK} /></g>;
  if (id === "bun") return <g>{cap}<circle cx="0" cy="-100" r="5.5" fill={c} {...st} /></g>;
  if (id === "mohawk") return <g><path d="M-13.5 -90 C-15 -102 15 -102 13.5 -90 C13 -84 -13 -84 -13.5 -90 Z" fill={c} opacity=".4" /><path d="M-4 -82 L-4.5 -104 L0 -112 L4.5 -104 L4 -82 Z" fill={c} {...st} /></g>;
  if (id === "curly") return <g fill={c} stroke={OUT} strokeWidth=".9">{[[-11, -88], [-12, -96], [-6, -102], [0, -104], [6, -102], [12, -96], [11, -88], [-5, -88], [5, -88], [0, -95], [-6, -95], [6, -95], [0, -84]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="5" />)}</g>;
  return cap;
}
function Beard({ id, c }: { id: string; c: string }) {
  switch (id) {
    case "stubble": return <path d="M-12.5 -89 C-12 -81 -6 -76.5 0 -76.5 C6 -76.5 12 -81 12.5 -89 C10 -83 6 -81 0 -81 C-6 -81 -10 -83 -12.5 -89 Z" fill={c} opacity=".35" />;
    case "mustache": return <path d="M-5.5 -85 C-3 -87.5 -1 -87 0 -86 C1 -87 3 -87.5 5.5 -85 C3 -84.5 1 -85 0 -85.3 C-1 -85 -3 -84.5 -5.5 -85 Z" fill={c} stroke={OUT} strokeWidth=".6" />;
    case "goatee": return <g fill={c} stroke={OUT} strokeWidth=".6"><path d="M-5 -85 C-2.5 -87 2.5 -87 5 -85 C2 -84.6 -2 -84.6 -5 -85 Z" /><path d="M-3.5 -81 C-3 -76.5 3 -76.5 3.5 -81 C1.5 -80 -1.5 -80 -3.5 -81 Z" /></g>;
    case "chin": return <path d="M-4 -80.5 C-3.5 -75 3.5 -75 4 -80.5 C2 -79.5 -2 -79.5 -4 -80.5 Z" fill={c} stroke={OUT} strokeWidth=".6" />;
    case "full": return <path d="M-13 -91 C-13.5 -80 -7 -74 0 -74 C7 -74 13.5 -80 13 -91 C11 -86 8 -86.5 5.5 -85 C3 -87.5 -3 -87.5 -5.5 -85 C-8 -86.5 -11 -86 -13 -91 Z M-3.5 -83 Q0 -80.5 3.5 -83 Q0 -82 -3.5 -83 Z" fill={c} stroke={OUT} strokeWidth=".8" fillRule="evenodd" />;
    default: return null;
  }
}
function Glasses({ id, uid }: { id: string; uid: string }) {
  if (id === "round") return <g fill="none" stroke={OUT} strokeWidth="1.1"><circle cx="-5" cy="-91" r="3.8" /><circle cx="5" cy="-91" r="3.8" /><path d="M-1.2 -91.5 Q0 -92.5 1.2 -91.5 M-8.8 -91.5 L-13 -92.5 M8.8 -91.5 L13 -92.5" /></g>;
  if (id === "square") return <g fill="none" stroke={OUT} strokeWidth="1.3"><rect x="-9.5" y="-94" width="8" height="6" rx="1" /><rect x="1.5" y="-94" width="8" height="6" rx="1" /><path d="M-1.5 -92 H1.5 M-9.5 -92 L-13 -93 M9.5 -92 L13 -93" /></g>;
  if (id === "sun") return <g><path d="M-10 -94.5 H-1 V-90 Q-1.5 -86.5 -5.5 -86.5 Q-9.5 -86.5 -10 -90 Z M1 -94.5 H10 V-90 Q9.5 -86.5 5.5 -86.5 Q1.5 -86.5 1 -90 Z" fill="#141018" stroke={OUT} strokeWidth=".8" /><path d="M-1 -93.5 H1 M-10 -93.5 L-13 -94 M10 -93.5 L13 -94" stroke={OUT} strokeWidth="1.1" /><path d="M-8.5 -93 L-6 -93" stroke="#fff" strokeWidth=".8" opacity=".6" /></g>;
  if (id === "neon") return <g style={{ filter: `drop-shadow(0 0 1.5px ${PINK})` }}><defs><linearGradient id={`ng${uid}`} x1="0" x2="1"><stop offset="0" stopColor={PINK} /><stop offset="1" stopColor={CYAN} /></linearGradient></defs><path d="M-12 -95 H12 L11 -89.5 Q9.5 -87 6 -87.5 L2.5 -90.5 H-2.5 L-6 -87.5 Q-9.5 -87 -11 -89.5 Z" fill={`url(#ng${uid})`} stroke={OUT} strokeWidth=".7" /></g>;
  return null;
}
function Hat({ id, c, back, uid }: { id: string; c: string; back: boolean; uid: string }) {
  const st = { stroke: OUT, strokeWidth: 1, strokeLinejoin: "round" as const };
  const dark = shade(c, -0.3);
  switch (id) {
    case "cap": return back
      ? <g><path d="M-14.5 -93 C-15 -108 15 -108 14.5 -93 Z" fill={c} {...st} /><path d="M-4 -95 H4 V-93 H-4 Z" fill={dark} /><path d="M-4 -96 Q0 -99 4 -96" stroke={OUT} fill="none" strokeWidth=".8" /></g>
      : <g><path d="M-14.5 -94 C-15 -109 15 -109 14.5 -94 Z" fill={c} {...st} /><path d="M-15 -94 C-6 -97 14 -97 22 -92 C14 -89 -6 -89.5 -15 -91.5 Z" fill={dark} {...st} /><circle cx="0" cy="-106.5" r="1.4" fill={dark} /><text x="0" y="-98" textAnchor="middle" fontSize="5" fontFamily="var(--font-kaushan), cursive" fill="#fff">26</text></g>;
    case "capback": return back
      ? <g><path d="M-14.5 -94 C-15 -109 15 -109 14.5 -94 Z" fill={c} {...st} /><path d="M-12 -94 C-6 -96.5 6 -96.5 12 -94 L13 -90 C6 -88 -6 -88 -13 -90 Z" fill={dark} {...st} /></g>
      : <g><path d="M-14.5 -94 C-15 -109 15 -109 14.5 -94 Z" fill={c} {...st} /><path d="M-5 -96 H5 V-94 H-5 Z" fill={dark} /><path d="M-14.5 -94 H14.5" stroke={OUT} strokeWidth="1" /></g>;
    case "beanie": return <g><path d="M-14.5 -94 C-15.5 -112 15.5 -112 14.5 -94 Z" fill={c} {...st} /><rect x="-15" y="-97" width="30" height="5.5" rx="2" fill={dark} {...st} />{[-9, -4, 1, 6, 11].map((x) => <path key={x} d={`M${x} -96.5 v4.5`} stroke={shade(c, -0.5)} strokeWidth=".7" />)}<circle cx="0" cy="-110" r="3.4" fill="#f4f4f6" {...st} /></g>;
    case "headband": return <g><path d="M-14 -97 C-8 -100 8 -100 14 -97 L14 -94 C8 -97 -8 -97 -14 -94 Z" fill={c} {...st} />{!back && <text x="0" y="-95.3" textAnchor="middle" fontSize="2.8" fontWeight="700" fontFamily="var(--font-oswald), sans-serif" fill="#fff">SCORE26</text>}</g>;
    case "crown": return <g><defs><linearGradient id={`cg${uid}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff1b8" /><stop offset=".5" stopColor={GOLD} /><stop offset="1" stopColor="#a87b1c" /></linearGradient></defs><path d="M-11 -99 L-12 -112 L-6 -106 L0 -115 L6 -106 L12 -112 L11 -99 Z" fill={`url(#cg${uid})`} {...st} /><circle cx="0" cy="-103" r="1.6" fill={PINK} /><circle cx="-6.5" cy="-102" r="1.1" fill={CYAN} /><circle cx="6.5" cy="-102" r="1.1" fill={CYAN} /></g>;
    default: return null;
  }
}

// ---------------- Figur ----------------
export function Figure({ look, name = "", view = "front", mirror = false, pose = "stand", phase = 0, uid, holdDart = true }: {
  look: Look; name?: string; view?: "front" | "back"; mirror?: boolean; pose?: Pose; phase?: number; uid: string; holdDart?: boolean;
}) {
  const skin = SKIN_TONES[look.skin] ?? SKIN_TONES[1];
  const skinD = shade(skin, -0.18);
  const hair = HAIR_COLORS[look.hairColor] ?? HAIR_COLORS[1];
  const pants = PANTS.find((x) => x.id === look.pants) ?? PANTS[0];
  const shoes = SHOES.find((x) => x.id === look.shoes) ?? SHOES[0];
  const j = look.jersey;
  const back = view === "back";
  const walk = pose === "walk" ? Math.sin(phase * Math.PI * 2) : 0;
  const bob = pose === "walk" ? -Math.abs(walk) * 1.6 : 0;
  const sit = pose === "sit";
  const drop = sit ? 15 : 0;
  const shown = (name || look.backName || "").toUpperCase().slice(0, 12);

  // Wurfarm (rechts in Rückansicht): Winkel 0 = hängt, 180 = senkrecht hoch
  let throwAngle = 0;
  if (pose === "throw") {
    if (phase < 0.55) throwAngle = 160 + Math.sin(phase * 18) * 2;
    else if (phase < 0.7) throwAngle = 160 - ((phase - 0.55) / 0.15) * 32;
    else throwAngle = 128 - ((phase - 0.7) / 0.3) * 100;
  }
  const drinkAngle = pose === "drink" ? 120 + Math.sin(phase * Math.PI * 2) * 15 : 0;

  const sleeve = sleeveColor(j);
  const arm = (side: -1 | 1, angle: number, holding = false) => (
    <g transform={`translate(${side * 16} -74) rotate(${-side * angle})`}>
      <path d={`M${-3.5 * side} -1 L${-4.5 * side} 13 L${3.5 * side} 14 L${4 * side} 0 Z`} fill={sleeve} stroke={OUT} strokeWidth="1" strokeLinejoin="round" />
      <path d={`M${-4.3 * side} 11 L${3.6 * side} 12`} stroke={j.accent} strokeWidth="1.6" />
      <rect x="-3" y="13" width="6" height="16" rx="3" fill={skin} stroke={OUT} strokeWidth="1" />
      <rect x={side > 0 ? 0.6 : -3} y="14" width="2.4" height="14" rx="1.2" fill={skinD} opacity=".5" />
      <circle cx="0" cy="30" r="3.7" fill={skin} stroke={OUT} strokeWidth="1" />
      {holding && <g transform="translate(0 31) rotate(90) scale(0.2) translate(-60 0)"><Dart setup={look.darts} uid={`h${uid}`} /></g>}
      {pose === "drink" && side === 1 && <g transform="translate(0 31)"><rect x="-3" y="-9" width="6" height="9" rx="1" fill="#ffd23f" stroke={OUT} strokeWidth=".8" /><rect x="-3" y="-9" width="6" height="2" fill="#fff" /></g>}
    </g>
  );

  const leg = (side: -1 | 1, off: number) => {
    const x0 = side < 0 ? -12.5 : 1.2;
    return (
      <g transform={`translate(${side * off * 2.2} ${off * side < 0 ? 0 : -Math.abs(off) * 1.8})`}>
        <path d={`M${x0} -43 L${x0 + 11.3} -43 L${x0 + 10.6} -6 L${x0 + 0.8} -6 Z`} fill={pants.color} stroke={OUT} strokeWidth="1" strokeLinejoin="round" />
        <path d={`M${side < 0 ? x0 + 1.5 : x0 + 8} -40 L${side < 0 ? x0 + 2 : x0 + 8.5} -8`} stroke={pants.detail} strokeWidth="1.2" opacity=".7" />
        {shoe(side, side < 0 ? -7 : 6.3, back)}
      </g>
    );
  };
  const shoe = (side: -1 | 1, x: number, b: boolean) => (
    <g transform={`translate(${x} 0)`}>
      <path d={b ? "M-6.5 -7 H6.5 V-1.5 Q0 0.5 -6.5 -1.5 Z" : `M-6.5 -7.5 H5 Q8.5 -7 8.5 -3 V-1 H-6.5 Z`} transform={side < 0 && !b ? "scale(-1 1)" : undefined} fill={shoes.upper} stroke={OUT} strokeWidth="1" strokeLinejoin="round" />
      <rect x="-6.8" y="-2" width="13.8" height="2.6" rx="1" fill={shoes.sole} stroke={OUT} strokeWidth=".8" transform={side < 0 && !b ? "scale(-1 1)" : undefined} />
      {!b && <path d="M-3 -5 Q0 -3 4 -5.5" stroke={shoes.accent} strokeWidth="1.3" fill="none" transform={side < 0 ? "scale(-1 1)" : undefined} />}
    </g>
  );

  const legs = sit ? (
    <g>
      {[-1, 1].map((side) => {
        const x0 = side < 0 ? -12.5 : 1.2;
        return (
          <g key={side}>
            <path d={`M${x0} -28 L${x0 + 11.3} -28 L${x0 + 11.6} -19 L${x0 - 0.3} -19 Z`} fill={shade(pants.color, 0.12)} stroke={OUT} strokeWidth="1" />
            <path d={`M${x0 + 0.3} -20 L${x0 + 11} -20 L${x0 + 10.6} -6 L${x0 + 0.8} -6 Z`} fill={pants.color} stroke={OUT} strokeWidth="1" />
            {shoe(side as -1 | 1, side < 0 ? -7 : 6.3, false)}
          </g>
        );
      })}
    </g>
  ) : (
    <g>{leg(-1, walk)}{leg(1, -walk)}</g>
  );

  const textColor = isLight(j.primary) ? "#15101c" : "#ffffff";
  const nameFont = shown.length <= 4 ? 9.5 : shown.length <= 7 ? 8.5 : 7.5;
  // Name immer auf Rückenbreite stauchen, wie aufgedruckte Trikotbuchstaben
  const nameWidth = Math.min(19, shown.length * nameFont * 0.52);

  return (
    <g transform={mirror ? "scale(-1 1)" : undefined}>
      <defs>
        <clipPath id={`tc${uid}`}><path d={TORSO} /></clipPath>
        <linearGradient id={`ts${uid}`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#000" stopOpacity=".22" /><stop offset=".25" stopColor="#000" stopOpacity="0" /><stop offset=".7" stopColor="#fff" stopOpacity=".06" /><stop offset="1" stopColor="#000" stopOpacity=".25" /></linearGradient>
      </defs>
      <ellipse cx="0" cy="0" rx="17" ry="6" fill="#000" opacity=".28" />
      {legs}
      <g transform={`translate(0 ${bob + drop})`}>
        {!back && <HairBack id={look.hair} c={hair} />}
        {/* hinterer Arm */}
        {back ? arm(-1, pose === "walk" ? -walk * 22 : 4) : arm(-1, pose === "walk" ? walk * 22 : 4)}
        {/* Trikot */}
        <path d={TORSO} fill={j.primary} />
        <g clipPath={`url(#tc${uid})`}>
          <JerseyPattern j={j} uid={uid} back={back} />
          <rect x="-30" y="-84" width="60" height="50" fill={`url(#ts${uid})`} />
          {/* Sponsoren */}
          {j.sponsors && !back && (
            <g>
              <rect x="4" y="-71" width="11" height="5" rx="1" fill="#fff" stroke={OUT} strokeWidth=".5" />
              <text x="9.5" y="-67.6" textAnchor="middle" fontSize="3" fontWeight="700" fontFamily="var(--font-oswald), sans-serif" fill="#15101c">SCORE26</text>
              <circle cx="-9" cy="-68.5" r="3" fill={j.accent} stroke={OUT} strokeWidth=".5" />
              <text x="-9" y="-67.3" textAnchor="middle" fontSize="3" fontFamily="var(--font-kaushan), cursive" fill="#fff">26</text>
            </g>
          )}
          {back && shown && (
            <g>
              <text x="0" y="-62" textAnchor="middle" fontSize={nameFont} textLength={nameWidth} lengthAdjust="spacingAndGlyphs" fontWeight="700" fontFamily="var(--font-oswald), sans-serif"
                fill={textColor} stroke={j.accent} strokeWidth=".5" paintOrder="stroke" transform={mirror ? "scale(-1 1)" : undefined}>{shown}</text>
              {j.sponsors && <g transform={mirror ? "scale(-1 1)" : undefined}><rect x="-9" y="-54" width="18" height="5" rx="1" fill="#fff" opacity=".9" /><text x="0" y="-50.5" textAnchor="middle" fontSize="3.3" fontWeight="700" fontFamily="var(--font-oswald), sans-serif" fill="#15101c">SCORE26</text></g>}
            </g>
          )}
        </g>
        <path d={TORSO} fill="none" stroke={OUT} strokeWidth="1.2" strokeLinejoin="round" />
        {/* Kragen */}
        {back ? (
          <path d="M-8 -77.5 C-4 -79.5 4 -79.5 8 -77.5 L7 -74.5 C3 -76 -3 -76 -7 -74.5 Z" fill={j.collar === "polo" ? j.secondary : shade(j.primary, -0.3)} stroke={OUT} strokeWidth=".9" />
        ) : j.collar === "polo" ? (
          <g>
            <rect x="-1.6" y="-73" width="3.2" height="10" fill={shade(j.primary, -0.15)} stroke={OUT} strokeWidth=".7" />
            <circle cx="0" cy="-69.5" r=".8" fill="#fff" /><circle cx="0" cy="-66" r=".8" fill="#fff" />
            <path d="M-7.5 -78.5 L0 -72 L-1.5 -68 L-9.5 -75 Z" fill={j.secondary} stroke={OUT} strokeWidth=".9" strokeLinejoin="round" />
            <path d="M7.5 -78.5 L0 -72 L1.5 -68 L9.5 -75 Z" fill={j.secondary} stroke={OUT} strokeWidth=".9" strokeLinejoin="round" />
            <path d="M-9 -75.5 L-1.4 -68.8 M9 -75.5 L1.4 -68.8" stroke={j.accent} strokeWidth=".8" />
          </g>
        ) : (
          <path d="M-6 -78 L0 -70 L6 -78" fill={skin} stroke={j.secondary} strokeWidth="1.8" strokeLinejoin="round" />
        )}
        {/* vorderer Arm */}
        {pose === "throw"
          ? arm(1, throwAngle, holdDart && phase < 0.7)
          : pose === "drink" ? arm(1, drinkAngle)
          : back ? arm(1, pose === "walk" ? walk * 22 : 4) : arm(1, pose === "walk" ? -walk * 22 : 4, holdDart && pose !== "sit")}
        {/* Hals */}
        <rect x="-4" y="-81" width="8" height="6" fill={skin} stroke={OUT} strokeWidth=".9" />
        <rect x="-4" y="-79" width="8" height="2.5" fill={skinD} opacity=".55" />
        {/* Kopf */}
        <ellipse cx="-13.5" cy="-89.5" rx="2.6" ry="3.6" fill={skin} stroke={OUT} strokeWidth=".9" />
        <ellipse cx="13.5" cy="-89.5" rx="2.6" ry="3.6" fill={skin} stroke={OUT} strokeWidth=".9" />
        <path d="M-13.3 -91 C-13.3 -104 13.3 -104 13.3 -91 C13.3 -82 7.5 -77 0 -77 C-7.5 -77 -13.3 -82 -13.3 -91 Z" fill={skin} stroke={OUT} strokeWidth="1.1" />
        {back ? (
          <>
            <path d="M-13 -86 C-11 -80 -6 -77.5 0 -77.5 C6 -77.5 11 -80 13 -86" fill="none" stroke={skinD} strokeWidth="2" opacity=".5" />
            <HairFromBehind id={look.hair} c={hair} />
          </>
        ) : (
          <>
            <path d="M8 -84 C10 -86 12 -89 12.5 -92" stroke={skinD} strokeWidth="2.2" fill="none" opacity=".45" strokeLinecap="round" />
            <ellipse cx="-5" cy="-90.8" rx="2.7" ry="3.1" fill="#fff" stroke={OUT} strokeWidth=".6" />
            <ellipse cx="5" cy="-90.8" rx="2.7" ry="3.1" fill="#fff" stroke={OUT} strokeWidth=".6" />
            <circle cx="-4.6" cy="-90.4" r="1.7" fill="#2b1d14" /><circle cx="5.4" cy="-90.4" r="1.7" fill="#2b1d14" />
            <circle cx="-4" cy="-91" r=".6" fill="#fff" /><circle cx="6" cy="-91" r=".6" fill="#fff" />
            <path d="M-8 -95.3 Q-5 -97 -2 -95.6 M2 -95.6 Q5 -97 8 -95.3" stroke={shade(hair, -0.2)} strokeWidth="1.3" fill="none" strokeLinecap="round" />
            <path d="M0 -89 L-1.3 -85.6 Q0 -85 1 -85.4" stroke={skinD} strokeWidth="1" fill="none" strokeLinecap="round" />
            <path d="M-3.6 -82.6 Q0 -80 3.6 -82.6" stroke="#7a2e3e" strokeWidth="1.2" fill="none" strokeLinecap="round" />
            <ellipse cx="-8.5" cy="-85.5" rx="2.3" ry="1.2" fill="#ff7aa8" opacity=".3" /><ellipse cx="8.5" cy="-85.5" rx="2.3" ry="1.2" fill="#ff7aa8" opacity=".3" />
            <Beard id={look.beard} c={hair} />
            <HairFront id={look.hair} c={hair} />
            <Glasses id={look.glasses} uid={uid} />
          </>
        )}
        <Hat id={look.hat} c={look.hatColor} back={back} uid={uid} />
      </g>
    </g>
  );
}

/** Figur einzeln als Bild (Kleiderschrank, Spielerauswahl) */
export function FigureCard({ look, name, size = 160, className = "", view = "front", uid }: { look: Look; name?: string; size?: number; className?: string; view?: "front" | "back"; uid: string }) {
  return (
    <svg viewBox="-32 -120 64 126" width={size} height={size * (126 / 64)} className={className} role="img" aria-label="Spielerfigur">
      <Figure look={look} name={name} view={view} uid={uid} holdDart={false} />
    </svg>
  );
}

