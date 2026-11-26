import { describe, expect, it } from "vitest";
import {
  computeStandings, drawGroups, resolveBracket, roundName, roundRobin, seedBracket, seedOrder,
  suggestPlan, DEFAULT_TIEBREAKERS, type MatchResult, type Qualifier,
} from "./tournament";

const res = (a: string, b: string, legsA: number, legsB: number, avgA = 50, avgB = 50): MatchResult => ({
  a, b, winner: legsA > legsB ? a : b, legsA, legsB, setsA: 0, setsB: 0,
  pointsA: avgA * 3, dartsA: 9, pointsB: avgB * 3, dartsB: 9,
});
const opts = { pointsWin: 2, pointsLoss: 0, tiebreakers: DEFAULT_TIEBREAKERS };

describe("Gruppenvorschlag", () => {
  it("liefert für 2 bis 32 Spieler einen gültigen Plan", () => {
    for (let n = 2; n <= 32; n++) {
      const p = suggestPlan(n);
      expect(p.sizes.reduce((a, b) => a + b, 0)).toBe(n);
      expect(p.koSize).toBeGreaterThanOrEqual(2);
      expect(p.advancePerGroup).toBeLessThanOrEqual(Math.min(...p.sizes));
    }
  });
  it("typische Größen", () => {
    expect(suggestPlan(4)).toMatchObject({ groups: 1, koSize: 4 });
    expect(suggestPlan(8)).toMatchObject({ groups: 2, advancePerGroup: 2, koSize: 4 });
    expect(suggestPlan(16)).toMatchObject({ groups: 4, advancePerGroup: 2, koSize: 8 });
    expect(suggestPlan(20)).toMatchObject({ groups: 4, advancePerGroup: 2, koSize: 8 });
  });
});

describe("Jeder gegen jeden", () => {
  for (const n of [3, 4, 5, 6]) {
    it(`${n} Spieler: jedes Paar genau einmal, niemand doppelt pro Runde`, () => {
      const ids = Array.from({ length: n }, (_, i) => `p${i}`);
      const rounds = roundRobin(ids);
      const pairs = new Set<string>();
      for (const r of rounds) {
        const inRound = r.flat();
        expect(new Set(inRound).size).toBe(inRound.length);
        for (const [a, b] of r) pairs.add([a, b].sort().join("-"));
      }
      expect(pairs.size).toBe((n * (n - 1)) / 2);
    });
  }
});

describe("Tabelle", () => {
  it("sortiert nach Punkten und Leg-Differenz", () => {
    const t = computeStandings(["a", "b", "c"], [res("a", "b", 2, 0), res("b", "c", 2, 1), res("c", "a", 2, 1)], opts);
    // alle 2 Punkte; Legdiff: a +1, b -1, c 0
    expect(t.map((r) => r.playerId)).toEqual(["a", "c", "b"]);
    expect(t[0].points).toBe(2);
  });
  it("direkter Vergleich bei Gleichstand von zwei Spielern", () => {
    const t = computeStandings(["a", "b", "c", "d"], [
      res("a", "b", 1, 2), // b schlägt a
      res("a", "c", 2, 0), res("a", "d", 2, 1),
      res("b", "c", 2, 1), res("b", "d", 0, 2),
      res("c", "d", 2, 0),
    ], { ...opts, tiebreakers: ["points", "headToHead", "legDiff"] });
    // a: 4 Punkte, b: 4 Punkte -> b vorne (direkter Vergleich)
    expect(t[0].playerId).toBe("b");
    expect(t[1].playerId).toBe("a");
  });
  it("Tiebreaker-Reihenfolge ist einstellbar (Average vor Legdiff)", () => {
    const results = [res("a", "c", 2, 0, 40, 30), res("b", "c", 2, 1, 70, 30)];
    const t1 = computeStandings(["a", "b", "c"], results, { ...opts, tiebreakers: ["points", "legDiff"] });
    const t2 = computeStandings(["a", "b", "c"], results, { ...opts, tiebreakers: ["points", "average"] });
    expect(t1[0].playerId).toBe("a");
    expect(t2[0].playerId).toBe("b");
  });
  it("Average wird aus Punkten und Darts berechnet", () => {
    const t = computeStandings(["a", "b"], [res("a", "b", 2, 0, 60, 45)], opts);
    expect(t[0].average).toBeCloseTo(60);
    expect(t[1].average).toBeCloseTo(45);
  });
});

