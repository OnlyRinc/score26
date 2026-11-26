import { describe, expect, it } from "vitest";
import {
  computeMatch, dartValue, evaluateVisit, isCheckoutPossible, isPossibleVisitTotal,
  matchStats, minDartsToFinish, suggestCheckout, suggestStartScores,
  type Dart, type MatchSetup, type OutRule, type PlayerRules, type Visit,
} from "./index";

const D = (segment: number, multiplier: 1 | 2 | 3 = 1): Dart => ({ segment, multiplier });
const rules = (startScore = 501, outRule: OutRule = "double", inRule: "straight" | "double" = "straight"): PlayerRules =>
  ({ startScore, inRule, outRule });
const v = (total: number, dartsThrown = 3, dartsAtDouble = 0): Visit => ({ total, dartsThrown, dartsAtDouble });
const dv = (...darts: Dart[]): Visit => ({ total: darts.reduce((s, d) => s + dartValue(d), 0), darts, dartsThrown: darts.length, dartsAtDouble: 0 });

function setup(a: Partial<PlayerRules> = {}, b: Partial<PlayerRules> = {}, legs = 3, sets = 1, headA = 0, headB = 0): MatchSetup {
  return {
    format: { legs, sets },
    firstPlayer: 0,
    players: [
      { name: "A", nickname: "A", rules: { ...rules(), ...a }, headStart: { legs: headA, sets: 0 } },
      { name: "B", nickname: "B", rules: { ...rules(), ...b }, headStart: { legs: headB, sets: 0 } },
    ],
  };
}

describe("Aufnahme-Summen", () => {
  it("erkennt unmögliche Summen", () => {
    for (const t of [163, 166, 169, 172, 173, 175, 176, 178, 179, 181, -1]) expect(isPossibleVisitTotal(t)).toBe(false);
    for (const t of [0, 1, 60, 100, 140, 171, 174, 177, 180]) expect(isPossibleVisitTotal(t)).toBe(true);
  });
});

describe("Bust-Erkennung", () => {
  it("Überwerfen ist Bust", () => {
    expect(evaluateVisit(40, true, rules(), v(41)).bust).toBe(true);
  });
  it("Rest 1 ist bei Double Out Bust, bei Single Out nicht", () => {
    expect(evaluateVisit(40, true, rules(501, "double"), v(39)).bust).toBe(true);
    expect(evaluateVisit(40, true, rules(501, "master"), v(39)).bust).toBe(true);
    expect(evaluateVisit(40, true, rules(501, "single"), v(39)).bust).toBe(false);
  });
  it("Double Out: Finish auf Single ist Bust (Dart für Dart)", () => {
    expect(evaluateVisit(20, true, rules(), dv(D(20))).bust).toBe(true);
    const ok = evaluateVisit(40, true, rules(), dv(D(20, 2)));
    expect(ok.checkout).toBe(true);
  });
  it("Master Out: Finish auf Triple erlaubt, auf Single nicht", () => {
    expect(evaluateVisit(60, true, rules(501, "master"), dv(D(20, 3))).checkout).toBe(true);
    expect(evaluateVisit(20, true, rules(501, "master"), dv(D(20))).bust).toBe(true);
  });
  it("Single Out: jedes Feld beendet", () => {
    expect(evaluateVisit(7, true, rules(501, "single"), dv(D(7))).checkout).toBe(true);
  });
  it("Bust mitten in der Aufnahme stoppt die Wertung", () => {
    const r = evaluateVisit(50, true, rules(), dv(D(20, 3), D(1)));
    expect(r.bust).toBe(true);
    expect(r.scored).toBe(0);
  });
  it("Gesamtsumme: unmögliches Finish (z. B. 169 bei Double Out) ist Bust", () => {
    expect(evaluateVisit(169, true, rules(), v(169)).bust).toBe(true);
    expect(evaluateVisit(170, true, rules(), v(170)).checkout).toBe(true);
  });
  it("Gesamtsumme: Finish muss mit angegebenen Darts möglich sein", () => {
    expect(evaluateVisit(100, true, rules(), v(100, 1)).bust).toBe(true);
    expect(evaluateVisit(100, true, rules(), v(100, 2)).checkout).toBe(true);
  });
});

describe("Double In", () => {
  it("zählt erst ab dem ersten Doppel", () => {
    const r = evaluateVisit(501, false, rules(501, "double", "double"), dv(D(20, 3), D(10, 2), D(20)));
    expect(r.scored).toBe(40);
    expect(r.opened).toBe(true);
  });
  it("ohne Doppel bleibt man draußen", () => {
    const r = evaluateVisit(501, false, rules(501, "double", "double"), dv(D(20, 3), D(20, 3), D(20, 3)));
    expect(r.scored).toBe(0);
    expect(r.opened).toBe(false);
  });
});

