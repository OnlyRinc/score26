// Trainingsspiele. Jede Funktion berechnet den Stand rein aus den Eingaben,
// dadurch funktioniert Rückgängig wieder durch Entfernen der letzten Eingabe.
import { evaluateVisit } from "../game/match";
import { isCheckoutPossible } from "../game/checkout";

export type TrainingGame = "c121" | "d99" | "atc" | "bobs27" | "checkout" | "scoring";
export type Ring = "any" | "single" | "double" | "triple";

export interface C121Settings { start: number; rounds: number; dartsPerTarget: 3 | 6 | 9; onFail: "stay" | "reset" | "down" }
export interface D99Settings { segment: number; ring: Ring; darts: number }
export interface AtcSettings { ring: Ring; bull: boolean }
export interface Bobs27Settings { stopAtZero: boolean }
export interface CheckoutSettings { min: number; max: number; rounds: number; darts: 3 | 6 | 9; targets: number[] }
export interface ScoringSettings { visits: number }

export type TrainingSettings =
  | { game: "c121"; s: C121Settings }
  | { game: "d99"; s: D99Settings }
  | { game: "atc"; s: AtcSettings }
  | { game: "bobs27"; s: Bobs27Settings }
  | { game: "checkout"; s: CheckoutSettings }
  | { game: "scoring"; s: ScoringSettings };

/** Eine Eingabe. Je nach Spiel: Aufnahme-Summe, Treffer-Art eines Darts, Treffer pro Aufnahme ... */
export interface TrainingEvent {
  /** c121/scoring: Punkte der Aufnahme. d99: 0=daneben,1=Single,2=Doppel,3=Triple. atc: 0/1. bobs27: Treffer 0–3. checkout: benötigte Darts (0 = nicht geschafft) */
  v: number;
  /** c121: geworfene Darts bei einem Checkout (1–3) */
  d?: number;
}

export interface Summary {
  finished: boolean;
  /** Hauptwert für Bestenlisten */
  score: number;
  scoreLabel: string;
  /** größer = besser? */
  higherIsBetter: boolean;
  details: [string, string][];
}

export const GAME_INFO: Record<TrainingGame, { name: string; short: string; desc: string }> = {
  c121: { name: "121 Checkout", short: "121", desc: "Checke das Ziel in wenigen Darts. Geschafft = Ziel +1." },
  d99: { name: "99 Darts", short: "99", desc: "99 Darts auf ein Feld deiner Wahl. Treffer und Punkte zählen." },
  atc: { name: "Around the Clock", short: "ATC", desc: "Von 1 bis 20 (und Bull) der Reihe nach treffen." },
  bobs27: { name: "Bob's 27", short: "27", desc: "Doppel-Training: D1 bis Bull, Start mit 27 Punkten." },
  checkout: { name: "Checkout-Training", short: "CO", desc: "Zufällige Finishes, so viele wie möglich auschecken." },
  scoring: { name: "Scoring", short: "Ø", desc: "Feste Anzahl Aufnahmen, danach zählt dein Average." },
};

export const RING_LABEL: Record<Ring, string> = { any: "Egal", single: "Single", double: "Doppel", triple: "Triple" };

export function defaultSettings(game: TrainingGame): TrainingSettings {
  switch (game) {
    case "c121": return { game, s: { start: 121, rounds: 10, dartsPerTarget: 9, onFail: "stay" } };
    case "d99": return { game, s: { segment: 20, ring: "triple", darts: 99 } };
    case "atc": return { game, s: { ring: "any", bull: true } };
    case "bobs27": return { game, s: { stopAtZero: true } };
    case "checkout": return { game, s: { min: 61, max: 100, rounds: 20, darts: 3, targets: [] } };
    case "scoring": return { game, s: { visits: 30 } };
  }
}

