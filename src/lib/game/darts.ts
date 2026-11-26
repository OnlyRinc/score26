import type { Dart, InRule, OutRule } from "./types";

export function dartValue(d: Dart): number {
  if (d.segment === 0) return 0;
  if (d.segment === 25) return 25 * Math.min(d.multiplier, 2);
  return d.segment * d.multiplier;
}

export function dartLabel(d: Dart): string {
  if (d.segment === 0) return "0";
  if (d.segment === 25) return d.multiplier >= 2 ? "Bull" : "25";
  const prefix = d.multiplier === 3 ? "T" : d.multiplier === 2 ? "D" : "";
  return `${prefix}${d.segment}`;
}

export function isDouble(d: Dart): boolean {
  return d.segment !== 0 && d.multiplier === 2;
}

/** Darf mit diesem Dart ein Leg beendet werden? */
export function isFinishingDart(d: Dart, out: OutRule): boolean {
  if (d.segment === 0) return false;
  if (out === "single") return true;
  if (out === "double") return d.multiplier === 2;
  return d.multiplier >= 2; // master out: Doppel oder Triple
}

/** Öffnet dieser Dart das Leg (Double In)? */
export function opensLeg(d: Dart, inRule: InRule): boolean {
  if (d.segment === 0) return false;
  if (inRule === "straight") return true;
  return d.multiplier === 2;
}

/** Aufnahme-Summen, die mit drei Darts nicht möglich sind. */
export const IMPOSSIBLE_TOTALS = new Set([163, 166, 169, 172, 173, 175, 176, 178, 179]);

export function isPossibleVisitTotal(total: number): boolean {
  return Number.isInteger(total) && total >= 0 && total <= 180 && !IMPOSSIBLE_TOTALS.has(total);
}

/** Alle sinnvollen Darts (ohne "daneben"). */
export const ALL_DARTS: Dart[] = (() => {
  const list: Dart[] = [];
  for (let s = 1; s <= 20; s++) {
    list.push({ segment: s, multiplier: 1 });
    list.push({ segment: s, multiplier: 2 });
    list.push({ segment: s, multiplier: 3 });
  }
  list.push({ segment: 25, multiplier: 1 });
  list.push({ segment: 25, multiplier: 2 });
  return list;
})();
