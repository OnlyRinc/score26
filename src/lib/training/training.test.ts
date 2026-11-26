import { describe, expect, it } from "vitest";
import {
  computeAtc, computeBobs27, computeC121, computeCheckout, computeD99, computeScoring, randomCheckoutTargets, summarize,
} from "./training";
const e = (v: number, d?: number) => ({ v, d });

describe("121 Checkout", () => {
  const s = { start: 121, rounds: 3, dartsPerTarget: 9 as const, onFail: "stay" as const };
  it("Checkout im 3. Besuch -> nächstes Ziel 122", () => {
    const st = computeC121(s, [e(60), e(21), e(40, 2)]);
    expect(st.done).toEqual([{ target: 121, success: true, darts: 8 }]);
    expect(st.target).toBe(122);
    expect(st.remaining).toBe(122);
  });
  it("nach 9 Darts ohne Checkout: Ziel bleibt", () => {
    const st = computeC121(s, [e(60), e(20), e(20)]);
    expect(st.done[0]).toMatchObject({ target: 121, success: false });
    expect(st.target).toBe(121);
  });
  it("Bust zählt als Besuch ohne Punkte", () => {
    const st = computeC121(s, [e(100), e(30)]);
    expect(st.remaining).toBe(21);
    expect(st.dartsUsed).toBe(6);
  });
  it("Variante: bei Fehlversuch zurück auf Start", () => {
    const st = computeC121({ ...s, onFail: "reset" }, [e(121, 3), e(0), e(0), e(0)]);
    expect(st.target).toBe(121);
  });
  it("endet nach der eingestellten Zahl Ziele", () => {
    const st = computeC121(s, [e(121, 3), e(122, 3), e(123, 3)]);
    expect(st.finished).toBe(true);
    expect(st.best).toBe(123);
  });
});

describe("99 Darts", () => {
  it("zählt Treffer nach Ring und Punkte", () => {
    const s = { segment: 20, ring: "triple" as const, darts: 5 };
    const st = computeD99(s, [e(3), e(1), e(0), e(3), e(2), e(3)]);
    expect(st.thrown).toBe(5);
    expect(st.hits).toBe(2);
    expect(st.points).toBe(60 + 20 + 0 + 60 + 40);
    expect(st.finished).toBe(true);
  });
  it("Bull: Doppel = 50", () => {
    const st = computeD99({ segment: 25, ring: "any", darts: 3 }, [e(1), e(2), e(0)]);
    expect(st.points).toBe(75);
    expect(st.hits).toBe(2);
  });
});

describe("Around the Clock", () => {
  it("braucht mindestens 21 Darts mit Bull", () => {
    const st = computeAtc({ ring: "any", bull: true }, Array.from({ length: 21 }, () => e(1)));
    expect(st.finished).toBe(true);
    expect(st.thrown).toBe(21);
  });
  it("Fehlwürfe zählen mit", () => {
    const st = computeAtc({ ring: "any", bull: false }, [e(0), e(1), e(0), e(1)]);
    expect(st.index).toBe(2);
    expect(st.thrown).toBe(4);
  });
});

describe("Bob's 27", () => {
  it("Treffer addieren, kein Treffer zieht das Doppel ab", () => {
    const st = computeBobs27({ stopAtZero: true }, [e(1), e(0), e(2)]);
    // 27 + 2 - 4 + 2*6 = 37
    expect(st.score).toBe(37);
    expect(st.index).toBe(3);
  });
  it("Ende, wenn der Stand auf 0 oder darunter fällt", () => {
    const st = computeBobs27({ stopAtZero: true }, [e(0), e(0), e(0), e(0), e(0)]);
    // 27-2-4-6-8 = 7, -10 -> -3
    expect(st.busted).toBe(true);
    expect(st.finished).toBe(true);
    expect(st.score).toBe(-3);
  });
  it("Bull zählt 50", () => {
    const evs = [...Array.from({ length: 20 }, () => e(0)), e(1)];
    const st = computeBobs27({ stopAtZero: false }, evs);
    expect(st.score).toBe(27 - 420 + 50);
    expect(st.finished).toBe(true);
  });
});

describe("Checkout-Training", () => {
  it("Ziele sind immer auscheckbar und im Bereich", () => {
    const t = randomCheckoutTargets(150, 170, 200);
    for (const x of t) {
      expect(x).toBeGreaterThanOrEqual(150);
      expect([159, 162, 163, 165, 166, 168, 169]).not.toContain(x);
    }
  });
  it("zählt Erfolge", () => {
    const st = computeCheckout({ min: 40, max: 60, rounds: 3, darts: 3, targets: [40, 50, 60] }, [e(1), e(0), e(2)]);
    expect(st.success).toBe(2);
    expect(st.finished).toBe(true);
    expect(summarize({ game: "checkout", s: { min: 40, max: 60, rounds: 3, darts: 3, targets: [40, 50, 60] } }, [e(1), e(0), e(2)]).score).toBe(2);
  });
});

describe("Scoring", () => {
  it("Average pro Aufnahme", () => {
    const st = computeScoring({ visits: 3 }, [e(60), e(100), e(180), e(140)]);
    expect(st.visits).toBe(3);
    expect(st.average).toBeCloseTo(340 / 3);
    expect(st.c180).toBe(1);
    expect(st.c100).toBe(1);
  });
});
