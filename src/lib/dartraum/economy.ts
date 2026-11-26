// Mein Dartraum: Coins und Erfolge werden komplett aus den gespeicherten Spielen berechnet.
// Nichts wird doppelt gezählt, und Löschen eines Matches nimmt die Coins wieder weg.
import { computeMatch } from "../game/match";
import { settingsLabel, summarize } from "../training/training";
import type { StoredMatch, Tournament, TrainingSession } from "../store/types";
import type { KoMatch } from "../tournament/tournament";

export const COINS = {
  matchPlayed: 10,
  matchWon: 20,
  tournamentWon: 200,
  c180: 50,
  c171: 25,
  ton: 5,
  highFinish: 30,
  bigFish: 150,
  nineDarter: 1000,
  training: 15,
  trainingBest: 40,
  activeDay: 10,
} as const;
/** Solo-Trainings bringen höchstens so oft pro Tag Coins */
export const TRAINING_DAILY_LIMIT = 5;

export interface PlayerFacts {
  matches: number;
  wins: number;
  c180: number;
  c171: number;
  tons: number;
  highFinishes: number;
  bigFish: number;
  nineDarters: number;
  highestFinish: number;
  bestAverage: number;
  tournamentsWon: string[];
  trainings: number;
  trainingBests: number;
  trainingsCounted: number;
  bobsBest: number;
  activeDays: number;
  longestStreak: number;
}

export interface CoinLine { key: string; label: string; count: number; coins: number }

export interface Earnings {
  facts: PlayerFacts;
  lines: CoinLine[];
  total: number;
}

const dayKey = (ms: number) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export function tournamentWinner(t: Tournament, rounds: KoMatch[][]): string | null {
  if (t.status !== "done") return null;
  const main = rounds.filter((r) => r[0]?.key !== "third");
  return main[main.length - 1]?.[0]?.winner ?? null;
}

export function computeEarnings(
  playerId: string,
  data: { matches: Record<string, StoredMatch>; tournaments: Record<string, Tournament>; trainings: Record<string, TrainingSession> },
  koRoundsOf: (t: Tournament) => KoMatch[][],
): Earnings {
  const f: PlayerFacts = {
    matches: 0, wins: 0, c180: 0, c171: 0, tons: 0, highFinishes: 0, bigFish: 0, nineDarters: 0, highestFinish: 0,
    bestAverage: 0, tournamentsWon: [], trainings: 0, trainingBests: 0, trainingsCounted: 0, bobsBest: 0, activeDays: 0, longestStreak: 0,
  };
  const days = new Set<string>();

  for (const m of Object.values(data.matches)) {
    const idx = m.setup.players.findIndex((p) => p.playerId === playerId);
    if (idx < 0) continue;
    const st = computeMatch(m.setup, m.visits);
    if (!st.finished) continue;
    f.matches++;
    if (st.winner === idx) f.wins++;
    days.add(dayKey(m.finishedAt ?? m.updatedAt));
    let points = 0, darts = 0;
    for (const leg of st.legs) {
      let legDarts = 0;
      for (const v of leg.visits) {
        if (v.player !== idx) continue;
        const d = v.visit.dartsThrown || 3;
        legDarts += d; darts += d; points += v.scored;
        if (v.scored === 180) f.c180++;
        else if (v.scored === 171 || v.scored === 177) f.c171++;
        else if (v.scored >= 100) f.tons++;
        if (v.checkout) {
          if (v.scored > f.highestFinish) f.highestFinish = v.scored;
          if (v.scored === 170) f.bigFish++;
          else if (v.scored >= 100) f.highFinishes++;
        }
      }
      if (leg.winner === idx && legDarts === 9) f.nineDarters++;
    }
    if (darts >= 9) f.bestAverage = Math.max(f.bestAverage, (points / darts) * 3);
  }

  for (const t of Object.values(data.tournaments)) {
    if (tournamentWinner(t, koRoundsOf(t)) === playerId) f.tournamentsWon.push(t.id);
  }

  const mine = Object.values(data.trainings)
    .filter((t) => t.playerId === playerId && t.finishedAt)
    .sort((a, b) => a.finishedAt! - b.finishedAt!);
  const perDay: Record<string, number> = {};
  const best: Record<string, number> = {};
  for (const t of mine) {
    f.trainings++;
    const day = dayKey(t.finishedAt!);
    days.add(day);
    const s = summarize(t.settings, t.events);
    perDay[day] = (perDay[day] ?? 0) + 1;
    const counted = perDay[day] <= TRAINING_DAILY_LIMIT;
    if (counted) f.trainingsCounted++;
    const key = `${t.settings.game}|${settingsLabel(t.settings)}`;
    if (key in best) {
      const better = s.higherIsBetter ? s.score > best[key] : s.score < best[key];
      if (better) { if (counted) f.trainingBests++; best[key] = s.score; }
    } else best[key] = s.score;
    if (t.settings.game === "bobs27") f.bobsBest = Math.max(f.bobsBest, s.score);
  }

  f.activeDays = days.size;
  const sorted = [...days].sort();
  let run = 0, prev = "";
  for (const d of sorted) {
    const p = new Date(d + "T12:00:00");
    p.setDate(p.getDate() - 1);
    run = prev === dayKey(p.getTime()) ? run + 1 : 1;
    f.longestStreak = Math.max(f.longestStreak, run);
    prev = d;
  }

  const lines: CoinLine[] = [
    { key: "matches", label: "Matches gespielt", count: f.matches, coins: f.matches * COINS.matchPlayed },
    { key: "wins", label: "Matches gewonnen", count: f.wins, coins: f.wins * COINS.matchWon },
    { key: "tournaments", label: "Turniersiege", count: f.tournamentsWon.length, coins: f.tournamentsWon.length * COINS.tournamentWon },
    { key: "c180", label: "180er", count: f.c180, coins: f.c180 * COINS.c180 },
    { key: "c171", label: "171 / 177", count: f.c171, coins: f.c171 * COINS.c171 },
    { key: "tons", label: "100+ Aufnahmen", count: f.tons, coins: f.tons * COINS.ton },
    { key: "hf", label: "High Finishes (100+)", count: f.highFinishes, coins: f.highFinishes * COINS.highFinish },
    { key: "bigfish", label: "170er Finish", count: f.bigFish, coins: f.bigFish * COINS.bigFish },
    { key: "nine", label: "9-Darter", count: f.nineDarters, coins: f.nineDarters * COINS.nineDarter },
    { key: "training", label: `Trainings (max. ${TRAINING_DAILY_LIMIT} pro Tag)`, count: f.trainingsCounted, coins: f.trainingsCounted * COINS.training },
    { key: "pb", label: "Neue Trainings-Bestwerte", count: f.trainingBests, coins: f.trainingBests * COINS.trainingBest },
    { key: "days", label: "Aktive Tage", count: f.activeDays, coins: f.activeDays * COINS.activeDay },
  ];
  return { facts: f, lines, total: lines.reduce((a, l) => a + l.coins, 0) };
}