describe("KO-Baum", () => {
  it("Setzreihenfolge", () => {
    expect(seedOrder(8)).toEqual([1, 8, 4, 5, 2, 7, 3, 6]);
  });
  const q = (groups: number, adv: number): Qualifier[] => {
    const list: Qualifier[] = [];
    for (let g = 0; g < groups; g++) for (let p = 1; p <= adv; p++) list.push({ playerId: `${"ABCDEFGH"[g]}${p}`, group: g, place: p });
    return list;
  };
  it("2 Gruppen, je 2 weiter: Kreuzspiele A1-B2, B1-A2", () => {
    const slots = seedBracket(q(2, 2));
    const pairs = [[slots[0], slots[1]], [slots[2], slots[3]]].map((p) => p.sort().join("-"));
    expect(pairs.sort()).toEqual(["A1-B2", "A2-B1"]);
  });
  it("4 Gruppen, je 2 weiter: keine Gruppe trifft sich in Runde 1, Gruppensieger gegen Zweite", () => {
    const slots = seedBracket(q(4, 2));
    for (let i = 0; i < 8; i += 2) {
      const [a, b] = [slots[i]!, slots[i + 1]!];
      expect(a[0]).not.toBe(b[0]);
      expect(new Set([a[1], b[1]])).toEqual(new Set(["1", "2"]));
    }
    // A1 und B1 in verschiedenen Hälften
    const half = (id: string) => (slots.indexOf(id) < 4 ? 0 : 1);
    expect(half("A1")).not.toBe(half("B1"));
  });
  it("Freilose bei 6 Qualifikanten: Gruppensieger A1 und B1 bekommen Freilos", () => {
    const slots = seedBracket(q(3, 2));
    expect(slots.length).toBe(8);
    const rounds = resolveBracket(slots, {}, false);
    const byes = rounds[0].filter((m) => m.bye).map((m) => m.winner);
    expect(byes.sort()).toEqual(["A1", "B1"]);
    // Halbfinale hat schon je einen Spieler (Freilos-Sieger)
    expect(rounds[1].map((m) => [m.a, m.b].filter(Boolean).length)).toEqual([1, 1]);
  });
  it("Ergebnisse fließen in die nächste Runde, Platz 3 wird aus Halbfinal-Verlierern gebildet", () => {
    const slots = ["a", "d", "b", "c"];
    let rounds = resolveBracket(slots, {}, true);
    expect(rounds.length).toBe(3);
    expect(rounds[0].every((m) => m.ready)).toBe(true);
    rounds = resolveBracket(slots, { "r0-m0": { winner: "a" }, "r0-m1": { winner: "c" } }, true);
    expect(rounds[1][0]).toMatchObject({ a: "a", b: "c", ready: true });
    expect(rounds[2][0]).toMatchObject({ key: "third", a: "d", b: "b", ready: true });
    rounds = resolveBracket(slots, { "r0-m0": { winner: "a" }, "r0-m1": { winner: "c" }, "r1-m0": { winner: "c" } }, true);
    expect(rounds[1][0].winner).toBe("c");
  });
  it("Rundennamen", () => {
    expect(roundName(3, 0)).toBe("Viertelfinale");
    expect(roundName(3, 2)).toBe("Finale");
    expect(roundName(2, 0)).toBe("Halbfinale");
  });
});

describe("Auslosung", () => {
  it("verteilt alle Spieler, Gesetzte in verschiedene Gruppen", () => {
    const ids = Array.from({ length: 10 }, (_, i) => `p${i}`);
    for (let k = 0; k < 20; k++) {
      const g = drawGroups(ids, 3, ["p0", "p1", "p2"]);
      expect(g.flat().sort()).toEqual([...ids].sort());
      expect(g.map((x) => x.length).sort()).toEqual([3, 3, 4]);
      const seededGroups = ["p0", "p1", "p2"].map((s) => g.findIndex((x) => x.includes(s)));
      expect(new Set(seededGroups).size).toBe(3);
    }
  });
});
