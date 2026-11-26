import { describe, expect, it } from "vitest";
import { computeEarnings, unlockedAchievements, COINS, TRAINING_DAILY_LIMIT } from "./economy";
import type { StoredMatch, TrainingSession } from "../store/types";
import type { MatchSetup, Visit } from "../game/types";

const rules = { startScore: 501, inRule: "straight" as const, outRule: "double" as const };
const setup: MatchSetup = {
  players: [
    { playerId: "a", name: "Anna", nickname: "Anna", rules, headStart: { legs: 0, sets: 0 } },
    { playerId: "b", name: "Ben", nickname: "Ben", rules, headStart: { legs: 0, sets: 0 } },
  ],
  format: { sets: 1, legs: 1 },
  firstPlayer: 0,
};
const v = (total: number, dartsThrown = 3): Visit => ({ total, dartsThrown, dartsAtDouble: 0 });
const DAY = Date.UTC(2026, 10, 27, 12);
const match = (visits: Visit[], at = DAY): StoredMatch => ({ id: "m" + at + visits.length, setup, visits, createdAt: at, updatedAt: at, finishedAt: at });
const noKo = () => [];
const empty = { matches: {}, tournaments: {}, trainings: {} };

describe("Dartraum-Coins", () => {
  const nine = match([v(180), v(0), v(180), v(0), v(141)]);
  it("9-Darter mit zwei 180 und High Finish", () => {
    const e = computeEarnings("a", { ...empty, matches: { [nine.id]: nine } }, noKo);
    expect(e.facts).toMatchObject({ matches: 1, wins: 1, c180: 2, highFinishes: 1, nineDarters: 1, highestFinish: 141 });
    expect(e.total).toBe(COINS.matchPlayed + COINS.matchWon + 2 * COINS.c180 + COINS.ton + COINS.highFinish + COINS.nineDarter + COINS.activeDay);
    const got = unlockedAchievements(e.facts);
    expect(got.has("first-180")).toBe(true);
    expect(got.has("nine-darter")).toBe(true);
    expect(got.has("big-fish")).toBe(false);
  });
  it("Verlierer bekommt nur Teilnahme und Tag", () => {
    const e = computeEarnings("b", { ...empty, matches: { [nine.id]: nine } }, noKo);
    expect(e.total).toBe(COINS.matchPlayed + COINS.activeDay);
  });
  it("Laufende Matches zählen nicht", () => {
    const open = match([v(180), v(0)]);
    expect(computeEarnings("a", { ...empty, matches: { [open.id]: open } }, noKo).total).toBe(0);
  });
  it("171 und 177 zählen extra, 100+ normal", () => {
    const m = match([v(171), v(0), v(177), v(0), v(100), v(0), v(53)]);
    const e = computeEarnings("a", { ...empty, matches: { [m.id]: m } }, noKo);
    expect(e.facts.c171).toBe(2);
    expect(e.facts.tons).toBe(1);
    expect(e.facts.highFinishes).toBe(0);
  });
});

describe("Trainings-Coins", () => {
  const tr = (i: number, misses: number, day = DAY): TrainingSession => ({
    id: "t" + i, playerId: "a", playerName: "Anna", settings: { game: "bobs27", s: { stopAtZero: true } },
    events: Array.from({ length: 21 }, (_, k) => ({ v: k < misses ? 0 : 1 })), createdAt: day + i, finishedAt: day + i,
  });
  it("Tageslimit und neue Bestwerte", () => {
    const trainings: Record<string, TrainingSession> = {};
    for (let i = 0; i < 7; i++) trainings["t" + i] = tr(i, i === 3 ? 0 : 2);
    const e = computeEarnings("a", { ...empty, trainings }, noKo);
    expect(e.facts.trainings).toBe(7);
    expect(e.facts.trainingsCounted).toBe(TRAINING_DAILY_LIMIT);
    expect(e.facts.trainingBests).toBe(1);
  });
  it("Serie über Tage", () => {
    const trainings: Record<string, TrainingSession> = {};
    for (let d = 0; d < 7; d++) trainings["d" + d] = tr(d, 2, DAY + d * 864e5);
    const e = computeEarnings("a", { ...empty, trainings }, noKo);
    expect(e.facts.longestStreak).toBe(7);
    expect(unlockedAchievements(e.facts).has("streak-7")).toBe(true);
  });
});
