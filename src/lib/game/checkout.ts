import { ALL_DARTS, dartValue, isFinishingDart } from "./darts";
import type { Dart, OutRule } from "./types";

// Bevorzugte Doppel zum Auschecken (vorne = beliebter).
const DOUBLE_PREF = [20, 16, 18, 12, 10, 8, 14, 25, 6, 4, 19, 17, 15, 13, 11, 9, 7, 5, 3, 2, 1];

function finishCost(d: Dart, out: OutRule): number {
  const rank = DOUBLE_PREF.indexOf(d.segment);
  if (out === "double") return rank;
  if (out === "master") return d.multiplier === 2 ? rank : rank + 4;
  // Single Out: lieber einfache Felder als Triple/Doppel
  if (d.segment === 25) return d.multiplier === 2 ? 8 : 6;
  if (d.multiplier === 1) return (20 - d.segment) * 0.1;
  if (d.multiplier === 3) return 3 + (20 - d.segment) * 0.1;
  return 4 + rank * 0.1;
}

function setupCost(d: Dart): number {
  if (d.segment === 25) return d.multiplier === 2 ? 14 : 12;
  if (d.multiplier === 3) {
    const big = [20, 19, 18, 17].indexOf(d.segment);
    return big >= 0 ? big : 6 + (20 - d.segment);
  }
  if (d.multiplier === 1) return 2 + (20 - d.segment) * 0.1;
  return 20; // Doppel als Vorbereitung ist unüblich
}

const cache = new Map<string, Dart[] | null>();

/**
 * Schlägt einen Checkout-Weg vor (z. B. 121 -> T20 25 D18), passend zur Out-Regel.
 * Gibt null zurück, wenn mit den verbleibenden Darts kein Finish möglich ist.
 */
export function suggestCheckout(remaining: number, out: OutRule, dartsLeft = 3): Dart[] | null {
  if (remaining <= 0 || dartsLeft <= 0) return null;
  if (remaining > 180) return null;
  const key = `${remaining}|${out}|${dartsLeft}`;
  if (cache.has(key)) return cache.get(key)!;

  const finishers = ALL_DARTS.filter((d) => isFinishingDart(d, out));
  let best: Dart[] | null = null;
  let bestCost = Infinity;

  const consider = (route: Dart[]) => {
    const setup = route.slice(0, -1);
    const cost =
      route.length * 1000 +
      finishCost(route[route.length - 1], out) * 3 +
      setup.reduce((s, d) => s + setupCost(d), 0);
    if (cost < bestCost) {
      bestCost = cost;
      // Vorbereitende Darts: größte zuerst werfen
      const ordered = [...setup].sort((a, b) => dartValue(b) - dartValue(a));
      best = [...ordered, route[route.length - 1]];
    }
  };

  for (const f of finishers) {
    const fv = dartValue(f);
    if (fv === remaining) consider([f]);
    if (dartsLeft >= 2) {
      for (const a of ALL_DARTS) {
        const av = dartValue(a);
        if (av + fv === remaining) consider([a, f]);
        if (dartsLeft >= 3) {
          const rest = remaining - av - fv;
          if (rest <= 0) continue;
          for (const b of ALL_DARTS) {
            if (dartValue(b) === rest) consider([a, b, f]);
          }
        }
      }
    }
  }

  cache.set(key, best);
  return best;
}

export function isCheckoutPossible(remaining: number, out: OutRule, dartsLeft = 3): boolean {
  return suggestCheckout(remaining, out, dartsLeft) !== null;
}

/** Minimale Anzahl Darts für ein Finish (oder null). */
export function minDartsToFinish(remaining: number, out: OutRule): number | null {
  for (let n = 1; n <= 3; n++) if (isCheckoutPossible(remaining, out, n)) return n;
  return null;
}
