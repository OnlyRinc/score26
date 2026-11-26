"use client";
// Dartraum in Schrägansicht (isometrisch). Die Figur läuft herum, wirft, holt die Darts,
// sitzt auf der Couch, trinkt an der Bar und streamt am Schreibtisch.
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Look } from "@/lib/dartraum/catalog";
import { Figure, shade, type Pose } from "./Figure";
import { Dart, DART_LENGTH } from "./Dart";

const PINK = "#d63ce0", CYAN = "#5fe3f0", GOLD = "#e8c25a", OUT = "#1a1222";
const N = 8, HW = 34, HH = 17, WALL = 150;
const OX = 300, OY = WALL + 26;
const VB_W = 600, VB_H = OY + N * HH * 2 + 14;
const FIG_SCALE = 0.85;

const iso = (c: number, r: number, z = 0) => ({ x: OX + (c - r) * HW, y: OY + (c + r) * HH - z });
const pts = (...p: { x: number; y: number }[]) => p.map((q) => `${q.x.toFixed(1)},${q.y.toFixed(1)}`).join(" ");

/** Quader: c/r hintere Ecke, w entlang c, d entlang r, h Höhe; Seiten werden aus der Grundfarbe schattiert */
function Box({ c, r, w, d, h, color, z = 0, top, stroke = true }: { c: number; r: number; w: number; d: number; h: number; color: string; z?: number; top?: string; stroke?: boolean }) {
  const t = [iso(c, r, z + h), iso(c + w, r, z + h), iso(c + w, r + d, z + h), iso(c, r + d, z + h)];
  const lf = [iso(c, r + d, z + h), iso(c + w, r + d, z + h), iso(c + w, r + d, z), iso(c, r + d, z)];
  const rt = [iso(c + w, r, z + h), iso(c + w, r + d, z + h), iso(c + w, r + d, z), iso(c + w, r, z)];
  const s = stroke ? { stroke: OUT, strokeWidth: 0.8, strokeLinejoin: "round" as const } : {};
  return (
    <g>
      <polygon points={pts(...lf)} fill={shade(color, -0.12)} {...s} />
      <polygon points={pts(...rt)} fill={shade(color, -0.32)} {...s} />
      <polygon points={pts(...t)} fill={top ?? shade(color, 0.12)} {...s} />
    </g>
  );
}
const Floor = ({ c, r, w, d, fill, opacity, stroke }: { c: number; r: number; w: number; d: number; fill: string; opacity?: number; stroke?: string }) => (
  <polygon points={pts(iso(c, r), iso(c + w, r), iso(c + w, r + d), iso(c, r + d))} fill={fill} opacity={opacity} stroke={stroke} strokeWidth={stroke ? 0.8 : 0} />
);
const Shadow = ({ c, r, w, d, o = 0.3 }: { c: number; r: number; w: number; d: number; o?: number }) => (
  <Floor c={c - 0.05} r={r - 0.05} w={w + 0.25} d={d + 0.25} fill="#000" opacity={o} />
);
/** Flach an die rechte Wand (r = 0). x läuft entlang der Wand nach rechts, y nach unten. */
const RightWall = ({ c, z, children }: { c: number; z: number; children: ReactNode }) => {
  const p = iso(c, 0, z);
  return <g transform={`translate(${p.x} ${p.y}) matrix(1 0.5 0 1 0 0)`}>{children}</g>;
};
/** Flach an die linke Wand (c = 0). x läuft zur hinteren Ecke. */
const LeftWall = ({ r, z, children }: { r: number; z: number; children: ReactNode }) => {
  const p = iso(0, r, z);
  return <g transform={`translate(${p.x} ${p.y}) matrix(1 -0.5 0 1 0 0)`}>{children}</g>;
};
const UNIT = HW;

// ---------------- Ablauf ----------------
type Facing = "NE" | "NW" | "SE" | "SW";
type Task =
  | { kind: "walk"; to: [number, number] }
  | { kind: "throw" | "sit" | "idle" | "desk" | "drink" | "collect"; dur: number; face: Facing };

const BOARD_C = 4, BOARD_Z = 86;
const OCHE_R = 3.6;
/** Füße stehen hinter der Abwurflinie (weiter weg vom Board) */
const STAND: [number, number] = [4.05, OCHE_R + 0.62];

function plan(level: number, rand: () => number): Task[] {
  const t: Task[] = [];
  const go = (c: number, r: number) => t.push({ kind: "walk", to: [NaN, r] }, { kind: "walk", to: [c, r] });
  go(...STAND);
  t.push({ kind: "throw", dur: 3 * 1.15, face: "NE" });
  t.push({ kind: "walk", to: [4, 0.75] }, { kind: "collect", dur: 1.1, face: "NE" }, { kind: "walk", to: [4, 2.6] });
  const extra: (() => void)[] = [
    () => { go(2.4 + rand() * 3, 4.8 + rand() * 1.8); t.push({ kind: "idle", dur: 1.5 + rand() * 2, face: rand() < 0.5 ? "SE" : "SW" }); },
  ];
  if (level >= 2) {
    extra.push(() => { go(2.3, 5.5); t.push({ kind: "walk", to: [1.0, 5.5] }, { kind: "sit", dur: 4 + rand() * 3, face: "SE" }, { kind: "walk", to: [2.3, 5.5] }); });
    extra.push(() => { go(5.55, 6.1); t.push({ kind: "drink", dur: 3.5, face: "SE" }); });
  }
  if (level >= 3) extra.push(() => { go(5.3, 2.0); t.push({ kind: "walk", to: [6.9, 2.0] }, { kind: "desk", dur: 4.5 + rand() * 2, face: "NE" }, { kind: "walk", to: [5.3, 2.0] }); });
  extra[Math.floor(rand() * extra.length)]();
  if (rand() < 0.4) extra[Math.floor(rand() * extra.length)]();
  return t;
}

