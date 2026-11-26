"use client";
// Ganzkörper-Figur für den 3D-Raum. Nullpunkt = Füße. Gesicht, Frisur usw. kommen aus dem Porträt (verkleinert).
import { type ReactNode } from "react";
import { HAIR_COLORS, SKIN_TONES, type Look } from "@/lib/dartraum/catalog";
import { Beard, Glasses, Hair, Hat } from "./Avatar";

export type Pose = "stand" | "walk" | "throw" | "sit";
const PINK = "#d63ce0", CYAN = "#5fe3f0", SAGE = "#7b8b7e", GOLD = "#e8c25a";

/** Farben eines Trikots in klein */
function shirtColors(id: string): { base: string; sleeve: string; deco?: (uid: string) => ReactNode } {
  switch (id) {
    case "shirt-black": return { base: "#1c1c22", sleeve: "#1c1c22" };
    case "shirt-pink": return { base: PINK, sleeve: "#fff", deco: () => <><rect x="-12" y="-52" width="3" height="30" fill="#fff" /><rect x="9" y="-52" width="3" height="30" fill="#fff" /></> };
    case "shirt-cyan": return { base: "#22a9b8", sleeve: CYAN, deco: () => <><rect x="-12" y="-52" width="3" height="30" fill={CYAN} /><rect x="9" y="-52" width="3" height="30" fill={CYAN} /></> };
    case "shirt-stripes": return { base: "#f2f2f5", sleeve: "#f2f2f5", deco: () => <>{[-10, -4, 2, 8].map((x) => <rect key={x} x={x} y="-52" width="3" height="30" fill={PINK} />)}</> };
    case "shirt-checker": return { base: "#15151b", sleeve: SAGE, deco: () => <>{[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <rect key={i} x={-12 + (i % 4) * 6} y={-50 + Math.floor(i / 4) * 12 + ((i % 2) * 6)} width="6" height="6" fill={SAGE} />)}</> };
    case "shirt-split": return { base: CYAN, sleeve: PINK, deco: () => <path d="M-14 -52 H14 L-14 -22 Z" fill={PINK} /> };
    case "shirt-flames": return { base: "#111114", sleeve: "#111114", deco: () => <><path d="M-14 -22 L-12 -32 L-8 -27 L-5 -37 L-1 -28 L3 -36 L6 -27 L10 -33 L14 -22 Z" fill="#ff5a1f" /><path d="M-12 -22 L-8 -28 L-4 -24 L0 -31 L4 -24 L8 -28 L12 -22 Z" fill="#ffc53d" /></> };
    case "shirt-c26": return { base: "#111114", sleeve: "#111114", deco: () => <><text x="0" y="-33" textAnchor="middle" fontSize="8" fontFamily="var(--font-kaushan), cursive" fill="#fff">Club26</text><rect x="-14" y="-25" width="28" height="2" fill={PINK} /></> };
    case "shirt-c26-sage": return { base: SAGE, sleeve: SAGE, deco: () => <text x="0" y="-33" textAnchor="middle" fontSize="8" fontFamily="var(--font-kaushan), cursive" fill="#fff">Club26</text> };
    case "shirt-c26-neon": return { base: "#0b0b10", sleeve: "#0b0b10", deco: () => <><path d="M-14 -42 L14 -47" stroke={PINK} strokeWidth="1.5" /><path d="M-14 -27 L14 -32" stroke={CYAN} strokeWidth="1.5" /><text x="0" y="-33" textAnchor="middle" fontSize="9" fontFamily="var(--font-kaushan), cursive" fill={PINK}>26</text></> };
    case "shirt-180": return { base: "#111114", sleeve: "#111114", deco: () => <text x="0" y="-33" textAnchor="middle" fontSize="9" fontWeight="700" fontFamily="var(--font-oswald), sans-serif" fill={PINK}>180</text> };
    case "shirt-bigfish": return { base: "#1d4fa3", sleeve: "#1d4fa3", deco: () => <><path d="M-8 -37 Q0 -43 7 -37 Q0 -31 -8 -37 Z" fill={CYAN} /><path d="M7 -37 L11 -40 L11 -34 Z" fill={CYAN} /></> };
    case "shirt-champion": return { base: "#111114", sleeve: GOLD, deco: (u) => <><path d="M-5 -44 L-3 -48 L0 -45 L3 -48 L5 -44 Z" fill={`url(#fg${u})`} /><text x="0" y="-31" textAnchor="middle" fontSize="7" fontFamily="var(--font-kaushan), cursive" fill={GOLD}>Club26</text></> };
    case "shirt-gold": return { base: GOLD, sleeve: GOLD, deco: () => <text x="0" y="-33" textAnchor="middle" fontSize="6" fontWeight="700" fontFamily="var(--font-oswald), sans-serif" fill="#5a3d00">9 DARTS</text> };
    default: return { base: "#5b5b66", sleeve: "#5b5b66" };
  }
}
export const dartColor = (id: string) => (id === "darts-pink" ? PINK : id === "darts-cyan" ? CYAN : id === "darts-gold" ? GOLD : "#c9c9d2");

