"use client";
// Ein Dartpfeil aus Barrel, Schaft und Flight. Seitenansicht, Spitze zeigt nach rechts.
import { BARREL_FINISH, SHAFT_LENGTHS, type DartSetup } from "@/lib/dartraum/catalog";

const OUT = "#15101c";

function profile(shape: DartSetup["barrel"], t: number): number {
  let r: number;
  switch (shape) {
    case "torpedo": r = 3.0 + 1.9 * Math.pow(t, 0.8); break;
    case "bomb": r = 3.0 + 2.6 * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.05)), 0.9); break;
    case "teardrop": r = 2.7 + 2.9 * Math.pow(t, 2.2); break;
    case "scallop": r = 4.3 - 1.25 * Math.exp(-Math.pow((t - 0.5) / 0.16, 2)); break;
    default: r = 4.2;
  }
  // Übergänge zu Schaft und Spitze abrunden
  const back = Math.min(1, t / 0.07), front = Math.min(1, (1 - t) / 0.1);
  r = 2.2 + (r - 2.2) * Math.sin((back * Math.PI) / 2);
  r = 1.6 + (r - 1.6) * Math.sin((front * Math.PI) / 2);
  return r;
}

function flightPath(shape: DartSetup["flight"], len: number, top: boolean): string {
  const s = top ? -1 : 1;
  const y = (v: number) => (s * v).toFixed(2);
  const L = len;
  switch (shape) {
    case "slim": return `M${L} ${y(1.5)} C${L - 6} ${y(4)} ${L - 12} ${y(10)} ${L - 15} ${y(10.5)} L1 ${y(10.5)} L0 ${y(1.5)} Z`;
    case "kite": return `M${L} ${y(1.5)} L${L - 20} ${y(15)} L2 ${y(6)} L0 ${y(1.5)} Z`;
    case "pear": return `M${L} ${y(1.5)} C${L - 4} ${y(6)} ${L - 10} ${y(16)} ${L - 18} ${y(16)} C${L - 24} ${y(16)} 3 ${y(13)} 1 ${y(9)} L0 ${y(1.5)} Z`;
    case "shape": return `M${L} ${y(1.5)} C${L - 5} ${y(6)} ${L - 12} ${y(15)} ${L - 15} ${y(17)} L0 ${y(13)} L0 ${y(1.5)} Z`;
    default: return `M${L} ${y(1.5)} C${L - 4} ${y(6)} ${L - 9} ${y(15.5)} ${L - 12} ${y(16)} L1 ${y(16)} C0 ${y(16)} 0 ${y(15)} 0 ${y(14)} L0 ${y(1.5)} Z`;
  }
}

