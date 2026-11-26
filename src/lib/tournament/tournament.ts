// Turnierlogik: Gruppenvorschlag, Spielplan, Tabellen, KO-Baum.
// Rein funktional und ohne React, damit sie testbar und wiederverwendbar ist.

export interface GroupPlan {
  groups: number;
  sizes: number[];
  advancePerGroup: number;
  koSize: number; // Anzahl Spieler in der KO-Runde
  bracketSize: number; // nächste Zweierpotenz
}

export const nextPow2 = (n: number) => (n <= 1 ? 1 : 2 ** Math.ceil(Math.log2(n)));
const isPow2 = (n: number) => n >= 1 && (n & (n - 1)) === 0;

export function groupSizes(n: number, groups: number): number[] {
  const base = Math.floor(n / groups);
  const extra = n % groups;
  return Array.from({ length: groups }, (_, i) => base + (i < extra ? 1 : 0));
}

export function makePlan(n: number, groups: number, advancePerGroup: number): GroupPlan {
  const sizes = groupSizes(n, groups);
  const adv = Math.max(1, Math.min(advancePerGroup, Math.min(...sizes)));
  const koSize = groups * adv;
  return { groups, sizes, advancePerGroup: adv, koSize, bracketSize: nextPow2(koSize) };
}

/** Schlägt Gruppenanzahl und Weiterkommende für n Spieler vor. */
export function suggestPlan(n: number): GroupPlan {
  if (n < 2) return makePlan(Math.max(n, 1), 1, 1);
  if (n <= 3) return makePlan(n, 1, 2);
  if (n <= 5) return makePlan(n, 1, 4);
  let best: GroupPlan | null = null;
  let bestScore = Infinity;
  for (let g = 1; g <= Math.floor(n / 3); g++) {
    const sizes = groupSizes(n, g);
    const min = Math.min(...sizes);
    const max = Math.max(...sizes);
    if (min < 3 || max > 6) continue;
    const avg = n / g;
    for (let a = 1; a < min; a++) {
      const k = g * a;
      if (k < 2) continue;
      const score = Math.abs(avg - 4) * 1.5 + (isPow2(k) ? 0 : 3) + Math.abs(k - n / 2) * 0.5;
      if (score < bestScore) {
        bestScore = score;
        best = makePlan(n, g, a);
      }
    }
  }
  return best ?? makePlan(n, 1, Math.min(4, n));
}

/** Jeder gegen jeden (Kreis-Methode). Gibt Spielrunden zurück. */
export function roundRobin<T>(players: T[]): [T, T][][] {
  const list: (T | null)[] = [...players];
  if (list.length % 2 === 1) list.push(null);
  const n = list.length;
  const rounds: [T, T][][] = [];
  for (let r = 0; r < n - 1; r++) {
    const round: [T, T][] = [];
    for (let i = 0; i < n / 2; i++) {
      const a = list[i];
      const b = list[n - 1 - i];
      if (a !== null && b !== null) round.push(r % 2 === 0 ? [a, b] : [b, a]);
    }
    rounds.push(round);
    // rotieren, erstes Element bleibt fest
    list.splice(1, 0, list.pop()!);
  }
  return rounds;
}

export interface MatchResult {
  a: string;
  b: string;
  winner: string;
  legsA: number;
  legsB: number;
  setsA: number;
  setsB: number;
  pointsA: number; // geworfene Punkte (für Average)
  dartsA: number;
  pointsB: number;
  dartsB: number;
}

export type Tiebreaker = "points" | "legDiff" | "legsWon" | "headToHead" | "average";
export const DEFAULT_TIEBREAKERS: Tiebreaker[] = ["points", "legDiff", "headToHead", "legsWon", "average"];
export const TIEBREAKER_LABELS: Record<Tiebreaker, string> = {
  points: "Punkte",
  legDiff: "Leg-Differenz",
  legsWon: "Gewonnene Legs",
  headToHead: "Direkter Vergleich",
  average: "Average",
};

export interface StandingRow {
  playerId: string;
  played: number;
  won: number;
  lost: number;
  points: number;
  legsFor: number;
  legsAgainst: number;
  legDiff: number;
  setsFor: number;
  setsAgainst: number;
  scored: number;
  darts: number;
  average: number;
}

export interface StandingOptions {
  pointsWin: number;
  pointsLoss: number;
  tiebreakers: Tiebreaker[];
}

