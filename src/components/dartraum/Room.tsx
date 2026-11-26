"use client";
// Dartraum in Schrägansicht (isometrisch). Die Figur läuft herum, wirft Darts, sitzt auf der Couch und streamt.
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Look } from "@/lib/dartraum/catalog";
import { Figure, dartColor, type Pose } from "./Figure";

const PINK = "#d63ce0", CYAN = "#5fe3f0", GOLD = "#e8c25a";
const N = 8, HALF_W = 32, HALF_H = 16, WALL = 140;
const OX = 280, OY = WALL + 24;
const VB_W = 560, VB_H = OY + N * HALF_H * 2 + 16;

/** Bildschirm-Punkt eines Ortes im Raum (c, r in Kacheln, z in Pixeln nach oben) */
const iso = (c: number, r: number, z = 0) => ({ x: OX + (c - r) * HALF_W, y: OY + (c + r) * HALF_H - z });
const pts = (...p: { x: number; y: number }[]) => p.map((q) => `${q.x.toFixed(1)},${q.y.toFixed(1)}`).join(" ");

/** Quader auf dem Boden: c/r = hintere Ecke, w entlang c, d entlang r, h Höhe */
function Box({ c, r, w, d, h, top, left, right, z = 0 }: { c: number; r: number; w: number; d: number; h: number; top: string; left: string; right: string; z?: number }) {
  const t = [iso(c, r, z + h), iso(c + w, r, z + h), iso(c + w, r + d, z + h), iso(c, r + d, z + h)];
  const lf = [iso(c, r + d, z + h), iso(c + w, r + d, z + h), iso(c + w, r + d, z), iso(c, r + d, z)];
  const rt = [iso(c + w, r, z + h), iso(c + w, r + d, z + h), iso(c + w, r + d, z), iso(c + w, r, z)];
  return (
    <g>
      <polygon points={pts(...lf)} fill={left} />
      <polygon points={pts(...rt)} fill={right} />
      <polygon points={pts(...t)} fill={top} />
    </g>
  );
}
/** Fläche auf dem Boden */
const Floor = ({ c, r, w, d, fill, opacity }: { c: number; r: number; w: number; d: number; fill: string; opacity?: number }) => (
  <polygon points={pts(iso(c, r), iso(c + w, r), iso(c + w, r + d), iso(c, r + d))} fill={fill} opacity={opacity} />
);
/** Etwas flach an die rechte Wand (r = 0) malen. x nach rechts entlang der Wand, y nach unten. */
const RightWall = ({ c, z, children }: { c: number; z: number; children: ReactNode }) => {
  const p = iso(c, 0, z);
  return <g transform={`translate(${p.x} ${p.y}) matrix(1 0.5 0 1 0 0)`}>{children}</g>;
};
/** An die linke Wand (c = 0). x läuft zur hinteren Ecke. */
const LeftWall = ({ r, z, children }: { r: number; z: number; children: ReactNode }) => {
  const p = iso(0, r, z);
  return <g transform={`translate(${p.x} ${p.y}) matrix(1 -0.5 0 1 0 0)`}>{children}</g>;
};

// ---------------- Ablauf der Figur ----------------
type Facing = "NE" | "NW" | "SE" | "SW";
interface Step { kind: "walk"; to: [number, number] }
interface Act { kind: "throw" | "sit" | "idle" | "desk"; dur: number; face: Facing }
type Task = Step | Act;

const BOARD_C = 4;
const OCHE: [number, number] = [4, 3.3];

