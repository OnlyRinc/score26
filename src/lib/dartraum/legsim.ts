// Die Figur im Dartraum spielt echte 501-Legs (Double Out): Ziel wählen, mit Streuung werfen, Punkte zählen.
// Die Streuung richtet sich nach dem gewünschten 3-Dart-Average.

/** Segmente im Uhrzeigersinn, oben beginnend */
export const SEGMENTS = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
/** Radien in mm (echtes Board) */
const R = { bull: 6.35, outer: 16, t1: 99, t2: 107, d1: 162, d2: 170 };

export interface Hit { x: number; y: number; score: number; mult: number; label: string }
export interface Target { num: number; mult: 1 | 2 | 3 }

/** Punkte für einen Treffer an (x, y) in mm, y nach oben, x nach rechts (von vorne gesehen) */
export function scoreAt(x: number, y: number): Omit<Hit, "x" | "y"> {
  const r = Math.hypot(x, y);
  if (r <= R.bull) return { score: 50, mult: 2, label: "Bull" };
  if (r <= R.outer) return { score: 25, mult: 1, label: "25" };
  if (r > R.d2) return { score: 0, mult: 0, label: "Daneben" };
  const deg = ((Math.atan2(x, y) * 180) / Math.PI + 360 + 9) % 360;
  const num = SEGMENTS[Math.floor(deg / 18) % 20];
  if (r > R.d1) return { score: num * 2, mult: 2, label: `D${num}` };
  if (r > R.t1 && r <= R.t2) return { score: num * 3, mult: 3, label: `T${num}` };
  return { score: num, mult: 1, label: String(num) };
}

/** Mitte des Zielfelds in mm */
export function aimPoint(t: Target): [number, number] {
  if (t.num === 25) return [0, 0];
  const i = SEGMENTS.indexOf(t.num), a = (i * 18 * Math.PI) / 180;
  // Single: im großen Feld zwischen Triple und Double zielen
  const r = t.mult === 3 ? (R.t1 + R.t2) / 2 : t.mult === 2 ? (R.d1 + R.d2) / 2 : 134;
  return [Math.sin(a) * r, Math.cos(a) * r];
}

const DOUBLES_PREF = [32, 40, 16, 36, 24, 20, 8, 12, 28, 4, 10, 18, 2, 30, 26, 6, 14, 22, 38, 34];
const goodLeave = (n: number) => n === 50 || (n >= 2 && n <= 40 && n % 2 === 0);

/** Welches Feld die Figur bei diesem Rest anvisiert */
export function chooseTarget(rest: number): Target {
  if (rest === 50) return { num: 25, mult: 2 };
  if (goodLeave(rest)) return { num: rest / 2, mult: 2 };
  if (rest <= 60) {
    // Single treffen, damit ein gutes Doppel übrig bleibt
    for (const d of DOUBLES_PREF) { const s = rest - d; if (s >= 1 && s <= 20) return { num: s, mult: 1 }; }
    return { num: Math.min(20, rest - 2), mult: 1 };
  }
  if (rest <= 100) {
    for (let n = 20; n >= 10; n--) if (goodLeave(rest - 3 * n)) return { num: n, mult: 3 };
    for (let n = 20; n >= 1; n--) if (goodLeave(rest - n)) return { num: n, mult: 1 };
  }
  // Viel Rest: T20, außer T19 hinterlässt eine gerade Zahl und T20 nicht
  if (rest <= 170 && (rest - 60) % 2 === 1 && (rest - 57) % 2 === 0) return { num: 19, mult: 3 };
  return { num: 20, mult: 3 };
}

/** Normalverteilte Zufallszahl */
function gauss(rand: () => number) {
  let u = 0; while (u === 0) u = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
}

/** Ein Wurf auf ein Ziel mit Streuung sigma (mm) */
export function throwAt(t: Target, sigma: number, rand: () => number): Hit {
  const [ax, ay] = aimPoint(t);
  const x = ax + gauss(rand) * sigma, y = ay + gauss(rand) * sigma;
  return { x, y, ...scoreAt(x, y) };
}

// Streuung zu Average: einmal per Simulation ausgemessen (je 3000 Legs simuliert), dazwischen linear
const SIGMA_TABLE: [number, number][] = [[22, 40], [27, 32], [34, 25], [42, 20], [51, 16], [58, 14], [66, 12], [76, 10], [88, 8], [103, 6], [125, 4]];
export function sigmaForAverage(avg: number) {
  const t = SIGMA_TABLE;
  if (avg <= t[0][0]) return t[0][1];
  for (let i = 1; i < t.length; i++) if (avg <= t[i][0]) { const [a0, s0] = t[i - 1], [a1, s1] = t[i]; return s0 + ((avg - a0) / (a1 - a0)) * (s1 - s0); }
  return t[t.length - 1][1];
}

/** Stand eines Legs */
export interface LegState { rest: number; visitStart: number; visit: Hit[]; darts: number; scored: number; done: boolean; bust: boolean; lastVisit: Hit[]; legs: number }
export const newLeg = (legs = 0): LegState => ({ rest: 501, visitStart: 501, visit: [], darts: 0, scored: 0, done: false, bust: false, lastVisit: [], legs });

/** Einen Pfeil werfen und verbuchen. Gibt den Treffer zurück; danach zeigt state.visit/rest/done/bust den Stand. */
export function playDart(s: LegState, sigma: number, rand: () => number): Hit {
  if (s.visit.length === 0) { s.visitStart = s.rest; s.bust = false; }
  const hit = throwAt(chooseTarget(s.rest), sigma, rand);
  s.visit.push(hit); s.darts++;
  const left = s.rest - hit.score;
  if (left === 0 && hit.mult === 2) { s.rest = 0; s.done = true; s.legs++; }
  else if (left < 2) { s.bust = true; s.rest = s.visitStart; }
  else s.rest = left;
  s.scored = 501 - s.rest;
  return hit;
}

/** Aufnahme vorbei? (3 Pfeile, Bust oder Checkout) */
export const visitOver = (s: LegState) => s.visit.length >= 3 || s.bust || s.done;
/** Aufnahme abschließen (beim Pfeile-Holen) */
export function endVisit(s: LegState) { s.lastVisit = s.visit; s.visit = []; s.bust = false; }

/** 3-Dart-Average im laufenden Leg */
export const legAverage = (s: LegState) => (s.darts ? (s.scored / s.darts) * 3 : 0);