export function computeStandings(playerIds: string[], results: MatchResult[], opts: StandingOptions): StandingRow[] {
  const rows = new Map<string, StandingRow>();
  for (const id of playerIds)
    rows.set(id, { playerId: id, played: 0, won: 0, lost: 0, points: 0, legsFor: 0, legsAgainst: 0, legDiff: 0, setsFor: 0, setsAgainst: 0, scored: 0, darts: 0, average: 0 });
  const relevant = results.filter((r) => rows.has(r.a) && rows.has(r.b));
  for (const r of relevant) {
    const A = rows.get(r.a)!;
    const B = rows.get(r.b)!;
    A.played++; B.played++;
    A.legsFor += r.legsA; A.legsAgainst += r.legsB;
    B.legsFor += r.legsB; B.legsAgainst += r.legsA;
    A.setsFor += r.setsA; A.setsAgainst += r.setsB;
    B.setsFor += r.setsB; B.setsAgainst += r.setsA;
    A.scored += r.pointsA; A.darts += r.dartsA;
    B.scored += r.pointsB; B.darts += r.dartsB;
    if (r.winner === r.a) { A.won++; B.lost++; A.points += opts.pointsWin; B.points += opts.pointsLoss; }
    else { B.won++; A.lost++; B.points += opts.pointsWin; A.points += opts.pointsLoss; }
  }
  for (const row of rows.values()) {
    row.legDiff = row.legsFor - row.legsAgainst;
    row.average = row.darts ? (row.scored / row.darts) * 3 : 0;
  }

  const h2h = (x: string, y: string): number => {
    const m = relevant.find((r) => (r.a === x && r.b === y) || (r.a === y && r.b === x));
    if (!m) return 0;
    return m.winner === x ? -1 : 1;
  };

  const list = [...rows.values()];
  list.sort((x, y) => {
    for (const tb of opts.tiebreakers) {
      let d = 0;
      if (tb === "points") d = y.points - x.points;
      else if (tb === "legDiff") d = y.legDiff - x.legDiff;
      else if (tb === "legsWon") d = y.legsFor - x.legsFor;
      else if (tb === "average") d = y.average - x.average;
      else if (tb === "headToHead") {
        // Direkter Vergleich nur, wenn genau diese zwei gleichauf sind
        const tied = list.filter((r) => opts.tiebreakers.slice(0, opts.tiebreakers.indexOf("headToHead")).every((t) => sameOn(t, r, x)));
        if (tied.length === 2) d = h2h(x.playerId, y.playerId);
      }
      if (d !== 0) return d;
    }
    return playerIds.indexOf(x.playerId) - playerIds.indexOf(y.playerId);
  });
  return list;
}

function sameOn(t: Tiebreaker, a: StandingRow, b: StandingRow): boolean {
  if (t === "points") return a.points === b.points;
  if (t === "legDiff") return a.legDiff === b.legDiff;
  if (t === "legsWon") return a.legsFor === b.legsFor;
  if (t === "average") return a.average === b.average;
  return true;
}

// ---------------- KO-Runde ----------------

/** Reihenfolge der Setzplätze im Turnierbaum, z. B. 8 -> [1,8,4,5,2,7,3,6]. */
export function seedOrder(size: number): number[] {
  let order = [1];
  while (order.length < size) {
    const n = order.length * 2;
    order = order.flatMap((s) => [s, n + 1 - s]);
  }
  return order;
}

export interface Qualifier {
  playerId: string;
  group: number;
  place: number; // 1 = Gruppensieger
}

/**
 * Baut die erste KO-Runde aus den Gruppenplatzierungen (Kreuzspiele).
 * Gibt die Startplätze des Baums zurück (Länge = Zweierpotenz, null = Freilos).
 * Gruppensieger bekommen die besten Setzplätze und damit ggf. Freilose.
 */
export function seedBracket(qualifiers: Qualifier[]): (string | null)[] {
  const sorted = [...qualifiers].sort((a, b) => a.place - b.place || a.group - b.group);
  const size = nextPow2(sorted.length);
  const order = seedOrder(size); // Position -> Setzplatz
  const bySeed: (Qualifier | null)[] = Array.from({ length: size }, (_, i) => sorted[i] ?? null);

  // Paare der ersten Runde nach Setzplätzen (Index in bySeed)
  const pairs: [number, number][] = [];
  for (let i = 0; i < size; i += 2) pairs.push([order[i] - 1, order[i + 1] - 1]);

  // Gleiche Gruppe in Runde 1 vermeiden: niedriger gesetzte Spieler gleicher Platzierung tauschen
  const conflict = ([x, y]: [number, number]) => !!bySeed[x] && !!bySeed[y] && bySeed[x]!.group === bySeed[y]!.group;
  for (let guard = 0; guard < 50; guard++) {
    const idx = pairs.findIndex(conflict);
    if (idx < 0) break;
    const [, low] = pairs[idx];
    let fixed = false;
    for (let j = 0; j < pairs.length && !fixed; j++) {
      if (j === idx) continue;
      const other = pairs[j][1];
      const ql = bySeed[low];
      const qo = bySeed[other];
      if (!ql || !qo || ql.place !== qo.place) continue;
      [bySeed[low], bySeed[other]] = [qo, ql];
      if (!conflict(pairs[idx]) && !conflict(pairs[j])) fixed = true;
      else [bySeed[low], bySeed[other]] = [ql, qo];
    }
    if (!fixed) break;
  }

  return order.map((seed) => bySeed[seed - 1]?.playerId ?? null);
}

