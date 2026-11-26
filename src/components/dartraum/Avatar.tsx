"use client";
import { useId, type ReactNode } from "react";
import { HAIR_COLORS, SKIN_TONES, type Look } from "@/lib/dartraum/catalog";

const PINK = "#d63ce0", CYAN = "#5fe3f0", SAGE = "#7b8b7e", GOLD = "#e8c25a";
const SHIRT_PATH = "M22 240 C24 186 52 160 100 158 C148 160 176 186 178 240 Z";

/** Gezeichneter Spieler. Alles ist Vektorgrafik und skaliert scharf. */
export function Avatar({ look, size = 200, className = "", bg = true }: { look: Look; size?: number; className?: string; bg?: boolean }) {
  const uid = useId().replace(/:/g, "");
  const skin = SKIN_TONES[look.skin] ?? SKIN_TONES[1];
  const hair = HAIR_COLORS[look.hairColor] ?? HAIR_COLORS[1];
  const shade = "rgba(0,0,0,0.18)";
  return (
    <svg viewBox="0 0 200 240" width={size} height={size * 1.2} className={className} role="img" aria-label="Avatar">
      <defs>
        <radialGradient id={`bg${uid}`} cx="50%" cy="40%" r="65%">
          <stop offset="0" stopColor="#3a1b40" /><stop offset="1" stopColor="#0d0d12" />
        </radialGradient>
        <clipPath id={`shirt${uid}`}><path d={SHIRT_PATH} /></clipPath>
        <linearGradient id={`gold${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff1b8" /><stop offset=".5" stopColor={GOLD} /><stop offset="1" stopColor="#a87b1c" />
        </linearGradient>
      </defs>
      {bg && <rect width="200" height="240" rx="28" fill={`url(#bg${uid})`} />}

      {/* Haare hinten (lang, Dutt) */}
      {look.hair === "hair-long" && <path d="M58 92 C54 150 60 176 72 186 L128 186 C140 176 146 150 142 92 Z" fill={hair} />}

      {/* Trikot */}
      <g clipPath={`url(#shirt${uid})`}>
        <Shirt id={look.shirt} uid={uid} />
        <path d="M22 240 C24 186 52 160 100 158 C148 160 176 186 178 240" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="3" />
      </g>
      {/* Kragen */}
      <path d="M80 160 L100 184 L120 160" fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth="5" strokeLinejoin="round" />
      {look.number && <text x="70" y="214" textAnchor="middle" fontFamily="var(--font-oswald), sans-serif" fontWeight="700" fontSize="20" fill="rgba(255,255,255,0.9)">{look.number}</text>}
      <DartPin id={look.darts} uid={uid} />

      {/* Hals und Kopf */}
      <rect x="86" y="128" width="28" height="36" rx="12" fill={skin} />
      <rect x="86" y="140" width="28" height="10" fill={shade} />
      <circle cx="61" cy="100" r="9" fill={skin} />
      <circle cx="139" cy="100" r="9" fill={skin} />
      <ellipse cx="100" cy="96" rx="39" ry="45" fill={skin} />

      {/* Gesicht */}
      <ellipse cx="85" cy="100" rx="4.2" ry="5" fill="#1b1420" />
      <ellipse cx="115" cy="100" rx="4.2" ry="5" fill="#1b1420" />
      <circle cx="86.4" cy="98.4" r="1.4" fill="#fff" />
      <circle cx="116.4" cy="98.4" r="1.4" fill="#fff" />
      <path d="M77 88 Q85 84 92 87" stroke={hair} strokeWidth="3.4" fill="none" strokeLinecap="round" />
      <path d="M108 87 Q115 84 123 88" stroke={hair} strokeWidth="3.4" fill="none" strokeLinecap="round" />
      <path d="M100 104 Q97 113 101 115" stroke={shade} strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <path d="M88 122 Q100 131 112 122" stroke="#6b2b3a" strokeWidth="3" fill="none" strokeLinecap="round" />
      <ellipse cx="77" cy="114" rx="6" ry="3.5" fill="#ff7aa8" opacity="0.25" />
      <ellipse cx="123" cy="114" rx="6" ry="3.5" fill="#ff7aa8" opacity="0.25" />

      <Beard id={look.beard} color={hair} />
      <Hair id={look.hair} color={hair} />
      <Glasses id={look.glasses} uid={uid} />
      <Hat id={look.hat} uid={uid} />
    </svg>
  );
}

function Shirt({ id, uid }: { id: string; uid: string }) {
  const full = (fill: string, extra?: ReactNode) => <><rect x="0" y="150" width="200" height="90" fill={fill} />{extra}</>;
  const script = (text: string, color: string, glow?: string) => (
    <text x="100" y="218" textAnchor="middle" fontFamily="var(--font-kaushan), cursive" fontSize="26" fill={color}
      style={glow ? { filter: `drop-shadow(0 0 4px ${glow})` } : undefined}>{text}</text>
  );
  switch (id) {
    case "shirt-black": return full("#1c1c22");
    case "shirt-pink": return full(PINK, <><rect x="22" y="150" width="14" height="90" fill="#fff" opacity=".85" /><rect x="164" y="150" width="14" height="90" fill="#fff" opacity=".85" /></>);
    case "shirt-cyan": return full("#22a9b8", <><rect x="22" y="150" width="14" height="90" fill={CYAN} /><rect x="164" y="150" width="14" height="90" fill={CYAN} /></>);
    case "shirt-stripes": return full("#f2f2f5", <>{[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => <rect key={i} x={i * 22} y="150" width="11" height="90" fill={PINK} />)}</>);
    case "shirt-checker": return full("#15151b", <>{Array.from({ length: 50 }, (_, i) => { const x = (i % 10) * 20, y = 150 + Math.floor(i / 10) * 20; return (i % 10 + Math.floor(i / 10)) % 2 ? <rect key={i} x={x} y={y} width="20" height="20" fill={SAGE} /> : null; })}</>);
    case "shirt-split": return <><rect x="0" y="150" width="200" height="90" fill={CYAN} /><path d="M0 150 H200 L0 240 Z" fill={PINK} /></>;
    case "shirt-flames": return full("#111114", <>
      <path d="M22 240 C30 214 40 222 44 200 C52 216 58 206 62 190 C70 210 78 204 82 214 C90 198 96 210 100 192 C106 210 112 200 118 214 C122 204 130 210 138 190 C142 206 148 216 156 200 C160 222 170 214 178 240 Z" fill="#ff5a1f" />
      <path d="M30 240 C38 222 46 228 52 214 C58 226 66 220 72 228 C80 216 90 226 100 210 C110 226 120 216 128 228 C134 220 142 226 148 214 C154 228 162 222 170 240 Z" fill="#ffc53d" />
    </>);
    case "shirt-c26": return full("#111114", <>{script("Club26", "#fff")}<rect x="0" y="234" width="200" height="6" fill={PINK} /></>);
    case "shirt-c26-sage": return full(SAGE, <>{script("Club26", "#fff")}<rect x="0" y="234" width="200" height="6" fill="#f2f2f5" /></>);
    case "shirt-c26-neon": return full("#0b0b10", <>
      <path d="M30 196 L170 176" stroke={PINK} strokeWidth="3" style={{ filter: `drop-shadow(0 0 4px ${PINK})` }} />
      <path d="M30 236 L170 216" stroke={CYAN} strokeWidth="3" style={{ filter: `drop-shadow(0 0 4px ${CYAN})` }} />
      {script("26", PINK, PINK)}
    </>);
    case "shirt-180": return full("#111114", <><text x="100" y="222" textAnchor="middle" fontFamily="var(--font-oswald), sans-serif" fontWeight="700" fontSize="34" fill={PINK}>180</text></>);
    case "shirt-bigfish": return full("#1d4fa3", <>
      <path d="M70 206 Q100 186 128 206 Q100 226 70 206 Z" fill={CYAN} /><path d="M128 206 L146 194 L146 218 Z" fill={CYAN} /><circle cx="84" cy="203" r="3" fill="#0b2450" />
      <text x="100" y="236" textAnchor="middle" fontFamily="var(--font-oswald), sans-serif" fontWeight="700" fontSize="11" fill="#fff">170</text>
    </>);
    case "shirt-champion": return full("#111114", <>
      <rect x="0" y="150" width="200" height="90" fill={`url(#gold${uid})`} opacity=".18" />
      <path d="M86 186 L92 176 L100 184 L108 176 L114 186 Z" fill={`url(#gold${uid})`} />
      {script("Club26", `url(#gold${uid})`)}
    </>);
    case "shirt-gold": return full(`url(#gold${uid})`, <text x="100" y="222" textAnchor="middle" fontFamily="var(--font-oswald), sans-serif" fontWeight="700" fontSize="26" fill="#5a3d00">9 DARTS</text>);
    default: return full("#5b5b66");
  }
}

function DartPin({ id, uid }: { id: string; uid: string }) {
  const color = id === "darts-pink" ? PINK : id === "darts-cyan" ? CYAN : id === "darts-gold" ? `url(#gold${uid})` : "#c9c9d2";
  return (
    <g transform="translate(140 196) rotate(-35)">
      <rect x="-1" y="-20" width="2" height="10" fill="#ddd" />
      <rect x="-3" y="-11" width="6" height="14" rx="2" fill={color} />
      <rect x="-1.2" y="3" width="2.4" height="7" fill="#888" />
      <path d="M0 9 L-7 19 L0 16 L7 19 Z" fill={color} />
    </g>
  );
}

function Hair({ id, color }: { id: string; color: string }) {
  switch (id) {
    case "hair-bald": return <ellipse cx="88" cy="62" rx="12" ry="5" fill="#fff" opacity=".18" />;
    case "hair-buzz": return <path d="M62 86 C60 56 78 48 100 48 C122 48 140 56 138 86 C130 66 116 62 100 62 C84 62 70 66 62 86 Z" fill={color} opacity=".75" />;
    case "hair-quiff": return <path d="M60 90 C54 60 70 40 92 36 C110 26 140 36 146 54 C130 50 132 62 140 88 C128 66 112 62 100 64 C84 64 70 70 60 90 Z" fill={color} />;
    case "hair-curly": return <g fill={color}>{[[66, 74], [74, 60], [88, 52], [102, 50], [116, 53], [128, 62], [136, 76], [80, 64], [96, 60], [112, 62]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="13" />)}</g>;
    case "hair-long": return <path d="M58 104 C52 58 74 44 100 44 C126 44 148 58 142 104 C136 76 122 64 100 64 C78 64 64 76 58 104 Z" fill={color} />;
    case "hair-mohawk": return <g><path d="M64 86 C62 62 80 52 100 52 C120 52 138 62 136 86 C128 70 114 66 100 66 C86 66 72 70 64 86 Z" fill={color} opacity=".45" /><path d="M90 66 L92 30 L100 20 L108 30 L110 66 Z" fill={color} /></g>;
    case "hair-bun": return <g fill={color}><circle cx="100" cy="40" r="15" /><path d="M60 92 C56 60 76 48 100 48 C124 48 144 60 140 92 C132 70 116 64 100 64 C84 64 68 70 60 92 Z" /></g>;
    default: return <path d="M60 92 C56 58 76 46 100 46 C124 46 144 58 140 92 C134 72 122 66 112 68 C104 60 84 62 74 72 C68 76 62 84 60 92 Z" fill={color} />;
  }
}

function Beard({ id, color }: { id: string; color: string }) {
  switch (id) {
    case "beard-stubble": return <path d="M64 108 C66 136 84 142 100 142 C116 142 134 136 136 108 C130 128 118 132 100 132 C82 132 70 128 64 108 Z" fill={color} opacity=".35" />;
    case "beard-mustache": return <path d="M84 117 C90 111 98 112 100 115 C102 112 110 111 116 117 C110 118 104 119 100 118 C96 119 90 118 84 117 Z" fill={color} />;
    case "beard-goatee": return <g fill={color}><path d="M86 117 C92 112 98 113 100 115 C102 113 108 112 114 117 C108 118 92 118 86 117 Z" /><path d="M92 128 C94 140 106 140 108 128 C104 131 96 131 92 128 Z" /></g>;
    case "beard-full": return <path d="M62 104 C62 140 82 150 100 150 C118 150 138 140 138 104 C132 120 124 116 114 120 C108 116 92 116 86 120 C76 116 68 120 62 104 Z M88 124 Q100 132 112 124 Q100 128 88 124 Z" fill={color} fillRule="evenodd" />;
    default: return null;
  }
}

function Glasses({ id, uid }: { id: string; uid: string }) {
  if (id === "glasses-classic") return (
    <g fill="none" stroke="#1b1420" strokeWidth="2.6"><circle cx="85" cy="100" r="10" /><circle cx="115" cy="100" r="10" /><path d="M95 99 Q100 96 105 99 M75 98 L62 95 M125 98 L138 95" /></g>
  );
  if (id === "glasses-sun") return (
    <g><path d="M72 93 H97 V104 Q96 112 85 112 Q73 112 72 104 Z M103 93 H128 V104 Q127 112 115 112 Q104 112 103 104 Z" fill="#111" /><path d="M97 96 H103 M72 95 L62 93 M128 95 L138 93" stroke="#111" strokeWidth="2.6" /><path d="M76 97 L82 97" stroke="#fff" strokeWidth="2" opacity=".5" /></g>
  );
  if (id === "glasses-neon") return (
    <g style={{ filter: `drop-shadow(0 0 4px ${PINK})` }}>
      <defs><linearGradient id={`ng${uid}`} x1="0" x2="1"><stop offset="0" stopColor={PINK} /><stop offset="1" stopColor={CYAN} /></linearGradient></defs>
      <path d="M70 92 H130 L127 106 Q122 112 112 110 L104 102 H96 L88 110 Q78 112 73 106 Z" fill={`url(#ng${uid})`} />
    </g>
  );
  return null;
}

function Hat({ id, uid }: { id: string; uid: string }) {
  switch (id) {
    case "hat-cap": return <g><path d="M60 82 C60 50 80 40 100 40 C120 40 140 50 140 82 Z" fill={PINK} /><path d="M56 82 C80 74 150 74 168 86 C150 92 90 90 56 86 Z" fill="#8e1f99" /><circle cx="100" cy="42" r="3" fill="#8e1f99" /></g>;
    case "hat-cap-back": return <g><path d="M60 82 C60 50 80 40 100 40 C120 40 140 50 140 82 Z" fill={CYAN} /><path d="M70 82 C76 78 124 78 130 82 L128 86 L72 86 Z" fill="#1d8a96" /><rect x="90" y="74" width="20" height="6" rx="3" fill="#0b2a2f" /></g>;
    case "hat-beanie": return <g><path d="M60 84 C58 46 80 36 100 36 C120 36 142 46 140 84 Z" fill={SAGE} /><rect x="58" y="74" width="84" height="14" rx="6" fill="#4f5d52" /><circle cx="100" cy="34" r="8" fill="#f2f2f5" /></g>;
    case "hat-crown": return <g><path d="M68 70 L72 40 L86 56 L100 34 L114 56 L128 40 L132 70 Z" fill={`url(#gold${uid})`} stroke="#a87b1c" strokeWidth="1.5" /><circle cx="100" cy="58" r="4" fill={PINK} /><circle cx="84" cy="62" r="3" fill={CYAN} /><circle cx="116" cy="62" r="3" fill={CYAN} /></g>;
    default: return null;
  }
}