/** Dart in lokalen Einheiten (ca. 110 lang, 34 hoch). uid für eindeutige Verläufe. */
export function Dart({ setup, uid }: { setup: DartSetup; uid: string }) {
  const fin = BARREL_FINISH.find((f) => f.id === setup.finish) ?? BARREL_FINISH[0];
  const shaftLen = 20 * (SHAFT_LENGTHS.find((s) => s.id === setup.shaft)?.len ?? 1);
  const flightLen = 30;
  const barrelLen = setup.barrel === "bomb" ? 30 : 38;
  const x0 = flightLen - 4, xShaftEnd = x0 + shaftLen, xBarrelEnd = xShaftEnd + barrelLen;
  const pointLen = 24;

  const steps = 40;
  const topPts: string[] = [], botPts: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, x = xShaftEnd + t * barrelLen, r = profile(setup.barrel, t);
    topPts.push(`${x.toFixed(2)} ${(-r).toFixed(2)}`);
    botPts.unshift(`${x.toFixed(2)} ${r.toFixed(2)}`);
  }
  const barrel = `M${topPts.join(" L")} L${botPts.join(" L")} Z`;
  const gripFrom = xShaftEnd + barrelLen * (setup.barrel === "teardrop" ? 0.1 : 0.18);
  const gripTo = xShaftEnd + barrelLen * (setup.barrel === "scallop" ? 0.82 : 0.72);
  const id = (n: string) => `${n}${uid}`;

  const grip = () => {
    const els = [];
    if (setup.grip === "rings") for (let x = gripFrom; x < gripTo; x += 2.6) els.push(<rect key={x} x={x} y="-7" width="1.1" height="14" fill={fin.dark} opacity=".85" />);
    if (setup.grip === "knurl") for (let x = gripFrom - 8; x < gripTo; x += 2.2) els.push(<path key={x} d={`M${x} -7 l8 14 M${x + 8} -7 l-8 14`} stroke={fin.dark} strokeWidth=".55" opacity=".9" />);
    if (setup.grip === "shark") for (let x = gripFrom; x < gripTo; x += 4.2) els.push(<path key={x} d={`M${x} -7 L${x + 3.2} -7 L${x + 0.6} 7 L${x - 1.2} 7 Z`} fill={fin.dark} opacity=".8" />);
    return <g clipPath={`url(#${id("bc")})`}>{els}</g>;
  };

  const c1 = setup.flightColor, c2 = setup.flightColor2;
  const flightDeco = (top: boolean) => {
    switch (setup.flightDesign) {
      case "club26": return <><path d={`M0 ${top ? -1.5 : 1.5} L${flightLen} ${top ? -1.5 : 1.5}`} stroke={c2} strokeWidth="2.4" /><text x={flightLen * 0.42} y={top ? -5.5 : 11} textAnchor="middle" fontSize="8.5" fontFamily="var(--font-kaushan), cursive" fill={c2} stroke={OUT} strokeWidth=".4" paintOrder="stroke">26</text></>;
      case "flame": return <path d="M0 -18 C6 -10 4 -6 10 -2 C8 -8 14 -10 12 -16 C18 -10 18 -4 22 0 C18 4 18 10 12 16 C14 10 8 8 10 2 C4 6 6 10 0 18 Z" fill={c2} />;
      case "stripe": return <><rect x="9" y="-18" width="5" height="36" fill={c2} /><rect x="16" y="-18" width="2" height="36" fill="#fff" opacity=".8" /></>;
      case "target": return <g>{[13, 9, 5].map((r, i) => <circle key={r} cx="11" cy="0" r={r} fill="none" stroke={i % 2 ? "#fff" : c2} strokeWidth="2.2" />)}</g>;
      case "split": return <rect x="0" y="0" width={flightLen} height="18" fill={c2} />;
      default: return null;
    }
  };

  return (
    <g>
      <defs>
        <linearGradient id={id("bg")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={fin.dark} /><stop offset=".28" stopColor={fin.light} /><stop offset=".55" stopColor={fin.mid} /><stop offset="1" stopColor={fin.dark} />
        </linearGradient>
        {fin.id === "rainbow" && (
          <linearGradient id={id("rb")} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#ff5fd2" stopOpacity=".6" /><stop offset=".33" stopColor="#ffd23f" stopOpacity=".5" /><stop offset=".66" stopColor="#5fe3f0" stopOpacity=".6" /><stop offset="1" stopColor="#8a7bff" stopOpacity=".6" />
          </linearGradient>
        )}
        <linearGradient id={id("pt")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7d828c" /><stop offset=".4" stopColor="#f4f6fa" /><stop offset="1" stopColor="#6a6e78" /></linearGradient>
        <linearGradient id={id("sh")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#000" stopOpacity=".35" /><stop offset=".35" stopColor="#fff" stopOpacity=".35" /><stop offset="1" stopColor="#000" stopOpacity=".45" /></linearGradient>
        <clipPath id={id("bc")}><path d={barrel} /></clipPath>
        <clipPath id={id("ft")}><path d={flightPath(setup.flight, flightLen, true)} /></clipPath>
        <clipPath id={id("fb")}><path d={flightPath(setup.flight, flightLen, false)} /></clipPath>
      </defs>
      {/* Flight: zwei Flügel sichtbar, zwei von der Kante */}
      {[true, false].map((top) => (
        <g key={String(top)}>
          <path d={flightPath(setup.flight, flightLen, top)} fill={c1} />
          <g clipPath={`url(#${id(top ? "ft" : "fb")})`}>{flightDeco(top)}<rect x="0" y={top ? -18 : 0} width={flightLen} height="18" fill={top ? "#fff" : "#000"} opacity={top ? 0.12 : 0.18} /></g>
          <path d={flightPath(setup.flight, flightLen, top)} fill="none" stroke={OUT} strokeWidth="1" strokeLinejoin="round" />
        </g>
      ))}
      <rect x="0" y="-1.3" width={flightLen} height="2.6" rx="1" fill={c1} stroke={OUT} strokeWidth=".7" />
      {/* Schaft */}
      <rect x={x0} y="-2.6" width={shaftLen + 1} height="5.2" rx="1.4" fill={setup.shaftColor} stroke={OUT} strokeWidth=".8" />
      <rect x={x0} y="-2.6" width={shaftLen + 1} height="5.2" rx="1.4" fill={`url(#${id("sh")})`} />
      <rect x={xShaftEnd - 5} y="-2.6" width="1.2" height="5.2" fill="#000" opacity=".35" />
      <rect x={x0 + 2} y="-2.6" width="1" height="5.2" fill="#fff" opacity=".3" />
      {/* Barrel */}
      <path d={barrel} fill={`url(#${id("bg")})`} />
      {fin.id === "rainbow" && <path d={barrel} fill={`url(#${id("rb")})`} />}
      {grip()}
      <path d={barrel} fill="none" stroke={OUT} strokeWidth=".9" strokeLinejoin="round" />
      {/* Spitze */}
      <path d={`M${xBarrelEnd - 0.5} -1.5 L${xBarrelEnd + pointLen} -0.3 L${xBarrelEnd + pointLen + 1.5} 0 L${xBarrelEnd + pointLen} 0.3 L${xBarrelEnd - 0.5} 1.5 Z`} fill={`url(#${id("pt")})`} stroke={OUT} strokeWidth=".6" />
    </g>
  );
}

export const DART_LENGTH = (setup: DartSetup) => 26 + 20 * (SHAFT_LENGTHS.find((s) => s.id === setup.shaft)?.len ?? 1) + (setup.barrel === "bomb" ? 30 : 38) + 26;

/** Dart einzeln als Bild */
export function DartImage({ setup, className = "", uid }: { setup: DartSetup; className?: string; uid: string }) {
  const len = DART_LENGTH(setup);
  return (
    <svg viewBox={`-4 -22 ${len + 8} 44`} className={className} role="img" aria-label="Dart">
      <Dart setup={setup} uid={uid} />
    </svg>
  );
}
