import { isCheckoutPossible } from "./checkout";
import { dartValue, isFinishingDart, opensLeg } from "./darts";
import type { MatchSetup, OutRule, PlayerRules, Visit } from "./types";

export interface VisitResult {
  player: number;
  visit: Visit;
  /** Gezählte Punkte (0 bei Bust oder wenn noch nicht "drin" bei Double In). */
  scored: number;
  bust: boolean;
  checkout: boolean;
  remainingBefore: number;
  remainingAfter: number;
  /** Nummer der Aufnahme des Spielers im Leg (1, 2, 3 ...). */
  visitNo: number;
}

export interface LegRecord {
  set: number;
  leg: number;
  starter: number;
  winner: number | null;
  visits: VisitResult[];
}

export interface PlayerState {
  remaining: number;
  opened: boolean;
  legs: number;
  sets: number;
}

export interface MatchState {
  players: PlayerState[];
  current: number;
  set: number;
  leg: number;
  legs: LegRecord[];
  finished: boolean;
  winner: number | null;
  legsToWin: number;
  setsToWin: number;
  isSetPlay: boolean;
}

export const winsNeeded = (bestOf: number) => Math.floor(Math.max(1, bestOf) / 2) + 1;

/**
 * Bewertet eine Aufnahme für einen Spieler. Reine Funktion, gut testbar.
 */
export function evaluateVisit(
  remaining: number,
  opened: boolean,
  rules: PlayerRules,
  visit: Visit,
): { scored: number; bust: boolean; checkout: boolean; opened: boolean } {
  const out: OutRule = rules.outRule;

  if (visit.darts && visit.darts.length > 0) {
    let rem = remaining;
    let isOpen = opened;
    for (const d of visit.darts) {
      if (!isOpen) {
        if (opensLeg(d, rules.inRule)) isOpen = true;
        else continue;
      }
      rem -= dartValue(d);
      if (rem < 0) return { scored: 0, bust: true, checkout: false, opened };
      if (rem === 0) {
        if (isFinishingDart(d, out)) return { scored: remaining, bust: false, checkout: true, opened: true };
        return { scored: 0, bust: true, checkout: false, opened };
      }
      if (rem === 1 && out !== "single") return { scored: 0, bust: true, checkout: false, opened };
    }
    return { scored: remaining - rem, bust: false, checkout: false, opened: isOpen };
  }

  // Eingabe als Gesamtsumme
  const total = visit.total;
  if (total === 0) return { scored: 0, bust: false, checkout: false, opened };
  // Bei Double In geht der Zähler davon aus, dass mit einem Doppel eröffnet wurde, wenn Punkte eingetragen werden.
  const rem = remaining - total;
  if (rem < 0) return { scored: 0, bust: true, checkout: false, opened };
  if (rem === 1 && out !== "single") return { scored: 0, bust: true, checkout: false, opened };
  if (rem === 0) {
    const darts = Math.min(3, Math.max(1, visit.dartsThrown || 3));
    if (!isCheckoutPossible(remaining, out, darts)) return { scored: 0, bust: true, checkout: false, opened };
    return { scored: total, bust: false, checkout: true, opened: true };
  }
  return { scored: total, bust: false, checkout: false, opened: true };
}

/** Berechnet den kompletten Spielstand aus den Aufnahmen. */
export function computeMatch(setup: MatchSetup, visits: Visit[]): MatchState {
  const n = setup.players.length;
  const isSetPlay = setup.format.sets > 1;
  const legsToWin = winsNeeded(setup.format.legs);
  const setsToWin = isSetPlay ? winsNeeded(setup.format.sets) : 1;

  const players: PlayerState[] = setup.players.map((p) => ({
    remaining: p.rules.startScore,
    opened: p.rules.inRule === "straight",
    legs: Math.max(0, p.headStart.legs | 0),
    sets: isSetPlay ? Math.max(0, p.headStart.sets | 0) : 0,
  }));

  let set = 0;
  let leg = 0;
  const legStarter = () => (setup.firstPlayer + set + leg) % n;
  const newLeg = (): LegRecord => ({ set, leg, starter: legStarter(), winner: null, visits: [] });

  const legs: LegRecord[] = [newLeg()];
  let current = legStarter();
  let finished = false;
  let winner: number | null = null;

  // Falls der Vorsprung allein schon reicht (Fehleingabe), nicht abstürzen.
  const visitCount = new Array(n).fill(0);

  for (const visit of visits) {
    if (finished) break;
    const p = players[current];
    const rules = setup.players[current].rules;
    const res = evaluateVisit(p.remaining, p.opened, rules, visit);
    visitCount[current]++;
    const before = p.remaining;
    if (!res.bust) {
      p.remaining -= res.scored;
      p.opened = res.opened;
    }
    const legRec = legs[legs.length - 1];
    legRec.visits.push({
      player: current,
      visit,
      scored: res.bust ? 0 : res.scored,
      bust: res.bust,
      checkout: res.checkout,
      remainingBefore: before,
      remainingAfter: p.remaining,
      visitNo: visitCount[current],
    });

    if (res.checkout) {
      legRec.winner = current;
      p.legs++;
      let setWon = false;
      if (p.legs >= legsToWin) {
        if (isSetPlay) {
          p.sets++;
          setWon = true;
          if (p.sets >= setsToWin) {
            finished = true;
            winner = current;
          }
        } else {
          finished = true;
          winner = current;
        }
      }
      if (finished) break;
      if (setWon) {
        set++;
        leg = 0;
        players.forEach((pl) => (pl.legs = 0));
      } else {
        leg++;
      }
      players.forEach((pl, i) => {
        pl.remaining = setup.players[i].rules.startScore;
        pl.opened = setup.players[i].rules.inRule === "straight";
      });
      visitCount.fill(0);
      legs.push(newLeg());
      current = legStarter();
    } else {
      current = (current + 1) % n;
    }
  }

  return { players, current, set, leg, legs, finished, winner, legsToWin, setsToWin, isSetPlay };
}