interface Sim {
  c: number; r: number; facing: Facing; pose: Pose; phase: number; tasks: Task[]; t: number;
  darts: { x: number; y: number }[]; flying: { to: [number, number]; t: number } | null; bubble: string | null;
}
const faceOf = (dc: number, dr: number): Facing => (Math.abs(dc) > Math.abs(dr) ? (dc > 0 ? "SE" : "NW") : dr > 0 ? "SW" : "NE");
const boardPoint = (lx: number, ly: number) => { const p = iso(BOARD_C, 0, BOARD_Z); return { x: p.x + lx, y: p.y + lx * 0.5 + ly }; };
const CALLS = ["Game on!", "Ton!", "Shot!", "Double!", "Come on!"];

function useSim(level: number) {
  const sim = useRef<Sim>({ c: 3, r: 5, facing: "SE", pose: "stand", phase: 0, tasks: [], t: 0, darts: [], flying: null, bubble: null });
  const [, setFrame] = useState(0);
  useEffect(() => {
    let raf = 0, last = performance.now();
    const rand = Math.random;
    sim.current.tasks = [];
    sim.current.darts = [];
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
        if (dist < 0.02) { s.c = tc; s.r = tr; s.tasks.shift(); s.t = 0; }
        else {
          const k = Math.min(1, (1.6 * dt) / dist);
          s.c += dc * k; s.r += dr * k;
          s.facing = faceOf(dc, dr);
          s.pose = "walk";
          s.phase = (s.phase + dt * 1.9) % 1;
        }
      } else {
        s.t += dt;
        s.facing = task.face;
        s.pose = task.kind === "throw" ? "throw" : task.kind === "sit" ? "sit" : task.kind === "drink" ? "drink" : "stand";
        if (task.kind === "throw") {
          const n = Math.floor(s.t / 1.15), within = (s.t % 1.15) / 1.15;
          s.phase = within;
          if (within >= 0.7 && !s.flying && s.darts.length <= n && n < 3) {
            const a = rand() * Math.PI * 2, rad = Math.sqrt(rand()) * 20;
            s.flying = { to: [Math.cos(a) * rad, Math.sin(a) * rad], t: 0 };
          }
          if (s.t > 3.2 && !s.bubble && rand() < 0.5) s.bubble = CALLS[Math.floor(rand() * CALLS.length)];
        } else if (task.kind === "drink") s.phase = (s.t / 1.8) % 1;
        else s.phase = 0;
        if (task.kind === "collect" && s.t > 0.6) s.darts = [];
        if (s.t >= task.dur) { s.tasks.shift(); s.t = 0; s.pose = "stand"; s.bubble = null; }
      }
      if (s.flying) {
        s.flying.t += dt / 0.22;
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

// ---------------- Dartboard ----------------
const NUMBERS = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
function Board({ level }: { level: number }) {
  const p = (r: number, a: number) => `${(Math.sin(a) * r).toFixed(2)} ${(-Math.cos(a) * r).toFixed(2)}`;
  const seg = (r1: number, r2: number, a1: number, a2: number) => `M${p(r1, a1)} A${r1} ${r1} 0 0 1 ${p(r1, a2)} L${p(r2, a2)} A${r2} ${r2} 0 0 0 ${p(r2, a1)} Z`;
  return (
    <g>
      {level >= 2 && <circle r="44" fill="none" stroke="#fff" strokeWidth="5" style={{ filter: "drop-shadow(0 0 6px #fff) drop-shadow(0 0 14px #bfefff)" }} />}
      {level >= 1 && <circle r="38" fill="#111" stroke={OUT} strokeWidth="1" />}
      <circle r="31" fill="#121212" stroke={OUT} strokeWidth="1" />
      {NUMBERS.map((n, i) => {
        const a = (i * 18 * Math.PI) / 180, x = Math.sin(a) * 27, y = -Math.cos(a) * 27;
        return <text key={n} x={x} y={y + 1.8} textAnchor="middle" fontSize="5" fontWeight="700" fill="#f4f4f6" fontFamily="var(--font-oswald), sans-serif">{n}</text>;
      })}
      {NUMBERS.map((_, i) => {
        const a1 = ((i * 18 - 9) * Math.PI) / 180, a2 = (((i + 1) * 18 - 9) * Math.PI) / 180;
        const dark = i % 2 === 0, base = dark ? "#1c1c1c" : "#efe1c2", ring = dark ? "#d0312d" : "#1e8c4c";
        return (
          <g key={i}>
            <path d={seg(22.5, 0.01, a1, a2)} fill={base} />
            <path d={seg(22.5, 20.6, a1, a2)} fill={ring} />
            <path d={seg(14.2, 12.4, a1, a2)} fill={ring} />
          </g>
        );
      })}
      <g stroke="#c9ccd3" strokeWidth=".35" fill="none" opacity=".8">
        {[22.5, 20.6, 14.2, 12.4].map((r) => <circle key={r} r={r} />)}
        {NUMBERS.map((_, i) => { const a = ((i * 18 - 9) * Math.PI) / 180; return <path key={i} d={`M${p(3.2, a)} L${p(22.5, a)}`} />; })}
      </g>
      <circle r="3.2" fill="#1e8c4c" stroke="#c9ccd3" strokeWidth=".35" /><circle r="1.5" fill="#d0312d" />
      <ellipse cx="-9" cy="-14" rx="10" ry="5" fill="#fff" opacity=".06" transform="rotate(-30)" />
    </g>
  );
}

// ---------------- Raum ----------------
export function Room({ level, look, name, trophies, medals }: { level: number; look: Look; name: string; trophies: number; medals: number }) {
  const s = useSim(level);
  const theme = [
    { wallR: "#7c7873", wallL: "#67635e", floor: "#8f8a84" },
    { wallR: "#d9cdb8", wallL: "#c4b7a1", floor: "#a8794e" },
    { wallR: "#4d2856", wallL: "#3c1f44", floor: "#7a5236" },
    { wallR: "#26233c", wallL: "#1d1a30", floor: "#2b2838" },
    { wallR: "#17131f", wallL: "#110e18", floor: "#1b1724" },
  ][level];

  const items: { depth: number; node: ReactNode; key: string }[] = [];
  const add = (key: string, depth: number, node: ReactNode) => items.push({ key, depth, node });

  // ---- Möbel je Stufe ----
  add("plant", 1.6, (
    <g>
      <Shadow c={0.45} r={0.45} w={0.55} d={0.55} />
      <Box c={0.45} r={0.45} w={0.55} d={0.55} h={20} color={level >= 2 ? "#2a2a33" : "#a0623a"} />
      {(() => {
        const b = iso(0.72, 0.72, 20);
        const leaves = [[-14, -26, -40], [12, -30, 35], [0, -44, 0], [-8, -38, -20], [9, -18, 50], [-16, -14, -60], [4, -34, 15]];
        return leaves.map(([dx, dy, rot], i) => (
          <ellipse key={i} cx={b.x + dx} cy={b.y + dy} rx="5.5" ry="15" transform={`rotate(${rot} ${b.x + dx} ${b.y + dy})`} fill={i % 2 ? "#3f8a52" : "#2f6f40"} stroke={OUT} strokeWidth=".7" />
        ));
      })()}
    </g>
  ));
  if (level === 0) {
    add("crate", 13.6, <g><Shadow c={6.3} r={6.3} w={0.8} d={0.8} /><Box c={6.3} r={6.3} w={0.8} d={0.8} h={22} color="#b58a55" />{(() => { const a = iso(6.3, 7.1, 11), b = iso(7.1, 7.1, 11); return <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={OUT} strokeWidth=".6" />; })()}</g>);
    add("crate2", 13.9, <Box c={6.5} r={6.4} w={0.55} d={0.55} h={16} z={22} color="#9a7446" />);
  }
  if (level === 1) {
    const b = iso(1.1, 1.1);
    add("lamp", 2.2, (
      <g>
        <ellipse cx={b.x} cy={b.y} rx="9" ry="4.5" fill="#222" stroke={OUT} strokeWidth=".8" />
        <rect x={b.x - 1.2} y={b.y - 70} width="2.4" height="70" fill="#333" />
        <path d={`M${b.x - 11} ${b.y - 64} L${b.x - 7} ${b.y - 80} H${b.x + 7} L${b.x + 11} ${b.y - 64} Z`} fill="#f3e6c8" stroke={OUT} strokeWidth=".8" />
        <ellipse cx={b.x} cy={b.y - 64} rx="11" ry="3" fill="#ffe9a8" opacity=".8" />
      </g>
    ));
  }
  if (level >= 2) {
    const col = level >= 4 ? "#2b2b36" : "#7b8b7e";
    add("sofa-shadow", 0, <Shadow c={0.1} r={4.3} w={1.3} d={2.5} o={0.25} />);
    add("sofa-back", 5.9, <Box c={0.1} r={4.5} w={0.4} d={2.0} h={38} color={shade(col, -0.05)} />);
    add("sofa-base", 6.3, <Box c={0.5} r={4.55} w={0.85} d={1.9} h={9} color={shade(col, -0.15)} />);
    add("sofa-c1", 6.0, <Box c={0.52} r={4.6} w={0.8} d={0.92} h={6} z={9} color={col} />);
    add("sofa-c2", 6.9, <Box c={0.52} r={5.55} w={0.8} d={0.92} h={6} z={9} color={col} />);
    add("sofa-arm1", 5.2, <Box c={0.1} r={4.3} w={1.3} d={0.3} h={22} color={shade(col, -0.05)} />);
    add("sofa-arm2", 7.45, <Box c={0.1} r={6.45} w={1.3} d={0.3} h={22} color={shade(col, -0.05)} />);
    add("pillow", 6.2, (() => { const p = iso(0.55, 4.95, 30); return <g><rect x={p.x - 7} y={p.y - 6} width="14" height="12" rx="4" fill={PINK} stroke={OUT} strokeWidth=".8" transform={`rotate(-12 ${p.x} ${p.y})`} /><text x={p.x} y={p.y + 2} textAnchor="middle" fontSize="6" fontFamily="var(--font-kaushan), cursive" fill="#fff">26</text></g>; })());
    add("bar-shadow", 0, <Shadow c={6.3} r={5.3} w={1.6} d={1.3} />);
    add("bar", 13.1, (
      <g>
        <Box c={6.4} r={5.4} w={1.4} d={1.15} h={38} color="#5a3a22" top="#2a2a33" />
        {[0.2, 0.5, 0.8, 1.1].map((f) => { const a = iso(6.4 + f, 6.55, 36), b = iso(6.4 + f, 6.55, 3); return <line key={f} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={shade("#5a3a22", -0.35)} strokeWidth="1" />; })}
        {(() => { const a = iso(6.4, 6.55, 34), b = iso(7.8, 6.55, 34); return <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={level >= 3 ? CYAN : PINK} strokeWidth="1.6" style={{ filter: `drop-shadow(0 0 3px ${level >= 3 ? CYAN : PINK})` }} />; })()}
      </g>
    ));
    add("bottles", 13.0, (
      <g>{([["#2f6f40", 0], ["#8a3d1e", 0.3], [CYAN, 0.6], ["#ffd23f", 0.9], [PINK, 1.15]] as [string, number][]).map(([col, f], i) => {
        const p = iso(6.6 + f, 5.75, 38);
        return <g key={i}><rect x={p.x - 2.6} y={p.y - 15} width="5.2" height="15" rx="1.6" fill={col} stroke={OUT} strokeWidth=".6" /><rect x={p.x - 1} y={p.y - 19} width="2" height="5" fill={col} stroke={OUT} strokeWidth=".5" /><rect x={p.x - 1.6} y={p.y - 12} width="1.2" height="8" fill="#fff" opacity=".35" /></g>;
      })}</g>
    ));
    [6.75, 7.4].forEach((c, i) => add("stool" + i, c + 7.1, (() => {
      const b = iso(c, 7.0), t = iso(c, 7.0, 24);
      return <g><line x1={b.x} y1={b.y} x2={t.x} y2={t.y} stroke="#888" strokeWidth="2" /><ellipse cx={b.x} cy={b.y} rx="7" ry="3.5" fill="#444" /><ellipse cx={t.x} cy={t.y} rx="8.5" ry="4.2" fill={PINK} stroke={OUT} strokeWidth=".8" /><ellipse cx={t.x} cy={t.y - 1} rx="6" ry="2.5" fill="#fff" opacity=".2" /></g>;
    })()));
  }
  if (level >= 3) {
    add("desk-shadow", 0, <Shadow c={6.0} r={0.25} w={1.75} d={1.0} />);
    add("desk", 7.5, (
      <g>
        <Box c={6.05} r={0.3} w={1.7} d={0.95} h={30} color="#1f1f28" top="#2c2c38" />
        {(() => { const a = iso(6.05, 1.25, 29), b = iso(7.75, 1.25, 29); return <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={PINK} strokeWidth="1.6" style={{ filter: `drop-shadow(0 0 3px ${PINK})` }} />; })()}
      </g>
    ));
    add("monitors", 7.6, (
      <g>
        {[0, 1].map((i) => {
          const c = 6.15 + i * 0.8;
          const a = iso(c, 0.55, 32), b = iso(c + 0.7, 0.55, 32);
          const st = iso(c + 0.35, 0.55, 30);
          const h = 30;
          return (
            <g key={i}>
              <rect x={st.x - 1.5} y={st.y - 6} width="3" height="6" fill="#333" />
              <polygon points={pts(a, b, { x: b.x, y: b.y - h }, { x: a.x, y: a.y - h })} fill="#0d0d14" stroke={OUT} strokeWidth=".9" />
              <polygon points={pts({ x: a.x + 2, y: a.y - 3 }, { x: b.x - 2, y: b.y - 3 }, { x: b.x - 2, y: b.y - h + 3 }, { x: a.x + 2, y: a.y - h + 3 })} fill={i ? "#0f2a33" : "#2a0f33"} />
              {i === 0 ? (
                <g transform={`translate(${a.x + 4} ${a.y - h + 8}) matrix(1 0.5 0 1 0 0)`}>
                  <rect width="8" height="3.5" rx="1" fill="#ef3340" /><text x="4" y="2.8" textAnchor="middle" fontSize="2.8" fontWeight="700" fill="#fff" fontFamily="var(--font-oswald), sans-serif">LIVE</text>
                  <text x="0" y="12" fontSize="6" fontWeight="700" fill={PINK} fontFamily="var(--font-oswald), sans-serif">180</text>
                </g>
              ) : (
                <g transform={`translate(${a.x + 4} ${a.y - h + 8}) matrix(1 0.5 0 1 0 0)`}>
                  {[0, 1, 2, 3].map((k) => <rect key={k} x="0" y={k * 4} width={6 + ((k * 7) % 9)} height="2" fill={CYAN} opacity=".7" />)}
                </g>
              )}
            </g>
          );
        })}
      </g>
    ));
    add("chair", 9.95, (
      <g>
        {(() => { const b = iso(7.55, 2.4); return <ellipse cx={b.x} cy={b.y} rx="10" ry="5" fill="#222" stroke={OUT} strokeWidth=".7" />; })()}
        <Box c={7.3} r={2.15} w={0.5} d={0.5} h={6} z={14} color="#1b1b22" />
        <Box c={7.3} r={2.55} w={0.5} d={0.12} h={36} z={14} color="#1b1b22" />
        <Box c={7.33} r={2.53} w={0.44} d={0.05} h={30} z={18} color={PINK} />
      </g>
    ));
    add("camera", 1.5 + 2.4, (() => {
      const p = iso(1.5, 2.4);
      return (
        <g>
          <path d={`M${p.x} ${p.y - 40} L${p.x - 9} ${p.y} M${p.x} ${p.y - 40} L${p.x + 9} ${p.y} M${p.x} ${p.y - 40} L${p.x + 1} ${p.y + 3}`} stroke="#555" strokeWidth="1.6" />
          <rect x={p.x - 8} y={p.y - 51} width="16" height="11" rx="2" fill="#1b1b22" stroke={OUT} strokeWidth=".8" />
          <circle cx={p.x + 7} cy={p.y - 45.5} r="4.5" fill="#333" stroke="#888" strokeWidth=".8" /><circle cx={p.x + 7} cy={p.y - 45.5} r="2" fill="#5fe3f0" opacity=".6" />
          <circle cx={p.x - 5} cy={p.y - 48} r="1.3" fill="#ef3340" style={{ filter: "drop-shadow(0 0 2px #ef3340)" }} />
        </g>
      );
    })());
    add("ringlight", 6.6, (() => {
      const p = iso(5.6, 0.8);
      return <g><line x1={p.x} y1={p.y} x2={p.x} y2={p.y - 58} stroke="#555" strokeWidth="1.6" /><ellipse cx={p.x} cy={p.y} rx="7" ry="3.5" fill="#333" /><circle cx={p.x} cy={p.y - 66} r="9" fill="none" stroke="#fff" strokeWidth="3.2" style={{ filter: "drop-shadow(0 0 5px #fff)" }} /></g>;
    })());
  }

  // ---- Figur ----
  const fp = iso(s.c, s.r);
  const view = s.facing === "NE" || s.facing === "NW" ? "back" : "front";
  const mirror = s.facing === "SW" || s.facing === "NW";
  const sitShift = s.pose === "sit" ? 4 : 0;
  add("figure", s.c + s.r + (s.pose === "sit" ? 0.25 : 0.02), (
    <g transform={`translate(${fp.x} ${fp.y - sitShift}) scale(${FIG_SCALE})`}>
      <Figure look={look} name={name} view={view} mirror={mirror} pose={s.pose} phase={s.phase} uid="room" />
    </g>
  ));
  items.sort((a, b) => a.depth - b.depth);

  const hand = { x: fp.x + 34, y: fp.y - 79 };
  const dartLen = DART_LENGTH(look.darts);
  const dartAt = (x: number, y: number, k: string) => (
    <g key={k} transform={`translate(${x} ${y}) rotate(-26.6) scale(0.2) translate(${-dartLen + 2} 0)`}><Dart setup={look.darts} uid={k} /></g>
  );

  const wallDecor = () => {
    if (level === 0) return (
      <g opacity=".35">
        {Array.from({ length: 7 }, (_, row) => Array.from({ length: 9 }, (_, i) => (
          <g key={`${row}-${i}`}>
            <RightWall c={i - (row % 2) * 0.5} z={WALL - row * 21}><rect x="0" y="0" width={UNIT - 2} height="19" rx="1" fill="none" stroke="#3a3632" /></RightWall>
            <LeftWall r={N - i + (row % 2) * 0.5} z={WALL - row * 21}><rect x="0" y="0" width={UNIT - 2} height="19" rx="1" fill="none" stroke="#2f2b28" /></LeftWall>
          </g>
        )))}
      </g>
    );
    if (level === 1) return (
      <g>
        <polygon points={pts(iso(0, 0, 0), iso(N, 0, 0), iso(N, 0, 48), iso(0, 0, 48))} fill="#7a5236" />
        <polygon points={pts(iso(0, 0, 0), iso(0, N, 0), iso(0, N, 48), iso(0, 0, 48))} fill="#6a4630" />
        {Array.from({ length: 16 }, (_, i) => (
          <g key={i}>
            <RightWall c={i * 0.5} z={48}><line x1="0" y1="0" x2="0" y2="48" stroke="#5a3a22" strokeWidth="1" /></RightWall>
            <LeftWall r={N - i * 0.5} z={48}><line x1="0" y1="0" x2="0" y2="48" stroke="#4a2e1a" strokeWidth="1" /></LeftWall>
          </g>
        ))}
        <polygon points={pts(iso(0, 0, 48), iso(N, 0, 48), iso(N, 0, 52), iso(0, 0, 52))} fill="#5a3a22" />
        <polygon points={pts(iso(0, 0, 48), iso(0, N, 48), iso(0, N, 52), iso(0, 0, 52))} fill="#4a2e1a" />
      </g>
    );
    if (level === 2) return (
      <g opacity=".5">
        {Array.from({ length: 16 }, (_, i) => (
          <g key={i}>
            <RightWall c={i * 0.5 + 0.25} z={WALL}><rect x="-1" y="0" width="2" height={WALL} fill="#3a1d42" /></RightWall>
            <LeftWall r={N - i * 0.5 - 0.25} z={WALL}><rect x="-1" y="0" width="2" height={WALL} fill="#2d1634" /></LeftWall>
          </g>
        ))}
      </g>
    );
    if (level === 3) return (
      <g>
        {Array.from({ length: 4 }, (_, row) => Array.from({ length: 5 }, (_, i) => (
          <LeftWall key={`${row}-${i}`} r={6.6 - i * 0.85} z={128 - row * 26}>
            <rect x="0" y="0" width={UNIT * 0.8} height="24" fill={(i + row) % 2 ? "#2a2540" : "#332d4d"} stroke="#15121f" strokeWidth="1" />
            <path d={`M0 0 L${UNIT * 0.4} 12 L${UNIT * 0.8} 0 M0 24 L${UNIT * 0.4} 12 L${UNIT * 0.8} 24`} stroke="#15121f" strokeWidth=".7" fill="none" />
          </LeftWall>
        )))}
      </g>
    );
    return (
      <g>
        {Array.from({ length: 5 }, (_, row) => Array.from({ length: 5 }, (_, i) => (
          <RightWall key={`${row}-${i}`} c={0.3 + i * 1.6 + (row % 2) * 0.8} z={140 - row * 26}>
            <text x="0" y="0" fontSize="11" fontFamily="var(--font-kaushan), cursive" fill="#fff" opacity=".08">Score26</text>
          </RightWall>
        )))}
      </g>
    );
  };

  const flightFrac = s.flying?.t ?? 0;
  const flyTo = s.flying ? boardPoint(s.flying.to[0], s.flying.to[1]) : null;
  const shownName = name.toUpperCase().slice(0, 12);

  return (
    <div className="relative overflow-hidden rounded-3xl border border-line bg-[radial-gradient(ellipse_at_center,#2a1530,#07070b_70%)]">
      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="block w-full" role="img" aria-label="Dartraum in 3D">
        <defs>
          <linearGradient id="rm-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff1b8" /><stop offset=".5" stopColor={GOLD} /><stop offset="1" stopColor="#a87b1c" /></linearGradient>
          <linearGradient id="rm-spot" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".3" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient>
          <radialGradient id="rm-pool" cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#fff6d8" stopOpacity=".35" /><stop offset="1" stopColor="#fff6d8" stopOpacity="0" /></radialGradient>
          <linearGradient id="rm-wallshade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#000" stopOpacity=".25" /><stop offset=".6" stopColor="#000" stopOpacity="0" /></linearGradient>
        </defs>

        {/* Wände */}
        <polygon points={pts(iso(0, 0), iso(N, 0), iso(N, 0, WALL), iso(0, 0, WALL))} fill={theme.wallR} />
        <polygon points={pts(iso(0, 0), iso(0, N), iso(0, N, WALL), iso(0, 0, WALL))} fill={theme.wallL} />
        {wallDecor()}
        <polygon points={pts(iso(0, 0), iso(N, 0), iso(N, 0, WALL), iso(0, 0, WALL))} fill="url(#rm-wallshade)" />
        <polygon points={pts(iso(0, 0), iso(0, N), iso(0, N, WALL), iso(0, 0, WALL))} fill="url(#rm-wallshade)" />
        <polygon points={pts(iso(0, 0, WALL), iso(N, 0, WALL), iso(N, -0.22, WALL), iso(-0.22, -0.22, WALL), iso(-0.22, N, WALL), iso(0, N, WALL))} fill="#d8d2ca" stroke={OUT} strokeWidth=".8" />
        <polygon points={pts(iso(N, 0, WALL), iso(N, -0.22, WALL), iso(N, -0.22, 0), iso(N, 0, 0))} fill="#b5aea5" stroke={OUT} strokeWidth=".8" />
        <polygon points={pts(iso(0, N, WALL), iso(-0.22, N, WALL), iso(-0.22, N, 0), iso(0, N, 0))} fill="#9c958c" stroke={OUT} strokeWidth=".8" />
        <line x1={iso(0, 0).x} y1={iso(0, 0).y} x2={iso(0, 0, WALL).x} y2={iso(0, 0, WALL).y} stroke="#000" strokeOpacity=".25" />
        <polygon points={pts(iso(0, 0, 0), iso(N, 0, 0), iso(N, 0, 6), iso(0, 0, 6))} fill={level >= 3 ? "#0d0b14" : shade(theme.wallR, -0.35)} />
        <polygon points={pts(iso(0, 0, 0), iso(0, N, 0), iso(0, N, 6), iso(0, 0, 6))} fill={level >= 3 ? "#0a0810" : shade(theme.wallL, -0.35)} />
        {level >= 3 && (
          <>
            <line x1={iso(0, 0, 6).x} y1={iso(0, 0, 6).y} x2={iso(N, 0, 6).x} y2={iso(N, 0, 6).y} stroke={CYAN} strokeWidth="1.5" style={{ filter: `drop-shadow(0 0 4px ${CYAN})` }} />
            <line x1={iso(0, 0, 6).x} y1={iso(0, 0, 6).y} x2={iso(0, N, 6).x} y2={iso(0, N, 6).y} stroke={PINK} strokeWidth="1.5" style={{ filter: `drop-shadow(0 0 4px ${PINK})` }} />
          </>
        )}

        {/* Rechte Wand: Board und Deko */}
        {level === 1 && (
          <RightWall c={BOARD_C} z={BOARD_Z}>
            <rect x="-74" y="-46" width="40" height="92" rx="2" fill="#6b4226" stroke={OUT} strokeWidth="1" />
            <rect x="-70" y="-42" width="32" height="84" fill="#1d2a22" />
            <rect x="34" y="-46" width="40" height="92" rx="2" fill="#6b4226" stroke={OUT} strokeWidth="1" />
            <rect x="38" y="-42" width="32" height="84" fill="#1d2a22" />
            {["501", "441", "360", "281"].map((v, i) => <text key={v} x="-54" y={-28 + i * 16} textAnchor="middle" fontSize="8" fill="#e6e6e6" fontFamily="var(--font-oswald), sans-serif">{v}</text>)}
            {["501", "401", "345"].map((v, i) => <text key={v} x="54" y={-28 + i * 16} textAnchor="middle" fontSize="8" fill="#e6e6e6" fontFamily="var(--font-oswald), sans-serif">{v}</text>)}
            <rect x="-34" y="-46" width="68" height="92" fill="#4a2e1a" stroke={OUT} strokeWidth="1" />
          </RightWall>
        )}
        {level >= 4 && (
          <RightWall c={BOARD_C} z={BOARD_Z}>
            <rect x="-70" y="-70" width="140" height="140" rx="6" fill="#0c0a12" stroke={PINK} strokeWidth="1.5" style={{ filter: `drop-shadow(0 0 6px ${PINK})` }} />
          </RightWall>
        )}
        <RightWall c={BOARD_C} z={BOARD_Z}><Board level={level} /></RightWall>
        {level === 0 && (() => { const p = iso(BOARD_C, 0.5, WALL); return <g><line x1={p.x} y1={p.y} x2={p.x} y2={p.y + 26} stroke="#222" /><circle cx={p.x} cy={p.y + 31} r="5.5" fill="#ffe9a8" style={{ filter: "drop-shadow(0 0 10px #ffe9a8)" }} /></g>; })()}
        {level >= 2 && (
          <RightWall c={5.85} z={128}>
            <text x="0" y="0" fontSize="27" fontFamily="var(--font-kaushan), cursive" fill={PINK} style={{ filter: `drop-shadow(0 0 4px ${PINK}) drop-shadow(0 0 10px ${PINK})` }}>Club<tspan fill={CYAN}>26</tspan></text>
          </RightWall>
        )}
        {level >= 1 && level <= 2 && (
          <RightWall c={1.0} z={118}>
            <rect width="40" height="54" fill="#f4f4f6" stroke={OUT} strokeWidth="1" />
            <rect x="3" y="3" width="34" height="48" fill={level === 1 ? "#1d4fd6" : "#1e8c9a"} />
            <text x="20" y="30" textAnchor="middle" fontSize="15" fontWeight="700" fill="#fff" fontFamily="var(--font-oswald), sans-serif">180</text>
            <text x="20" y="42" textAnchor="middle" fontSize="4.2" fill="#fff" fontFamily="var(--font-oswald), sans-serif">ONE HUNDRED</text>
            <text x="20" y="47" textAnchor="middle" fontSize="4.2" fill="#fff" fontFamily="var(--font-oswald), sans-serif">AND EIGHTY</text>
          </RightWall>
        )}

        {/* Linke Wand */}
        {level === 0 && (
          <LeftWall r={6.2} z={132}>
            <rect width="54" height="22" fill="#9fb7c9" stroke="#3a3632" strokeWidth="3" />
            <line x1="27" y1="0" x2="27" y2="22" stroke="#3a3632" strokeWidth="2" />
          </LeftWall>
        )}
        {level <= 2 && (
          <LeftWall r={7.3} z={108}>
            <rect width="60" height="70" rx="3" fill="#1d2a22" stroke="#6b4226" strokeWidth="4" />
            <text x="30" y="16" textAnchor="middle" fontSize="7" fill="#e6e6e6" fontFamily="var(--font-oswald), sans-serif">{shownName || "GAST"}</text>
            <line x1="8" y1="20" x2="52" y2="20" stroke="#e6e6e6" strokeWidth=".7" />
            {["501", "441", "321", "180!"].map((v, i) => <text key={v} x="30" y={32 + i * 10} textAnchor="middle" fontSize="8" fill="#e6e6e6" fontFamily="var(--font-oswald), sans-serif">{v}</text>)}
          </LeftWall>
        )}
        {level >= 3 && (
          <LeftWall r={7.6} z={128}>
            <rect width="84" height="52" rx="3" fill="#07070b" stroke="#333" strokeWidth="3" />
            <rect x="4" y="4" width="76" height="44" fill="#120a1a" />
            <text x="42" y="24" textAnchor="middle" fontSize="16" fontWeight="700" fill={PINK} fontFamily="var(--font-oswald), sans-serif" style={{ filter: `drop-shadow(0 0 3px ${PINK})` }}>180</text>
            <text x="42" y="38" textAnchor="middle" fontSize="6" fill={CYAN} fontFamily="var(--font-oswald), sans-serif">{shownName || "SCORE26"}</text>
          </LeftWall>
        )}
        <LeftWall r={3.7} z={76}>
          <rect x="0" y="0" width="100" height="5" fill="#6b4226" stroke={OUT} strokeWidth=".7" />
          <path d="M8 5 L12 14 M92 5 L88 14" stroke="#4a2e1a" strokeWidth="2" />
          {Array.from({ length: Math.min(trophies, 4) }, (_, i) => (
            <g key={i} transform={`translate(${14 + i * 24} 0)`}>
              <path d="M-7 -23 H7 V-17 Q7 -9 0 -8 Q-7 -9 -7 -17 Z" fill="url(#rm-gold)" stroke={OUT} strokeWidth=".6" />
              <path d="M-7 -21 Q-11 -20 -9 -15 M7 -21 Q11 -20 9 -15" stroke={GOLD} fill="none" strokeWidth="1.4" />
              <rect x="-1.5" y="-8" width="3" height="4" fill={GOLD} /><rect x="-5.5" y="-4" width="11" height="4" fill="#3a2a10" />
            </g>
          ))}
          {trophies === 0 && <text x="50" y="-5" textAnchor="middle" fontSize="7" fill="#fff" opacity=".5">Platz für Pokale</text>}
          {Array.from({ length: Math.min(medals, 7) }, (_, i) => (
            <g key={"m" + i} transform={`translate(${10 + i * 13} 22)`}>
              <path d="M-3 -10 L0 -3 L3 -10" stroke={i % 2 ? CYAN : PINK} strokeWidth="2" fill="none" />
              <circle r="4.5" fill="url(#rm-gold)" stroke={OUT} strokeWidth=".5" />
            </g>
          ))}
        </LeftWall>
        {level >= 3 && (
          <LeftWall r={2.4} z={WALL - 12}>
            <rect width="54" height="17" rx="3" fill="#ef3340" stroke={OUT} strokeWidth=".8" style={{ filter: "drop-shadow(0 0 6px #ef3340)" }} />
            <text x="27" y="12.5" textAnchor="middle" fontSize="10" fontWeight="700" fill="#fff" fontFamily="var(--font-oswald), sans-serif">ON AIR</text>
          </LeftWall>
        )}

        {/* Boden */}
        <polygon points={pts(iso(0, 0), iso(N, 0), iso(N, N), iso(0, N))} fill={theme.floor} />
        {level === 0 && (
          <g>
            {Array.from({ length: N }, (_, c) => Array.from({ length: N }, (_, r) => (c + r) % 3 === 0 ? <Floor key={`${c}-${r}`} c={c} r={r} w={1} d={1} fill="#000" opacity={0.04} /> : null))}
            <ellipse cx={iso(5.5, 5).x} cy={iso(5.5, 5).y} rx="26" ry="9" fill="#000" opacity=".08" />
            <path d={`M${iso(2, 6).x} ${iso(2, 6).y} l14 4 l6 -3 l10 5`} stroke="#000" strokeOpacity=".2" fill="none" />
          </g>
        )}
        {(level === 1 || level === 2) && (
          <g>
            {Array.from({ length: N * 3 }, (_, i) => {
              const r = i / 3; const a = iso(0, r), b = iso(N, r);
              return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#000" strokeOpacity=".18" strokeWidth=".8" />;
            })}
            {Array.from({ length: N * 3 }, (_, i) => {
              const r = i / 3, off = ((i * 37) % 7) / 1.1 + 0.3; const a = iso(off, r), b = iso(off, r + 1 / 3);
              return <line key={"j" + i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#000" strokeOpacity=".2" strokeWidth=".8" />;
            })}
          </g>
        )}
        {level >= 3 && Array.from({ length: N }, (_, c) => Array.from({ length: N }, (_, r) => (
          <Floor key={`${c}-${r}`} c={c} r={r} w={1} d={1} fill={(c + r) % 2 ? "#000" : "#fff"} opacity={0.05} stroke="#000" />
        )))}
        {level >= 2 && <Floor c={1.5} r={4.3} w={3.0} d={2.6} fill={level >= 4 ? "#2a1430" : "#2d2742"} opacity={0.95} stroke={OUT} />}
        {level >= 2 && <Floor c={1.7} r={4.5} w={2.6} d={2.2} fill="none" stroke={level >= 3 ? CYAN : PINK} opacity={0.5} />}
        {level >= 4 && (
          <g>
            <Floor c={2.6} r={0} w={2.8} d={5.2} fill={PINK} opacity={0.12} />
            {[[2.6, 0, 2.6, 5.2], [5.4, 0, 5.4, 5.2], [2.6, 5.2, 5.4, 5.2]].map(([c1, r1, c2, r2], i) => { const a = iso(c1, r1), b = iso(c2, r2); return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={PINK} strokeWidth="1.6" style={{ filter: `drop-shadow(0 0 4px ${PINK})` }} />; })}
          </g>
        )}
        {/* Dartmatte und Oche */}
        {level >= 1 && (
          <g>
            <Floor c={3.35} r={0} w={1.3} d={4.6} fill="#26262c" stroke={OUT} />
            {[1, 2, 3].map((m) => { const a = iso(3.4, m), b = iso(3.55, m); return <line key={m} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#fff" strokeOpacity=".5" strokeWidth="1" />; })}
          </g>
        )}
        <Box c={3.35} r={OCHE_R - 0.06} w={1.3} d={0.12} h={3} color={level >= 3 ? CYAN : level >= 1 ? "#f4f4f6" : "#e8e2d0"} stroke={false} />
        {level === 0 && <ellipse cx={iso(4, 1.5).x} cy={iso(4, 1.5).y} rx="90" ry="40" fill="url(#rm-pool)" />}
        {level >= 1 && <ellipse cx={iso(4, 0.9).x} cy={iso(4, 0.9).y} rx="60" ry="26" fill="url(#rm-pool)" />}

        {s.darts.map((d, i) => { const p = boardPoint(d.x, d.y); return dartAt(p.x, p.y, `st${i}`); })}

        {items.map((it) => <g key={it.key}>{it.node}</g>)}

        {s.flying && flyTo && (() => {
          const x = hand.x + (flyTo.x - hand.x) * flightFrac, y = hand.y + (flyTo.y - hand.y) * flightFrac - Math.sin(flightFrac * Math.PI) * 12;
          return dartAt(x, y, "fly");
        })()}

        {s.bubble && (
          <g transform={`translate(${fp.x + 10} ${fp.y - 112})`}>
            <rect x="0" y="-14" width={s.bubble.length * 6 + 12} height="18" rx="7" fill="#fff" stroke={OUT} strokeWidth="1" />
            <path d="M8 4 L4 11 L14 4 Z" fill="#fff" stroke={OUT} strokeWidth="1" strokeLinejoin="round" />
            <rect x="5" y="2" width="10" height="3" fill="#fff" />
            <text x="6" y="0" fontSize="10" fontWeight="700" fontFamily="var(--font-oswald), sans-serif" fill="#15101c">{s.bubble}</text>
          </g>
        )}

        {level >= 4 && (
          <g style={{ mixBlendMode: "screen" }}>
            <polygon points={pts(iso(1.6, 0, WALL), iso(3.2, 3.6, 0), iso(4.8, 3.0, 0))} fill="url(#rm-spot)" />
            <polygon points={pts(iso(0, 1.8, WALL), iso(3.4, 4.4, 0), iso(4.6, 4.8, 0))} fill="url(#rm-spot)" />
            {[iso(1.6, 0, WALL - 4), iso(0, 1.8, WALL - 4)].map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="5" fill="#fff" style={{ filter: "drop-shadow(0 0 6px #fff)" }} />)}
          </g>
        )}
      </svg>
    </div>
  );
}