function plan(level: number, rand: () => number): Task[] {
  const tasks: Task[] = [];
  const walkTo = (c: number, r: number, viaC?: number) => {
    if (viaC !== undefined) tasks.push({ kind: "walk", to: [viaC, NaN] });
    tasks.push({ kind: "walk", to: [NaN, r] }, { kind: "walk", to: [c, r] });
  };
  walkTo(...OCHE);
  tasks.push({ kind: "throw", dur: 3 * 1.1, face: "NE" });
  const extra: (() => void)[] = [
    () => { walkTo(2.5 + rand() * 3, 4.5 + rand() * 2); tasks.push({ kind: "idle", dur: 1.5 + rand() * 2, face: rand() < 0.5 ? "SE" : "SW" }); },
  ];
  if (level >= 2) extra.push(() => { walkTo(2.2, 5.5); tasks.push({ kind: "walk", to: [0.95, 5.5] }, { kind: "sit", dur: 4 + rand() * 3, face: "SE" }, { kind: "walk", to: [2.2, 5.5] }); });
  if (level >= 3) extra.push(() => { walkTo(5.4, 2.6); tasks.push({ kind: "walk", to: [6.8, 2.6] }, { kind: "desk", dur: 4 + rand() * 2, face: "NE" }, { kind: "walk", to: [5.4, 2.6] }); });
  extra[Math.floor(rand() * extra.length)]();
  return tasks;
}

interface Sim { c: number; r: number; facing: Facing; pose: Pose; phase: number; tasks: Task[]; t: number; darts: { x: number; y: number }[]; flying: { from: [number, number]; to: [number, number]; t: number } | null }

const faceOf = (dc: number, dr: number): Facing => (Math.abs(dc) > Math.abs(dr) ? (dc > 0 ? "SE" : "NW") : dr > 0 ? "SW" : "NE");
const BOARD_Z = 92;
const boardPoint = (lx: number, ly: number) => { const p = iso(BOARD_C, 0, BOARD_Z); return { x: p.x + lx, y: p.y + lx * 0.5 + ly }; };