/** Zufällige, auscheckbare Ziele (Double Out) für das Checkout-Training. */
export function randomCheckoutTargets(min: number, max: number, count: number, rand = Math.random): number[] {
  const pool: number[] = [];
  for (let v = Math.max(2, min); v <= Math.min(170, max); v++) if (isCheckoutPossible(v, "double", 3)) pool.push(v);
  if (!pool.length) return [];
  return Array.from({ length: count }, () => pool[Math.floor(rand() * pool.length)]);
}

// ---------------- 121 ----------------
export interface C121Target { target: number; success: boolean; darts: number }
export interface C121State { target: number; remaining: number; dartsUsed: number; round: number; done: C121Target[]; finished: boolean; best: number }

export function computeC121(s: C121Settings, events: TrainingEvent[]): C121State {
  let target = s.start;
  let remaining = target;
  let dartsUsed = 0;
  const done: C121Target[] = [];
  const rules = { startScore: target, inRule: "straight" as const, outRule: "double" as const };
  for (const e of events) {
    if (done.length >= s.rounds) break;
    const darts = e.d ?? 3;
    const res = evaluateVisit(remaining, true, rules, { total: e.v, dartsThrown: darts, dartsAtDouble: 0 });
    if (res.checkout) {
      dartsUsed += darts;
      done.push({ target, success: true, darts: dartsUsed });
      target = target + 1;
    } else {
      dartsUsed += 3;
      if (!res.bust) remaining -= res.scored;
      if (dartsUsed >= s.dartsPerTarget) {
        done.push({ target, success: false, darts: dartsUsed });
        target = s.onFail === "reset" ? s.start : s.onFail === "down" ? Math.max(s.start, target - 1) : target;
      } else continue;
    }
    remaining = target;
    dartsUsed = 0;
  }
  const best = done.filter((d) => d.success).reduce((m, d) => Math.max(m, d.target), 0);
  return { target, remaining, dartsUsed, round: done.length, done, finished: done.length >= s.rounds, best };
}

function summaryC121(s: C121Settings, ev: TrainingEvent[]): Summary {
  const st = computeC121(s, ev);
  const ok = st.done.filter((d) => d.success);
  return {
    finished: st.finished, score: ok.length, scoreLabel: `${ok.length}/${st.done.length} gecheckt`, higherIsBetter: true,
    details: [
      ["Geschafft", `${ok.length} von ${st.done.length}`],
      ["Höchstes Ziel gecheckt", st.best ? String(st.best) : "–"],
      ["Ø Darts pro Checkout", ok.length ? (ok.reduce((a, d) => a + d.darts, 0) / ok.length).toFixed(1) : "–"],
    ],
  };
}

// ---------------- 99 Darts ----------------
export interface D99State { thrown: number; points: number; hits: number; singles: number; doubles: number; triples: number; finished: boolean }

export function d99Points(segment: number, mult: number): number {
  if (mult <= 0) return 0;
  return segment === 25 ? 25 * Math.min(2, mult) : segment * mult;
}
/** Zählt der Dart als Treffer für das gewählte Ziel? */
export function ringHit(ring: Ring, mult: number): boolean {
  if (mult <= 0) return false;
  if (ring === "any") return true;
  return (ring === "single" && mult === 1) || (ring === "double" && mult === 2) || (ring === "triple" && mult === 3);
}

export function computeD99(s: D99Settings, events: TrainingEvent[]): D99State {
  const st: D99State = { thrown: 0, points: 0, hits: 0, singles: 0, doubles: 0, triples: 0, finished: false };
  for (const e of events.slice(0, s.darts)) {
    st.thrown++;
    st.points += d99Points(s.segment, e.v);
    if (e.v === 1) st.singles++;
    if (e.v === 2) st.doubles++;
    if (e.v === 3) st.triples++;
    if (ringHit(s.ring, e.v)) st.hits++;
  }
  st.finished = st.thrown >= s.darts;
  return st;
}