describe("Checkout-Vorschläge", () => {
  const sum = (ds: Dart[]) => ds.reduce((s, d) => s + dartValue(d), 0);
  it("liefert für Double Out gültige Wege von 2 bis 170", () => {
    const impossible = new Set([159, 162, 163, 165, 166, 168, 169]);
    for (let r = 2; r <= 170; r++) {
      const route = suggestCheckout(r, "double");
      if (impossible.has(r)) {
        expect(route, `Rest ${r}`).toBeNull();
        continue;
      }
      expect(route, `Rest ${r}`).not.toBeNull();
      expect(sum(route!)).toBe(r);
      expect(route![route!.length - 1].multiplier).toBe(2);
    }
  });
  it("bekannte Wege", () => {
    expect(suggestCheckout(170, "double")!.map((d) => [d.segment, d.multiplier])).toEqual([[20, 3], [20, 3], [25, 2]]);
    expect(suggestCheckout(40, "double")).toEqual([D(20, 2)]);
    expect(suggestCheckout(121, "double")!.length).toBe(3);
  });
  it("berücksichtigt die verbleibenden Darts", () => {
    expect(suggestCheckout(100, "double", 1)).toBeNull();
    expect(suggestCheckout(100, "double", 2)).not.toBeNull();
    expect(minDartsToFinish(100, "double")).toBe(2);
  });
  it("passt sich der Out-Regel an", () => {
    expect(suggestCheckout(180, "master")!.length).toBe(3);
    expect(suggestCheckout(180, "double")).toBeNull();
    expect(suggestCheckout(1, "double")).toBeNull();
    expect(suggestCheckout(1, "single")).toEqual([D(1)]);
    expect(suggestCheckout(57, "master")).toEqual([D(19, 3)]);
    for (let r = 1; r <= 180; r++) {
      const route = suggestCheckout(r, "single");
      if (route) expect(sum(route)).toBe(r);
    }
    expect(isCheckoutPossible(179, "single")).toBe(false);
  });
});

describe("Match-Ablauf", () => {
  it("Leg wird gewonnen, Starter wechselt", () => {
    const s = setup({ startScore: 101 }, { startScore: 101 }, 3);
    const st = computeMatch(s, [v(60), v(0), v(41, 2, 1)]);
    expect(st.players[0].legs).toBe(1);
    expect(st.legs.length).toBe(2);
    expect(st.current).toBe(1); // B beginnt Leg 2
    expect(st.players[0].remaining).toBe(101);
  });
  it("Bust setzt Rest zurück, nächster Spieler ist dran", () => {
    const st = computeMatch(setup({ startScore: 101 }), [v(100)]);
    expect(st.players[0].remaining).toBe(101);
    expect(st.current).toBe(1);
  });
  it("Best of 3 Legs endet bei 2 gewonnenen Legs", () => {
    const s = setup({ startScore: 40 }, { startScore: 40 }, 3);
    const st = computeMatch(s, [v(40, 1), /* Leg 2, B beginnt */ v(0), v(40, 1)]);
    expect(st.finished).toBe(true);
    expect(st.winner).toBe(0);
  });
  it("Sets: Best of 3 Sets mit Best of 3 Legs", () => {
    const s = setup({ startScore: 40 }, { startScore: 40 }, 3, 3);
    // A gewinnt jedes Leg, egal wer beginnt
    const visits: Visit[] = [];
    let st = computeMatch(s, visits);
    let guard = 0;
    while (!st.finished && guard++ < 50) {
      visits.push(st.current === 0 ? v(40, 1) : v(0));
      st = computeMatch(s, visits);
    }
    expect(st.finished).toBe(true);
    expect(st.players[0].sets).toBe(2);
    expect(st.winner).toBe(0);
  });
  it("Rückgängig = letzte Aufnahme entfernen", () => {
    const s = setup();
    const visits = [v(60), v(45), v(100)];
    const st = computeMatch(s, visits.slice(0, -1));
    expect(st.players[0].remaining).toBe(441);
    expect(st.current).toBe(0);
  });
});

describe("Handicap", () => {
  it("unterschiedliche Startpunkte und Out-Regeln pro Spieler", () => {
    const s = setup({ startScore: 501, outRule: "double" }, { startScore: 301, outRule: "single" });
    const st = computeMatch(s, [v(100), v(100)]);
    expect(st.players[0].remaining).toBe(401);
    expect(st.players[1].remaining).toBe(201);
    // B darf auf Single beenden
    const st2 = computeMatch({ ...s, players: [s.players[0], { ...s.players[1], rules: { ...s.players[1].rules, startScore: 7 } }] }, [v(0), { ...dv(D(7)) }]);
    expect(st2.players[1].legs).toBe(1);
  });
  it("Leg-Vorsprung zählt zum Sieg", () => {
    const s = setup({ startScore: 40 }, { startScore: 40 }, 3, 1, 0, 1);
    const st = computeMatch(s, [v(0), v(40, 1)]);
    expect(st.players[1].legs).toBe(2);
    expect(st.finished).toBe(true);
    expect(st.winner).toBe(1);
  });
  it("Handicap-Vorschlag nach Average", () => {
    expect(suggestStartScores(60, 40)).toEqual([501, 401]);
    expect(suggestStartScores(40, 60, 501, 25)).toEqual([451, 501]);
    expect(suggestStartScores(50, 50)).toEqual([501, 501]);
  });
});

describe("Statistiken", () => {
  it("Average, 180er, Checkout-Quote, höchstes Finish", () => {
    const s = setup({ startScore: 301 }, { startScore: 301 }, 1);
    const st = computeMatch(s, [v(180), v(20), v(81, 3, 1), v(20), v(40, 2, 2)]);
    const a = matchStats(st, 0);
    expect(st.winner).toBe(0);
    expect(a.count180).toBe(1);
    expect(a.points).toBe(301);
    expect(a.darts).toBe(8);
    expect(a.average).toBeCloseTo(301 / 8 * 3);
    expect(a.checkouts).toBe(1);
    expect(a.dartsAtDouble).toBe(3);
    expect(a.checkoutRate).toBeCloseTo(1 / 3);
    expect(a.highestFinish).toBe(40);
    expect(a.bestLeg).toBe(8);
    expect(a.shortLegs).toBe(1);
  });
});