function useSim(level: number) {
  const sim = useRef<Sim>({ c: 3, r: 5, facing: "SE", pose: "stand", phase: 0, tasks: [], t: 0, darts: [], flying: null });
  const [, setFrame] = useState(0);
  useEffect(() => {
    let raf = 0, last = performance.now();
    const rand = Math.random;
    sim.current.tasks = [];
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const s = sim.current;
      if (!s.tasks.length) s.tasks = plan(level, rand);
      const task = s.tasks[0];
      if (task.kind === "walk") {
        const tc = Number.isNaN(task.to[0]) ? s.c : task.to[0];
        const tr = Number.isNaN(task.to[1]) ? s.r : task.to[1];
        const dc = tc - s.c, dr = tr - s.r, dist = Math.hypot(dc, dr);
        const speed = 1.7 * dt;
        if (dist < 0.02) { s.c = tc; s.r = tr; s.tasks.shift(); s.t = 0; }
        else {
          const k = Math.min(1, speed / dist);
          s.c += dc * k; s.r += dr * k;
          s.facing = faceOf(dc, dr);
          s.pose = "walk";
          s.phase = (s.phase + dt * 1.8) % 1;
          if (s.darts.length >= 3) s.darts = [];
        }
      } else {
        s.t += dt;
        s.facing = task.face;
        s.pose = task.kind === "throw" ? "throw" : task.kind === "sit" ? "sit" : "stand";
        if (task.kind === "throw") {
          const n = Math.floor(s.t / 1.1), within = (s.t % 1.1) / 1.1;
          s.phase = within;
          if (within >= 0.7 && !s.flying && s.darts.length <= n && n < 3) {
            const a = rand() * Math.PI * 2, rad = rand() * 16;
            s.flying = { from: [0, 0], to: [Math.cos(a) * rad, Math.sin(a) * rad], t: 0 };
          }
        } else s.phase = 0;
        if (s.t >= task.dur) { s.tasks.shift(); s.t = 0; s.pose = "stand"; }
      }
      if (s.flying) {
        s.flying.t += dt / 0.25;
        if (s.flying.t >= 1) { s.darts.push({ x: s.flying.to[0], y: s.flying.to[1] }); s.flying = null; }
      }
      setFrame((f) => (f + 1) % 1e6);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [level]);
  return sim.current;
}

// ---------------- Raum ----------------
export function Room({ level, look, trophies, medals }: { level: number; look: Look; trophies: string[]; medals: number }) {
  const s = useSim(level);
  const wallR = ["#6d6a66", "#7a6278", "#4b2a52", "#25213a", "#1a1426"][level];
  const wallL = ["#5a5753", "#66506a", "#3c2143", "#1d1a2e", "#120e1c"][level];
  const floorA = ["#8a8580", "#8a6a4f", "#6e4d3a", "#2e2b3a", "#201a2a"][level];
  const floorB = ["#837e79", "#7f6049", "#654534", "#282534", "#1a1524"][level];

  // Objekte mit Tiefe (c + r): werden von hinten nach vorne gezeichnet
  const items: { depth: number; node: ReactNode; key: string }[] = [];
  const add = (key: string, depth: number, node: ReactNode) => items.push({ key, depth, node });

  if (level >= 2) {
    // Couch an der linken Wand, Blick nach vorne
    add("sofa-back", 0.35 + 5.5, <Box c={0.1} r={4.5} w={0.35} d={2} h={34} top="#8d9c90" left="#6b7a6e" right="#5f6f62" />);
    add("sofa-seat", 0.9 + 5.5, <Box c={0.45} r={4.6} w={0.9} d={1.8} h={14} top="#9aaa9d" left="#7b8b7e" right="#6b7a6e" />);
    add("sofa-arm1", 0.8 + 4.5, <Box c={0.1} r={4.35} w={1.25} d={0.25} h={22} top="#8d9c90" left="#6b7a6e" right="#5f6f62" />);
    add("sofa-arm2", 0.8 + 6.5, <Box c={0.1} r={6.45} w={1.25} d={0.25} h={22} top="#8d9c90" left="#6b7a6e" right="#5f6f62" />);
    // Bar
    add("bar", 6.9 + 6, <Box c={6.2} r={5.4} w={1.6} d={1.1} h={34} top="#6b4a2b" left="#3b2616" right="#2b1a10" />);
    add("bar-bottles", 6.9 + 5.95, (
      <g>{[0, 1, 2].map((i) => { const p = iso(6.5 + i * 0.4, 5.7, 34); return <rect key={i} x={p.x - 2.5} y={p.y - 14} width="5" height="14" rx="1.5" fill={i === 1 ? CYAN : PINK} opacity=".85" />; })}</g>
    ));
    add("stool", 5.9 + 6.9, <Box c={5.75} r={6.7} w={0.35} d={0.35} h={22} top={PINK} left="#8e1f99" right="#6d1675" />);
  }
  if (level >= 1) {
    add("plant", 0.9 + 0.9, (
      <g>
        <Box c={0.6} r={0.6} w={0.45} d={0.45} h={16} top="#5a3a22" left="#4a2e1a" right="#3b2414" />
        {[[-8, -30], [6, -36], [0, -44], [-4, -24], [9, -24]].map(([dx, dy], i) => { const p = iso(0.82, 0.82, 16); return <ellipse key={i} cx={p.x + dx} cy={p.y + dy + 10} rx="8" ry="13" fill={i % 2 ? "#3f7d4e" : "#2f6a40"} transform={`rotate(${dx * 3} ${p.x + dx} ${p.y + dy + 10})`} />; })}
      </g>
    ));
  }
  if (level >= 3) {
    add("desk", 6.9 + 1.7, <Box c={6.1} r={1.2} w={1.6} d={0.9} h={28} top="#2a2a33" left="#1c1c24" right="#15151b" />);
    add("monitors", 6.9 + 1.5, (
      <g>
        {[0, 1].map((i) => {
          const c = 6.25 + i * 0.75, a = iso(c, 1.35, 30), b = iso(c + 0.65, 1.35, 30);
          return (
            <g key={i}>
              <polygon points={pts(a, b, { x: b.x, y: b.y - 26 }, { x: a.x, y: a.y - 26 })} fill="#0d0d14" stroke="#444" strokeWidth="1" />
              <polygon points={pts({ x: a.x + 2, y: a.y - 3 }, { x: b.x - 2, y: b.y - 3 }, { x: b.x - 2, y: b.y - 23 }, { x: a.x + 2, y: a.y - 23 })} fill={i ? CYAN : PINK} opacity=".45" />
            </g>
          );
        })}
      </g>
    ));
    add("camera", 1.5 + 2.4, (() => {
      const p = iso(1.5, 2.4);
      return <g><path d={`M${p.x} ${p.y - 34} L${p.x - 8} ${p.y} M${p.x} ${p.y - 34} L${p.x + 8} ${p.y} M${p.x} ${p.y - 34} L${p.x} ${p.y}`} stroke="#777" strokeWidth="1.5" /><rect x={p.x - 7} y={p.y - 44} width="14" height="10" rx="2" fill="#222" /><circle cx={p.x + 5} cy={p.y - 39} r="3.5" fill="#444" stroke="#888" /><circle cx={p.x - 4} cy={p.y - 41} r="1.4" fill="#ef3340" /></g>;
    })());
  }
  if (level === 0) {
    add("crate", 6.8 + 6.8, <Box c={6.4} r={6.4} w={0.8} d={0.8} h={20} top="#a07a4a" left="#7a5a34" right="#6a4c2a" />);
  }

  // Figur
  const fp = iso(s.c, s.r);
  const view = s.facing === "NE" || s.facing === "NW" ? "back" : "front";
  const mirror = s.facing === "SW" || s.facing === "NW";
  add("figure", s.c + s.r + (s.pose === "sit" ? 0.2 : 0.01), (
    <g transform={`translate(${fp.x} ${fp.y - (s.pose === "sit" ? 6 : 0)})`}>
      <Figure look={look} view={view} mirror={mirror} pose={s.pose} phase={s.phase} uid="room" />
    </g>
  ));
  items.sort((a, b) => a.depth - b.depth);

  const hand = { x: fp.x + 30, y: fp.y - 62 };

  return (
    <div className="overflow-hidden rounded-3xl border border-line bg-[radial-gradient(ellipse_at_center,#2a1530,#0a0a0f_70%)]">
      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="block w-full" role="img" aria-label="Dartraum in 3D">
        <defs>
          <radialGradient id="rm-ring" cx="50%" cy="50%" r="50%"><stop offset=".55" stopColor="#fff" stopOpacity="0" /><stop offset=".78" stopColor="#fff" stopOpacity=".55" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></radialGradient>
          <linearGradient id="rm-spot" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".28" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient>
          <linearGradient id="rm-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff1b8" /><stop offset=".5" stopColor={GOLD} /><stop offset="1" stopColor="#a87b1c" /></linearGradient>
        </defs>

        {/* Wände */}
        <polygon points={pts(iso(0, 0), iso(N, 0), iso(N, 0, WALL), iso(0, 0, WALL))} fill={wallR} />
        <polygon points={pts(iso(0, 0), iso(0, N), iso(0, N, WALL), iso(0, 0, WALL))} fill={wallL} />
        <polygon points={pts(iso(0, 0, WALL), iso(N, 0, WALL), iso(N, -0.25, WALL), iso(-0.25, -0.25, WALL), iso(-0.25, N, WALL), iso(0, N, WALL))} fill="#cfcac4" opacity=".9" />
        {level === 0 && (
          <g opacity=".22">
            {Array.from({ length: 6 }, (_, row) => Array.from({ length: 8 }, (_, i) => (
              <g key={`${row}-${i}`}>
                <RightWall c={i + (row % 2) * 0.5} z={WALL - row * 22}><rect x="0" y="0" width="30" height="20" fill="none" stroke="#222" /></RightWall>
                <LeftWall r={N - i - (row % 2) * 0.5} z={WALL - row * 22}><rect x="0" y="0" width="30" height="20" fill="none" stroke="#222" /></LeftWall>
              </g>
            )))}
          </g>
        )}
        {level >= 2 && (
          <>
            <polygon points={pts(iso(0, 0, 0), iso(N, 0, 0), iso(N, 0, 18), iso(0, 0, 18))} fill="#000" opacity=".25" />
            <polygon points={pts(iso(0, 0, 0), iso(0, N, 0), iso(0, N, 18), iso(0, 0, 18))} fill="#000" opacity=".25" />
          </>
        )}
        {level >= 4 && (
          <g>
            {Array.from({ length: 4 }, (_, row) => Array.from({ length: 4 }, (_, i) => (
              <LeftWall key={`${row}-${i}`} r={7.6 - i * 1.6 - (row % 2) * 0.8} z={WALL - 16 - row * 28}>
                <text x="0" y="0" fontSize="12" fontFamily="var(--font-kaushan), cursive" fill="#fff" opacity=".06">Score26</text>
              </LeftWall>
            )))}
            <polygon points={pts(iso(1.2, 0, WALL), iso(3.4, 3.8, 0), iso(5.2, 3.0, 0))} fill="url(#rm-spot)" />
            <polygon points={pts(iso(7, 0, WALL), iso(3.0, 3.4, 0), iso(4.8, 4.4, 0))} fill="url(#rm-spot)" />
          </g>
        )}

        {/* Boden */}
        {Array.from({ length: N }, (_, c) => Array.from({ length: N }, (_, r) => (
          <Floor key={`${c}-${r}`} c={c} r={r} w={1} d={1} fill={(c + r) % 2 ? floorA : floorB} />
        )))}
        {level >= 1 && <Floor c={2.8} r={0.4} w={2.4} d={4.2} fill={level >= 2 ? "#4b1f52" : "#2f3b33"} />}
        {level >= 4 && <Floor c={2.8} r={0.4} w={2.4} d={4.2} fill={PINK} opacity={0.18} />}
        {level >= 2 && <Floor c={1.6} r={4.6} w={2.6} d={2.4} fill="#2a2440" opacity={0.85} />}
        {/* Abwurflinie */}
        <polygon points={pts(iso(3.2, 3.55), iso(4.8, 3.55), iso(4.8, 3.65), iso(3.2, 3.65))} fill={level >= 3 ? CYAN : "#f2f2f2"} />

        {/* Rechte Wand: Board, Neon, Poster */}
        <RightWall c={BOARD_C} z={BOARD_Z}>
          {level >= 1 && <circle r="40" fill="url(#rm-ring)" />}
          {level >= 1 && <circle r="31" fill="none" stroke="#f5f5f5" strokeWidth="3" />}
          <circle r="27" fill="#0f0f0f" />
          {Array.from({ length: 20 }, (_, i) => {
            const a1 = ((i * 18 - 9) * Math.PI) / 180, a2 = (((i + 1) * 18 - 9) * Math.PI) / 180;
            const p = (r: number, a: number) => `${(Math.sin(a) * r).toFixed(2)} ${(-Math.cos(a) * r).toFixed(2)}`;
            return (
              <g key={i}>
                <path d={`M0 0 L${p(23, a1)} A23 23 0 0 1 ${p(23, a2)} Z`} fill={i % 2 ? "#efe3c8" : "#1a1a1a"} />
                <path d={`M${p(21, a1)} A21 21 0 0 1 ${p(21, a2)} L${p(23, a2)} A23 23 0 0 0 ${p(23, a1)} Z`} fill={i % 2 ? "#1f8a4c" : "#c8312f"} />
                <path d={`M${p(12, a1)} A12 12 0 0 1 ${p(12, a2)} L${p(14, a2)} A14 14 0 0 0 ${p(14, a1)} Z`} fill={i % 2 ? "#1f8a4c" : "#c8312f"} />
              </g>
            );
          })}
          <circle r="2.8" fill="#1f8a4c" /><circle r="1.4" fill="#c8312f" />
        </RightWall>
        {level === 0 && (() => { const p = iso(BOARD_C, 0.4, WALL); return <g><line x1={p.x} y1={p.y} x2={p.x} y2={p.y + 22} stroke="#222" /><circle cx={p.x} cy={p.y + 26} r="5" fill="#ffe9a8" style={{ filter: "drop-shadow(0 0 8px #ffe9a8)" }} /></g>; })()}
        {level >= 2 && (
          <RightWall c={5.7} z={118}>
            <text x="0" y="0" fontSize="26" fontFamily="var(--font-kaushan), cursive" fill={PINK} style={{ filter: `drop-shadow(0 0 5px ${PINK})` }}>Club<tspan fill={CYAN} style={{ filter: `drop-shadow(0 0 5px ${CYAN})` }}>26</tspan></text>
          </RightWall>
        )}
        {level >= 1 && level < 4 && (
          <RightWall c={1.2} z={110}>
            <rect width="34" height="46" fill={CYAN} opacity=".85" />
            <text x="17" y="28" textAnchor="middle" fontSize="13" fontWeight="700" fill="#0b2a2f" fontFamily="var(--font-oswald), sans-serif">180</text>
          </RightWall>
        )}

        {/* Linke Wand: Tafel, Pokalregal, On Air, Großbild */}
        <LeftWall r={7.2} z={104}>
          <rect width="58" height="66" rx="3" fill="#1d2a22" stroke="#6b4a2b" strokeWidth="4" />
          <text x="29" y="20" textAnchor="middle" fontSize="11" fill="#e6e6e6" fontFamily="var(--font-oswald), sans-serif">501</text>
          <line x1="8" y1="26" x2="50" y2="26" stroke="#e6e6e6" strokeWidth=".7" />
          <text x="29" y="40" textAnchor="middle" fontSize="9" fill="#e6e6e6" fontFamily="var(--font-oswald), sans-serif">441</text>
          <text x="29" y="54" textAnchor="middle" fontSize="9" fill="#e6e6e6" fontFamily="var(--font-oswald), sans-serif">321</text>
        </LeftWall>
        <LeftWall r={3.6} z={74}>
          <rect x="0" y="0" width="98" height="5" fill="#6b4a2b" />
          {trophies.slice(0, 4).map((_, i) => (
            <g key={i} transform={`translate(${12 + i * 24} 0)`}>
              <path d="M-7 -22 H7 V-16 Q7 -9 0 -8 Q-7 -9 -7 -16 Z" fill="url(#rm-gold)" />
              <rect x="-1.5" y="-8" width="3" height="4" fill={GOLD} /><rect x="-5" y="-4" width="10" height="4" fill="#3a2a10" />
            </g>
          ))}
          {Array.from({ length: Math.min(medals, 7) }, (_, i) => (
            <g key={"m" + i} transform={`translate(${8 + i * 13} 18)`}>
              <path d="M-3 -9 L0 -3 L3 -9" stroke={i % 2 ? CYAN : PINK} strokeWidth="2" fill="none" />
              <circle r="4.5" fill="url(#rm-gold)" />
            </g>
          ))}
          {trophies.length === 0 && <text x="49" y="-6" textAnchor="middle" fontSize="8" fill="#fff" opacity=".45">Pokalregal</text>}
        </LeftWall>
        {level >= 3 && (
          <LeftWall r={2} z={WALL - 10}>
            <rect width="52" height="16" rx="3" fill="#ef3340" style={{ filter: "drop-shadow(0 0 6px #ef3340)" }} />
            <text x="26" y="12" textAnchor="middle" fontSize="10" fontWeight="700" fill="#fff" fontFamily="var(--font-oswald), sans-serif">ON AIR</text>
          </LeftWall>
        )}

        {/* Steckende Darts */}
        {s.darts.map((d, i) => { const p = boardPoint(d.x, d.y); return <g key={i}><line x1={p.x} y1={p.y} x2={p.x - 4} y2={p.y + 9} stroke={dartColor(look.darts)} strokeWidth="2.2" strokeLinecap="round" /><path d={`M${p.x - 4} ${p.y + 9} l-3 4 l4 -1 l2 3 z`} fill={dartColor(look.darts)} /></g>; })}

        {items.map((it) => <g key={it.key}>{it.node}</g>)}

        {/* Fliegender Dart */}
        {s.flying && (() => {
          const t = s.flying.t, to = boardPoint(s.flying.to[0], s.flying.to[1]);
          const x = hand.x + (to.x - hand.x) * t, y = hand.y + (to.y - hand.y) * t - Math.sin(t * Math.PI) * 14;
          return <line x1={x} y1={y} x2={x - 5} y2={y + 6} stroke={dartColor(look.darts)} strokeWidth="2.4" strokeLinecap="round" />;
        })()}
      </svg>
    </div>
  );
}
