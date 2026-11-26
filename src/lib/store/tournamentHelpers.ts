import { computeMatch, matchStats, type MatchPlayer, type MatchSetup } from "@/lib/game";
import {
  computeStandings, groupName, resolveBracket, roundName, roundRobin, seedBracket,
  type KoMatch, type Qualifier, type StandingRow,
} from "@/lib/tournament";
import type { FixtureResult, Player, RoundFormat, StoredMatch, Tournament } from "./types";

export interface Fixture {
  key: string;
  stage: "group" | "ko";
  label: string; // z. B. "Gruppe A" oder "Halbfinale"
  a: string | null;
  b: string | null;
  result?: FixtureResult;
  ready: boolean;
  group?: number;
  round?: number;
  roundLabel?: string;
}

export function displayName(p?: Player | null): string {
  if (!p) return "?";
  return p.nickname || p.firstName || p.lastName || "?";
}
export function fullName(p?: Player | null): string {
  if (!p) return "";
  return [p.firstName, p.lastName].filter(Boolean).join(" ");
}

export function groupFixtures(t: Tournament): Fixture[] {
  const perGroup = t.groups.map((g, gi) =>
    roundRobin(g).map((round, ri) =>
      round.map(([a, b]): Fixture => {
        const key = `g${gi}:${[a, b].sort().join("|")}`;
        const result = t.groupResults[key];
        return { key, stage: "group", label: groupName(gi), a, b, result, ready: !result, group: gi, round: ri };
      }),
    ),
  );
  // Runden der Gruppen abwechselnd mischen, damit alle Gruppen gleichmäßig dran sind
  const out: Fixture[] = [];
  const maxRounds = Math.max(0, ...perGroup.map((g) => g.length));
  for (let r = 0; r < maxRounds; r++) {
    const maxInRound = Math.max(0, ...perGroup.map((g) => g[r]?.length ?? 0));
    for (let i = 0; i < maxInRound; i++) for (const g of perGroup) if (g[r]?.[i]) out.push(g[r][i]);
  }
  return out;
}

export function groupStandings(t: Tournament, gi: number): StandingRow[] {
  const results = Object.entries(t.groupResults).filter(([k]) => k.startsWith(`g${gi}:`)).map(([, r]) => r);
  return computeStandings(t.groups[gi] ?? [], results, { pointsWin: t.pointsWin, pointsLoss: t.pointsLoss, tiebreakers: t.tiebreakers });
}

export function groupsFinished(t: Tournament): boolean {
  const f = groupFixtures(t);
  return f.length > 0 && f.every((x) => !!x.result);
}

export function qualifiers(t: Tournament): Qualifier[] {
  const list: Qualifier[] = [];
  t.groups.forEach((_, gi) => {
    groupStandings(t, gi)
      .slice(0, t.advancePerGroup)
      .forEach((row, idx) => list.push({ playerId: row.playerId, group: gi, place: idx + 1 }));
  });
  return list;
}

export function buildKoSlots(t: Tournament): (string | null)[] {
  return seedBracket(qualifiers(t));
}

export function koRounds(t: Tournament): KoMatch[][] {
  if (!t.koSlots) return [];
  const results: Record<string, { winner: string }> = {};
  for (const [k, r] of Object.entries(t.koResults)) results[k] = { winner: r.winner };
  return resolveBracket(t.koSlots, results, t.thirdPlace);
}

export function koRoundLabel(rounds: KoMatch[][], m: KoMatch): string {
  const main = rounds.filter((r) => r[0]?.key !== "third").length;
  return roundName(main, m.round, m.key === "third");
}

export function koFixtures(t: Tournament): Fixture[] {
  const rounds = koRounds(t);
  return rounds.flat().filter((m) => !m.bye).map((m) => {
    const label = koRoundLabel(rounds, m);
    return { key: m.key, stage: "ko", label, roundLabel: label, a: m.a, b: m.b, result: t.koResults[m.key], ready: m.ready, round: m.round };
  });
}

/** Offene Spiele in Spielreihenfolge (das erste ist "als Nächstes dran"). */
export function upcomingFixtures(t: Tournament): Fixture[] {
  if (t.status === "groups") return groupFixtures(t).filter((f) => !f.result);
  if (t.status === "ko") {
    const ko = koFixtures(t).filter((f) => !f.result && f.ready);
    // Spiel um Platz 3 vor dem Finale
    return ko.sort((x, y) => {
      const xf = x.label === "Finale" ? 1 : 0;
      const yf = y.label === "Finale" ? 1 : 0;
      return xf - yf || (x.round ?? 0) - (y.round ?? 0);
    });
  }
  return [];
}

export function roundFormatFor(t: Tournament, f: Fixture): RoundFormat {
  if (f.stage === "group") return t.groupFormat;
  return t.koFormats[f.label] ?? t.groupFormat;
}

/** Erstellt die Match-Einstellungen inkl. Turnier-Handicaps der Spieler. */
export function buildSetup(t: Tournament, f: Fixture, players: Record<string, Player>): MatchSetup {
  const rf = roundFormatFor(t, f);
  const mk = (id: string): MatchPlayer => {
    const h = t.handicaps[id];
    const p = players[id];
    return {
      playerId: id,
      name: fullName(p) || displayName(p),
      nickname: displayName(p),
      rules: {
        startScore: h?.startScore ?? rf.rules.startScore,
        inRule: h?.inRule ?? rf.rules.inRule,
        outRule: h?.outRule ?? rf.rules.outRule,
      },
      headStart: { legs: h?.legs ?? 0, sets: h?.sets ?? 0 },
    };
  };
  return { players: [mk(f.a!), mk(f.b!)], format: { ...rf.format }, firstPlayer: 0 };
}

export function resultFromMatch(m: StoredMatch): FixtureResult | null {
  const st = computeMatch(m.setup, m.visits);
  if (!st.finished || st.winner === null) return null;
  const [pa, pb] = m.setup.players;
  const sa = matchStats(st, 0);
  const sb = matchStats(st, 1);
  // Gezählte Legs = im Match gewonnene Legs (ohne Vorsprung), bei Sets: Legs über alle Sets
  const legsA = st.legs.filter((l) => l.winner === 0).length;
  const legsB = st.legs.filter((l) => l.winner === 1).length;
  return {
    a: pa.playerId!, b: pb.playerId!,
    winner: st.winner === 0 ? pa.playerId! : pb.playerId!,
    legsA: st.isSetPlay ? legsA : st.players[0].legs,
    legsB: st.isSetPlay ? legsB : st.players[1].legs,
    setsA: st.players[0].sets, setsB: st.players[1].sets,
    pointsA: sa.points, dartsA: sa.darts, pointsB: sb.points, dartsB: sb.darts,
    matchId: m.id,
  };
}

export function tournamentMatches(t: Tournament, matches: Record<string, StoredMatch>): StoredMatch[] {
  return Object.values(matches).filter((m) => m.tournamentId === t.id);
}

/** Ergebnis aus Sicht von Spieler a/b einer Begegnung */
export function scoreLine(r: FixtureResult, a: string): string {
  const flip = r.a !== a;
  const sets = r.setsA + r.setsB > 0;
  const [x, y] = sets ? [r.setsA, r.setsB] : [r.legsA, r.legsB];
  return flip ? `${y} : ${x}` : `${x} : ${y}`;
}
