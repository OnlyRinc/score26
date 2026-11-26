import type { LegRecord, MatchState } from "./match";

export interface PlayerStats {
  points: number;
  darts: number;
  average: number;
  first9Points: number;
  first9Darts: number;
  first9Average: number;
  highestVisit: number;
  count100: number; // 100–139
  count140: number; // 140–179
  count180: number;
  checkouts: number;
  dartsAtDouble: number;
  checkoutRate: number; // 0..1
  highestFinish: number;
  legsWon: number;
  bestLeg: number | null; // wenigste Darts für ein gewonnenes Leg
  shortLegs: number; // gewonnene Legs mit höchstens 15 Darts
}

export const SHORT_LEG_DARTS = 15;

export function emptyStats(): PlayerStats {
  return {
    points: 0, darts: 0, average: 0, first9Points: 0, first9Darts: 0, first9Average: 0,
    highestVisit: 0, count100: 0, count140: 0, count180: 0, checkouts: 0, dartsAtDouble: 0,
    checkoutRate: 0, highestFinish: 0, legsWon: 0, bestLeg: null, shortLegs: 0,
  };
}

export function finalizeStats(s: PlayerStats): PlayerStats {
  s.average = s.darts ? (s.points / s.darts) * 3 : 0;
  s.first9Average = s.first9Darts ? (s.first9Points / s.first9Darts) * 3 : 0;
  s.checkoutRate = s.dartsAtDouble ? s.checkouts / s.dartsAtDouble : 0;
  return s;
}

export function addLegsToStats(s: PlayerStats, legs: LegRecord[], player: number): PlayerStats {
  for (const leg of legs) {
    let legDarts = 0;
    for (const v of leg.visits) {
      if (v.player !== player) continue;
      const darts = v.visit.dartsThrown || 3;
      legDarts += darts;
      s.darts += darts;
      s.points += v.scored;
      if (v.visitNo <= 3) {
        s.first9Points += v.scored;
        s.first9Darts += darts;
      }
      if (v.scored > s.highestVisit) s.highestVisit = v.scored;
      if (v.scored === 180) s.count180++;
      else if (v.scored >= 140) s.count140++;
      else if (v.scored >= 100) s.count100++;
      s.dartsAtDouble += v.visit.dartsAtDouble || 0;
      if (v.checkout) {
        s.checkouts++;
        if (v.scored > s.highestFinish) s.highestFinish = v.scored;
      }
    }
    if (leg.winner === player) {
      s.legsWon++;
      if (s.bestLeg === null || legDarts < s.bestLeg) s.bestLeg = legDarts;
      if (legDarts <= SHORT_LEG_DARTS) s.shortLegs++;
    }
  }
  return s;
}

export function matchStats(state: MatchState, player: number): PlayerStats {
  return finalizeStats(addLegsToStats(emptyStats(), state.legs, player));
}

/** Zusammenfassen mehrerer Statistiken (z. B. für ein ganzes Turnier). */
export function mergeStats(list: PlayerStats[]): PlayerStats {
  const s = emptyStats();
  for (const x of list) {
    s.points += x.points; s.darts += x.darts;
    s.first9Points += x.first9Points; s.first9Darts += x.first9Darts;
    s.highestVisit = Math.max(s.highestVisit, x.highestVisit);
    s.count100 += x.count100; s.count140 += x.count140; s.count180 += x.count180;
    s.checkouts += x.checkouts; s.dartsAtDouble += x.dartsAtDouble;
    s.highestFinish = Math.max(s.highestFinish, x.highestFinish);
    s.legsWon += x.legsWon; s.shortLegs += x.shortLegs;
    if (x.bestLeg !== null && (s.bestLeg === null || x.bestLeg < s.bestLeg)) s.bestLeg = x.bestLeg;
  }
  return finalizeStats(s);
}

/** Letzte Aufnahmen eines Spielers im aktuellen Leg. */
export function lastVisits(state: MatchState, player: number, count = 3) {
  const leg = state.legs[state.legs.length - 1];
  return leg.visits.filter((v) => v.player === player).slice(-count);
}