function summaryD99(s: D99Settings, ev: TrainingEvent[]): Summary {
  const st = computeD99(s, ev);
  const rate = st.thrown ? (st.hits / st.thrown) * 100 : 0;
  return {
    finished: st.finished, score: st.hits, scoreLabel: `${st.hits} Treffer (${rate.toFixed(0)} %)`, higherIsBetter: true,
    details: [
      ["Treffer", `${st.hits} von ${st.thrown} (${rate.toFixed(1)} %)`],
      ["Punkte", String(st.points)],
      ["Single / Doppel / Triple", `${st.singles} / ${st.doubles} / ${st.triples}`],
      ["Ø pro Aufnahme", st.thrown ? ((st.points / st.thrown) * 3).toFixed(1) : "–"],
    ],
  };
}

// ---------------- Around the Clock ----------------
export interface AtcState { index: number; sequence: number[]; thrown: number; finished: boolean }
export function atcSequence(s: AtcSettings): number[] {
  const seq = Array.from({ length: 20 }, (_, i) => i + 1);
  if (s.bull) seq.push(25);
  return seq;
}
export function computeAtc(s: AtcSettings, events: TrainingEvent[]): AtcState {
  const sequence = atcSequence(s);
  let index = 0;
  let thrown = 0;
  for (const e of events) {
    if (index >= sequence.length) break;
    thrown++;
    if (e.v > 0) index++;
  }
  return { index, sequence, thrown, finished: index >= sequence.length };
}
function summaryAtc(s: AtcSettings, ev: TrainingEvent[]): Summary {
  const st = computeAtc(s, ev);
  return {
    finished: st.finished, score: st.thrown, scoreLabel: `${st.thrown} Darts`, higherIsBetter: false,
    details: [
      ["Benötigte Darts", String(st.thrown)],
      ["Trefferquote", st.thrown ? `${((st.index / st.thrown) * 100).toFixed(0)} %` : "–"],
    ],
  };
}

// ---------------- Bob's 27 ----------------
export interface Bobs27State { score: number; index: number; sequence: number[]; finished: boolean; busted: boolean; hits: number; darts: number }
export const BOBS_SEQUENCE = [...Array.from({ length: 20 }, (_, i) => i + 1), 25];
export function computeBobs27(s: Bobs27Settings, events: TrainingEvent[]): Bobs27State {
  let score = 27;
  let index = 0;
  let hits = 0;
  let busted = false;
  for (const e of events) {
    if (index >= BOBS_SEQUENCE.length || busted) break;
    const value = BOBS_SEQUENCE[index] * 2;
    const h = Math.max(0, Math.min(3, e.v));
    hits += h;
    score += h > 0 ? h * value : -value;
    index++;
    if (s.stopAtZero && score <= 0) busted = true;
  }
  return { score, index, sequence: BOBS_SEQUENCE, finished: busted || index >= BOBS_SEQUENCE.length, busted, hits, darts: index * 3 };
}
function summaryBobs(s: Bobs27Settings, ev: TrainingEvent[]): Summary {
  const st = computeBobs27(s, ev);
  return {
    finished: st.finished, score: st.score, scoreLabel: `${st.score} Punkte`, higherIsBetter: true,
    details: [
      ["Endstand", String(st.score)],
      ["Doppel-Quote", st.darts ? `${((st.hits / st.darts) * 100).toFixed(0)} % (${st.hits}/${st.darts})` : "–"],
      ["Erreicht", st.busted ? `Unter 0 bei D${BOBS_SEQUENCE[st.index - 1] === 25 ? "Bull" : BOBS_SEQUENCE[st.index - 1]}` : st.finished ? "Alle Doppel gespielt" : `D${BOBS_SEQUENCE[st.index]}`],
    ],
  };
}