/**
 * view: "front" (schaut nach vorne) oder "back" (schaut zur Wand). mirror spiegelt horizontal.
 * phase: 0..1 für Laufen (Schrittzyklus) und Werfen (Wurfbewegung).
 */
export function Figure({ look, view = "front", mirror = false, pose = "stand", phase = 0, uid }: {
  look: Look; view?: "front" | "back"; mirror?: boolean; pose?: Pose; phase?: number; uid: string;
}) {
  const skin = SKIN_TONES[look.skin] ?? SKIN_TONES[1];
  const hair = HAIR_COLORS[look.hairColor] ?? HAIR_COLORS[1];
  const shirt = shirtColors(look.shirt);
  const pants = "#2b2f3a", shoe = "#f2f2f5";
  const walk = pose === "walk" ? Math.sin(phase * Math.PI * 2) : 0;
  const bob = pose === "walk" ? -Math.abs(walk) * 1.5 : 0;
  const sitDrop = pose === "sit" ? 12 : 0;
  // Wurfarm: Winkel in Grad (0 = hängt runter, 180 = senkrecht hoch)
  let throwAngle = 0;
  if (pose === "throw") {
    if (phase < 0.55) throwAngle = 168 + Math.sin(phase * 20) * 2;
    else if (phase < 0.7) throwAngle = 168 - ((phase - 0.55) / 0.15) * 38;
    else throwAngle = 130 - ((phase - 0.7) / 0.3) * 90;
  }
  const back = view === "back";
  const torso = "M-12 -54 Q0 -57 12 -54 L14 -22 H-14 Z";

  const arm = (side: -1 | 1, swing: number, raised = 0) => (
    <g transform={`translate(${side * 13} -51) rotate(${raised ? -side * raised : swing * 22 * side})`}>
      <rect x="-3" y="0" width="6" height="9" rx="3" fill={shirt.sleeve} />
      <rect x="-2.5" y="7" width="5" height="14" rx="2.5" fill={skin} />
      <circle cx="0" cy="22" r="3" fill={skin} />
    </g>
  );
  const legs = pose === "sit" ? (
    <g>
      <rect x="-10" y="-14" width="9" height="9" rx="3" fill={pants} />
      <rect x="1" y="-14" width="9" height="9" rx="3" fill={pants} />
      <rect x="-9" y="-6" width="7" height="6" rx="2" fill={pants} />
      <rect x="2" y="-6" width="7" height="6" rx="2" fill={pants} />
      <ellipse cx="-5.5" cy="0" rx="5" ry="2.5" fill={shoe} /><ellipse cx="5.5" cy="0" rx="5" ry="2.5" fill={shoe} />
    </g>
  ) : (
    <g>
      <g transform={`translate(${walk * 2} ${walk > 0 ? -walk * 2 : 0})`}>
        <rect x="-9" y="-24" width="8" height="22" rx="3" fill={pants} />
        <ellipse cx="-5" cy="-1" rx="5" ry="2.6" fill={shoe} />
      </g>
      <g transform={`translate(${-walk * 2} ${walk < 0 ? walk * 2 : 0})`}>
        <rect x="1" y="-24" width="8" height="22" rx="3" fill={pants} />
        <ellipse cx="5" cy="-1" rx="5" ry="2.6" fill={shoe} />
      </g>
    </g>
  );

  return (
    <g transform={mirror ? "scale(-1 1)" : undefined}>
      <defs>
        <clipPath id={`ft${uid}`}><path d={torso} /></clipPath>
        <linearGradient id={`fg${uid}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff1b8" /><stop offset=".5" stopColor={GOLD} /><stop offset="1" stopColor="#a87b1c" /></linearGradient>
        <linearGradient id={`gold${uid}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff1b8" /><stop offset=".5" stopColor={GOLD} /><stop offset="1" stopColor="#a87b1c" /></linearGradient>
      </defs>
      <ellipse cx="0" cy="0" rx="15" ry="6" fill="#000" opacity=".3" />
      {legs}
      <g transform={`translate(0 ${bob + sitDrop})`}>
        {/* hinterer Arm zuerst */}
        {pose === "throw" ? arm(-1, 0) : arm(-1, -walk)}
        <path d={torso} fill={shirt.base} />
        <g clipPath={`url(#ft${uid})`}>
          {!back && shirt.deco?.(uid)}
          {back && <rect x="-14" y="-56" width="28" height="4" fill={shirt.sleeve} opacity=".6" />}
          <rect x="-14" y="-24" width="28" height="2" fill="#000" opacity=".25" />
        </g>
        {back && look.number && (
          <text x="0" y="-31" textAnchor="middle" fontSize="13" fontWeight="700" fontFamily="var(--font-oswald), sans-serif" fill="#fff" opacity=".92"
            transform={mirror ? "scale(-1 1)" : undefined}>{look.number}</text>
        )}
        {!back && <path d="M-4 -55 L0 -50 L4 -55" fill="none" stroke="#000" strokeOpacity=".35" strokeWidth="1.4" />}
        {pose === "throw" ? arm(1, 0, throwAngle) : arm(1, walk)}
        {pose === "throw" && phase < 0.7 && (
          <g transform={`translate(13 -51) rotate(${-throwAngle}) translate(0 22) rotate(180)`}>
            <rect x="-0.8" y="-2" width="1.6" height="12" fill={dartColor(look.darts)} />
          </g>
        )}
        {/* Hals und Kopf */}
        <rect x="-3.5" y="-60" width="7" height="6" fill={skin} />
        <g transform="translate(0 -70) scale(0.27) translate(-100 -96)">
          {back ? (
            <>
              <circle cx="61" cy="100" r="9" fill={skin} /><circle cx="139" cy="100" r="9" fill={skin} />
              <ellipse cx="100" cy="96" rx="39" ry="45" fill={skin} />
              {look.hair === "hair-bald" ? null : look.hair === "hair-buzz" ? (
                <ellipse cx="100" cy="88" rx="38" ry="38" fill={hair} opacity=".75" />
              ) : (
                <path d={look.hair === "hair-long" ? "M60 70 C64 40 136 40 140 70 L144 150 C120 160 80 160 56 150 Z" : "M61 100 C56 40 144 40 139 100 C136 124 122 132 100 132 C78 132 64 124 61 100 Z"} fill={hair} />
              )}
              {look.hair === "hair-bun" && <circle cx="100" cy="44" r="15" fill={hair} />}
              {look.hair === "hair-mohawk" && <path d="M90 66 L92 30 L100 20 L108 30 L110 66 Z" fill={hair} />}
              <Hat id={look.hat} uid={uid} />
            </>
          ) : (
            <>
              {look.hair === "hair-long" && <path d="M58 92 C54 150 60 170 72 176 L128 176 C140 170 146 150 142 92 Z" fill={hair} />}
              <circle cx="61" cy="100" r="9" fill={skin} /><circle cx="139" cy="100" r="9" fill={skin} />
              <ellipse cx="100" cy="96" rx="39" ry="45" fill={skin} />
              <ellipse cx="85" cy="100" rx="5" ry="6" fill="#1b1420" /><ellipse cx="115" cy="100" rx="5" ry="6" fill="#1b1420" />
              <path d="M86 122 Q100 132 114 122" stroke="#6b2b3a" strokeWidth="4" fill="none" strokeLinecap="round" />
              <Beard id={look.beard} color={hair} />
              <Hair id={look.hair} color={hair} />
              <Glasses id={look.glasses} uid={uid} />
              <Hat id={look.hat} uid={uid} />
            </>
          )}
        </g>
      </g>
    </g>
  );
}

/** Figur einzeln als Bild (Kleiderschrank, Spielerauswahl) */
export function FigureCard({ look, size = 160, className = "", view = "front" }: { look: Look; size?: number; className?: string; view?: "front" | "back" }) {
  const uid = "fc" + Math.abs(hash(JSON.stringify(look) + view)).toString(36);
  return (
    <svg viewBox="-30 -92 60 100" width={size} height={size * (100 / 60)} className={className} role="img" aria-label="Spielerfigur">
      <Figure look={look} view={view} uid={uid} />
    </svg>
  );
}
function hash(s: string) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; }