// ---------------- Erfolge ----------------
export interface Achievement {
  id: string;
  name: string;
  desc: string;
  /** Fortschritt 0..1 */
  progress: (f: PlayerFacts) => number;
}
const ratio = (v: number, goal: number) => Math.min(1, v / goal);

export const ACHIEVEMENTS: Achievement[] = [
  { id: "first-match", name: "Game On", desc: "Erstes Match beendet", progress: (f) => ratio(f.matches, 1) },
  { id: "first-win", name: "Erster Sieg", desc: "Ein Match gewonnen", progress: (f) => ratio(f.wins, 1) },
  { id: "first-180", name: "One Hundred and Eighty!", desc: "Die erste 180 geworfen", progress: (f) => ratio(f.c180, 1) },
  { id: "ton-finish", name: "Ton-Plus-Finisher", desc: "Ein Finish ab 100 gecheckt", progress: (f) => ratio(f.highFinishes + f.bigFish, 1) },
  { id: "big-fish", name: "Big Fish", desc: "170 gecheckt", progress: (f) => ratio(f.bigFish, 1) },
  { id: "ten-180", name: "Maximum-Maschine", desc: "10× 180 geworfen", progress: (f) => ratio(f.c180, 10) },
  { id: "matches-25", name: "Stammgast", desc: "25 Matches gespielt", progress: (f) => ratio(f.matches, 25) },
  { id: "wins-10", name: "Siegertyp", desc: "10 Matches gewonnen", progress: (f) => ratio(f.wins, 10) },
  { id: "champion", name: "Champion", desc: "Ein Turnier gewonnen", progress: (f) => ratio(f.tournamentsWon.length, 1) },
  { id: "trainings-10", name: "Trainingsweltmeister", desc: "10 Trainings beendet", progress: (f) => ratio(f.trainings, 10) },
  { id: "bobs-100", name: "Doppel-Doktor", desc: "Bob's 27 mit 100+ Punkten", progress: (f) => ratio(f.bobsBest, 100) },
  { id: "streak-7", name: "Eine Woche am Board", desc: "7 Tage am Stück gespielt", progress: (f) => ratio(f.longestStreak, 7) },
  { id: "avg-60", name: "Sechziger", desc: "Ein Match mit Average 60+", progress: (f) => ratio(f.bestAverage, 60) },
  { id: "nine-darter", name: "Perfektion", desc: "Ein 9-Darter", progress: (f) => ratio(f.nineDarters, 1) },
];

export function unlockedAchievements(f: PlayerFacts): Set<string> {
  return new Set(ACHIEVEMENTS.filter((a) => a.progress(f) >= 1).map((a) => a.id));
}