// ---------------- Checkout-Training ----------------
export interface CheckoutState { round: number; target: number | null; success: number; dartsOnSuccess: number; finished: boolean; results: { target: number; darts: number }[] }
export function computeCheckout(s: CheckoutSettings, events: TrainingEvent[]): CheckoutState {
  const results: { target: number; darts: number }[] = [];
  for (const e of events) {
    if (results.length >= s.rounds) break;
    results.push({ target: s.targets[results.length], darts: e.v });
  }
  const ok = results.filter((r) => r.darts > 0);
  return {
    round: results.length,
    target: results.length < s.rounds ? s.targets[results.length] ?? null : null,
    success: ok.length,
    dartsOnSuccess: ok.reduce((a, r) => a + r.darts, 0),
    finished: results.length >= s.rounds,
    results,
  };
}
function summaryCheckout(s: CheckoutSettings, ev: TrainingEvent[]): Summary {
  const st = computeCheckout(s, ev);
  const best = st.results.filter((r) => r.darts > 0).reduce((m, r) => Math.max(m, r.target), 0);
  return {
    finished: st.finished, score: st.success, scoreLabel: `${st.success}/${st.round} gecheckt`, higherIsBetter: true,
    details: [
      ["Geschafft", `${st.success} von ${st.round}${st.round ? ` (${((st.success / st.round) * 100).toFixed(0)} %)` : ""}`],
      ["Höchstes Finish", best ? String(best) : "–"],
      ["Ø Darts pro Checkout", st.success ? (st.dartsOnSuccess / st.success).toFixed(1) : "–"],
    ],
  };
}

// ---------------- Scoring ----------------
export interface ScoringState { visits: number; points: number; average: number; highest: number; c100: number; c140: number; c180: number; finished: boolean }
export function computeScoring(s: ScoringSettings, events: TrainingEvent[]): ScoringState {
  const ev = events.slice(0, s.visits);
  const points = ev.reduce((a, e) => a + e.v, 0);
  return {
    visits: ev.length, points, average: ev.length ? points / ev.length : 0,
    highest: ev.reduce((m, e) => Math.max(m, e.v), 0),
    c100: ev.filter((e) => e.v >= 100 && e.v < 140).length,
    c140: ev.filter((e) => e.v >= 140 && e.v < 180).length,
    c180: ev.filter((e) => e.v === 180).length,
    finished: ev.length >= s.visits,
  };
}
function summaryScoring(s: ScoringSettings, ev: TrainingEvent[]): Summary {
  const st = computeScoring(s, ev);
  return {
    finished: st.finished, score: Math.round(st.average * 100) / 100, scoreLabel: `Ø ${st.average.toFixed(2)}`, higherIsBetter: true,
    details: [
      ["3-Dart-Average", st.average.toFixed(2)],
      ["Punkte", `${st.points} in ${st.visits} Aufnahmen`],
      ["Höchste Aufnahme", String(st.highest)],
      ["100+ / 140+ / 180", `${st.c100} / ${st.c140} / ${st.c180}`],
    ],
  };
}

export function summarize(t: TrainingSettings, events: TrainingEvent[]): Summary {
  switch (t.game) {
    case "c121": return summaryC121(t.s, events);
    case "d99": return summaryD99(t.s, events);
    case "atc": return summaryAtc(t.s, events);
    case "bobs27": return summaryBobs(t.s, events);
    case "checkout": return summaryCheckout(t.s, events);
    case "scoring": return summaryScoring(t.s, events);
  }
}

/** Kurzbeschreibung der Einstellungen (für Verlauf/Bestwerte, damit nur Gleiches verglichen wird). */
export function settingsLabel(t: TrainingSettings): string {
  switch (t.game) {
    case "c121": return `Start ${t.s.start} · ${t.s.rounds} Ziele · ${t.s.dartsPerTarget} Darts`;
    case "d99": return `${t.s.darts} Darts auf ${t.s.segment === 25 ? "Bull" : t.s.segment} (${RING_LABEL[t.s.ring]})`;
    case "atc": return `${RING_LABEL[t.s.ring]}${t.s.bull ? " · mit Bull" : ""}`;
    case "bobs27": return t.s.stopAtZero ? "Ende bei 0" : "Bis zum Ende";
    case "checkout": return `${t.s.min}–${t.s.max} · ${t.s.rounds} Finishes · ${t.s.darts} Darts`;
    case "scoring": return `${t.s.visits} Aufnahmen`;
  }
}