export interface KoMatch {
  key: string; // z. B. "r0-m1" oder "third"
  round: number;
  index: number;
  a: string | null;
  b: string | null;
  /** true, wenn ein Spieler ein Freilos hat und automatisch weiter ist */
  bye: boolean;
  winner: string | null;
  loser: string | null;
  /** Beide Teilnehmer stehen fest und das Spiel ist noch offen */
  ready: boolean;
}

export interface KoResult {
  winner: string;
}

/** Berechnet den kompletten Baum aus Startplätzen und bisherigen Ergebnissen. */
export function resolveBracket(slots: (string | null)[], results: Record<string, KoResult>, thirdPlace: boolean): KoMatch[][] {
  const rounds: KoMatch[][] = [];
  let entrants: (string | null)[] = slots;
  // "undecided" markiert Plätze, deren Spieler noch nicht feststeht (Unterschied zu Freilos = null)
  let pending: boolean[] = slots.map(() => false);
  let r = 0;
  while (entrants.length >= 2) {
    const round: KoMatch[] = [];
    const nextEntrants: (string | null)[] = [];
    const nextPending: boolean[] = [];
    for (let i = 0; i < entrants.length; i += 2) {
      const a = entrants[i];
      const b = entrants[i + 1];
      const pa = pending[i];
      const pb = pending[i + 1];
      const key = `r${r}-m${i / 2}`;
      let winner: string | null = null;
      let bye = false;
      if (!pa && !pb && (a === null) !== (b === null)) {
        winner = a ?? b;
        bye = true;
      } else if (a && b) {
        const res = results[key];
        if (res && (res.winner === a || res.winner === b)) winner = res.winner;
      }
      const loser = winner && a && b && !bye ? (winner === a ? b : a) : null;
      const isPending = !winner && !(a === null && b === null && !pa && !pb);
      round.push({ key, round: r, index: i / 2, a, b, bye, winner, loser, ready: !!a && !!b && !winner });
      nextEntrants.push(winner);
      nextPending.push(isPending);
    }
    rounds.push(round);
    entrants = nextEntrants;
    pending = nextPending;
    r++;
  }
  if (thirdPlace && rounds.length >= 2) {
    const semis = rounds[rounds.length - 2];
    const a = semis[0]?.loser ?? null;
    const b = semis[1]?.loser ?? null;
    const res = results["third"];
    const winner = a && b && res && (res.winner === a || res.winner === b) ? res.winner : null;
    rounds.push([{ key: "third", round: rounds.length, index: 0, a, b, bye: false, winner, loser: winner ? (winner === a ? b : a) : null, ready: !!a && !!b && !winner }]);
  }
  return rounds;
}

/** Name der KO-Runde nach Anzahl der verbleibenden Spieler. */
export function roundName(totalRounds: number, round: number, isThird = false): string {
  if (isThird) return "Spiel um Platz 3";
  const remaining = 2 ** (totalRounds - round);
  if (remaining === 2) return "Finale";
  if (remaining === 4) return "Halbfinale";
  if (remaining === 8) return "Viertelfinale";
  if (remaining === 16) return "Achtelfinale";
  return `Runde der letzten ${remaining}`;
}

/** Zufällig mischen (Fisher-Yates). */
export function shuffle<T>(arr: T[], rand = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Gruppen auslosen. Mit Setzliste: Die gesetzten Spieler werden zuerst
 * auf verschiedene Gruppen verteilt (Topf-System), der Rest zufällig.
 */
export function drawGroups(playerIds: string[], groups: number, seeded: string[] = [], rand = Math.random): string[][] {
  const sizes = groupSizes(playerIds.length, groups);
  const result: string[][] = sizes.map(() => []);
  const seededValid = seeded.filter((s) => playerIds.includes(s));
  const rest = shuffle(playerIds.filter((p) => !seededValid.includes(p)), rand);
  const order = [...seededValid, ...rest];
  // Schlangenlinie: Gruppe 0,1,2,...,2,1,0,...
  let gi = 0;
  let dir = 1;
  for (const p of order) {
    let guard = 0;
    while (result[gi].length >= sizes[gi] && guard++ < groups * 2) {
      gi += dir;
      if (gi >= groups) { gi = groups - 1; dir = -1; }
      if (gi < 0) { gi = 0; dir = 1; }
    }
    result[gi].push(p);
    gi += dir;
    if (gi >= groups) { gi = groups - 1; dir = -1; }
    if (gi < 0) { gi = 0; dir = 1; }
  }
  return result;
}

export const groupName = (i: number) => `Gruppe ${String.fromCharCode(65 + i)}`;
