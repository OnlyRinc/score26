"use client";
import type { Look } from "@/lib/dartraum/catalog";
import { Avatar } from "./Avatar";

const PINK = "#d63ce0", CYAN = "#5fe3f0", SAGE = "#7b8b7e", GOLD = "#e8c25a";

/** Der Dartraum als Bühnenbild. Jede Ausbaustufe legt Dinge dazu. */
export function Room({ level, look, trophies, medals }: { level: number; look: Look; trophies: string[]; medals: number }) {
  const wall = ["#3b3b42", "#3a2f3f", "#2a1830", "#14121c", "#0c0a12"][level] ?? "#3b3b42";
  const floor = ["#55524f", "#4a3b33", "#3b2a24", "#1d1b24", "#141018"][level] ?? "#55524f";
  return (
    <div className="relative overflow-hidden rounded-3xl border border-line">
      <svg viewBox="0 0 400 240" className="block w-full" role="img" aria-label="Dartraum">
        <defs>
          <radialGradient id="ring" cx="50%" cy="50%" r="50%"><stop offset=".6" stopColor="#fff" stopOpacity="0" /><stop offset=".8" stopColor="#fff" stopOpacity=".45" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></radialGradient>
          <linearGradient id="spot" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".35" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient>
          <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff1b8" /><stop offset=".5" stopColor={GOLD} /><stop offset="1" stopColor="#a87b1c" /></linearGradient>
        </defs>
        <rect width="400" height="240" fill={wall} />
        {level === 0 && <g opacity=".25">{Array.from({ length: 8 }, (_, r) => Array.from({ length: 9 }, (_, c) => <rect key={`${r}-${c}`} x={c * 48 - (r % 2) * 24} y={r * 22} width="46" height="20" fill="none" stroke="#222" />))}</g>}
        {level >= 2 && <rect y="0" width="400" height="12" fill={PINK} opacity=".08" />}
        <rect y="176" width="400" height="64" fill={floor} />
        <rect y="176" width="400" height="3" fill="rgba(0,0,0,0.35)" />

        {/* Profi-Studio: Sponsorenwand und Spots */}
        {level >= 4 && (
          <g>
            {Array.from({ length: 6 }, (_, r) => Array.from({ length: 10 }, (_, c) => (
              <text key={`${r}-${c}`} x={c * 42 + (r % 2) * 21} y={r * 28 + 20} fontSize="9" fontFamily="var(--font-kaushan), cursive" fill="#fff" opacity=".07">Score26</text>
            )))}
            <path d="M60 0 L20 176 H120 Z" fill="url(#spot)" opacity=".6" />
            <path d="M340 0 L280 176 H380 Z" fill="url(#spot)" opacity=".6" />
            <rect x="60" y="176" width="200" height="10" fill={PINK} opacity=".35" />
          </g>
        )}

        {/* Neon-Schild */}
        {level >= 2 && <text x="320" y="56" textAnchor="middle" fontFamily="var(--font-kaushan), cursive" fontSize="30" fill={PINK} style={{ filter: `drop-shadow(0 0 6px ${PINK})` }}>Club<tspan fill={CYAN}>26</tspan></text>}

        {/* Tafel */}
        <g>
          <rect x="30" y="40" width="60" height="70" rx="3" fill="#1d2a22" stroke="#6b4a2b" strokeWidth="4" />
          <text x="60" y="62" textAnchor="middle" fontSize="10" fill="#e6e6e6" fontFamily="var(--font-oswald), sans-serif">501</text>
          <line x1="40" y1="68" x2="80" y2="68" stroke="#e6e6e6" strokeWidth=".6" />
          <text x="60" y="82" textAnchor="middle" fontSize="8" fill="#e6e6e6" fontFamily="var(--font-oswald), sans-serif">441</text>
          <text x="60" y="96" textAnchor="middle" fontSize="8" fill="#e6e6e6" fontFamily="var(--font-oswald), sans-serif">321</text>
        </g>

        {/* Board */}
        <g transform="translate(160 86)">
          {level >= 1 && <circle r="44" fill="url(#ring)" />}
          {level >= 1 && <circle r="36" fill="none" stroke="#f5f5f5" strokeWidth="3" />}
          <circle r="30" fill="#111" />
          {Array.from({ length: 20 }, (_, i) => {
            const a1 = ((i * 18 - 9) * Math.PI) / 180, a2 = (((i + 1) * 18 - 9) * Math.PI) / 180;
            const p = (r: number, a: number) => `${(Math.sin(a) * r).toFixed(2)} ${(-Math.cos(a) * r).toFixed(2)}`;
            return (
              <g key={i}>
                <path d={`M0 0 L${p(26, a1)} A26 26 0 0 1 ${p(26, a2)} Z`} fill={i % 2 ? "#efe3c8" : "#1a1a1a"} />
                <path d={`M${p(24, a1)} A24 24 0 0 1 ${p(24, a2)} L${p(26, a2)} A26 26 0 0 0 ${p(26, a1)} Z`} fill={i % 2 ? "#1f8a4c" : "#c8312f"} />
                <path d={`M${p(14, a1)} A14 14 0 0 1 ${p(14, a2)} L${p(16, a2)} A16 16 0 0 0 ${p(16, a1)} Z`} fill={i % 2 ? "#1f8a4c" : "#c8312f"} />
              </g>
            );
          })}
          <circle r="3.2" fill="#1f8a4c" /><circle r="1.6" fill="#c8312f" />
        </g>
        {level === 0 && <g><line x1="160" y1="0" x2="160" y2="24" stroke="#222" /><circle cx="160" cy="28" r="5" fill="#ffe9a8" style={{ filter: "drop-shadow(0 0 6px #ffe9a8)" }} /></g>}

        {/* Poster */}
        {level >= 1 && level < 4 && <g><rect x="230" y="34" width="34" height="46" fill={CYAN} opacity=".85" /><text x="247" y="62" textAnchor="middle" fontSize="13" fontWeight="700" fill="#0b2a2f" fontFamily="var(--font-oswald), sans-serif">180</text></g>}

        {/* Pokalregal */}
        <g>
          <rect x="230" y="104" width="150" height="5" fill="#6b4a2b" />
          {trophies.slice(0, 6).map((_, i) => (
            <g key={i} transform={`translate(${244 + i * 24} 104)`}>
              <path d="M-7 -22 H7 V-16 Q7 -9 0 -8 Q-7 -9 -7 -16 Z" fill="url(#gold)" />
              <path d="M-7 -20 Q-11 -19 -9 -15 M7 -20 Q11 -19 9 -15" stroke={GOLD} fill="none" strokeWidth="1.5" />
              <rect x="-1.5" y="-8" width="3" height="4" fill={GOLD} /><rect x="-5" y="-4" width="10" height="4" fill="#3a2a10" />
            </g>
          ))}
          {Array.from({ length: Math.min(medals, 10) }, (_, i) => (
            <g key={"m" + i} transform={`translate(${236 + i * 14} 128)`}>
              <path d="M-3 -10 L0 -4 L3 -10" stroke={i % 2 ? CYAN : PINK} strokeWidth="2" fill="none" />
              <circle r="4.5" fill="url(#gold)" />
            </g>
          ))}
          {trophies.length === 0 && medals === 0 && <text x="305" y="98" textAnchor="middle" fontSize="8" fill="#fff" opacity=".4">Pokalregal: noch leer</text>}
        </g>

        {/* Teppich und Abwurflinie */}
        {level >= 1 && <g><path d="M100 240 L130 182 H190 L220 240 Z" fill={level >= 2 ? "#4b1f52" : "#2f3b33"} /><rect x="118" y="220" width="84" height="4" fill={level >= 3 ? CYAN : "#e6e6e6"} /></g>}
        {level === 0 && <rect x="120" y="222" width="80" height="3" fill="#e6e6e6" opacity=".7" />}

        {/* Lounge: Sofa und Bar */}
        {level >= 2 && level < 4 && (
          <g>
            <rect x="14" y="160" width="70" height="30" rx="8" fill={SAGE} /><rect x="10" y="148" width="78" height="20" rx="8" fill="#5f6f62" />
            <rect x="290" y="150" width="96" height="40" rx="3" fill="#2b1a10" /><rect x="286" y="146" width="104" height="6" fill="#5a3a20" />
            {[300, 316, 332].map((x) => <rect key={x} x={x} y="132" width="7" height="14" rx="2" fill={x === 316 ? CYAN : PINK} opacity=".8" />)}
          </g>
        )}

        {/* Streaming: Monitore, Kamera, Mikro, On Air */}
        {level >= 3 && (
          <g>
            <rect x="300" y="112" width="40" height="26" rx="2" fill="#0d0d14" stroke="#444" /><rect x="344" y="112" width="40" height="26" rx="2" fill="#0d0d14" stroke="#444" />
            <rect x="303" y="115" width="34" height="20" fill={PINK} opacity=".35" /><rect x="347" y="115" width="34" height="20" fill={CYAN} opacity=".3" />
            <g transform="translate(250 150)"><rect x="-8" y="-8" width="16" height="11" rx="2" fill="#222" /><circle cx="8" cy="-3" r="3" fill="#444" /><path d="M0 3 L-10 30 M0 3 L10 30 M0 3 L0 30" stroke="#666" strokeWidth="1.5" /></g>
            <g transform="translate(36 18)"><rect width="46" height="14" rx="3" fill="#ef3340" style={{ filter: "drop-shadow(0 0 6px #ef3340)" }} /><text x="23" y="10.5" textAnchor="middle" fontSize="8" fontWeight="700" fill="#fff" fontFamily="var(--font-oswald), sans-serif">ON AIR</text></g>
          </g>
        )}

        {/* Publikum */}
        {level >= 4 && <g fill="#000" opacity=".75">{Array.from({ length: 16 }, (_, i) => <g key={i}><circle cx={12 + i * 25} cy={222 - (i % 3) * 3} r="8" /><rect x={i * 25} y={228 - (i % 3) * 3} width="24" height="20" rx="8" /></g>)}</g>}
      </svg>
      <div className="pointer-events-none absolute bottom-[4%] left-[50%] w-[24%]">
        <Avatar look={look} size={200} bg={false} className="h-auto w-full drop-shadow-[0_8px_18px_rgba(0,0,0,0.6)]" />
      </div>
    </div>
  );
}
