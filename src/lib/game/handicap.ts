/**
 * Einfacher Handicap-Vorschlag: Für je 10 Punkte Average-Unterschied
 * bekommt der schwächere Spieler `pointsPer10` Punkte weniger Startpunkte.
 * Der Wert ist einstellbar und wird auf 10er gerundet.
 */
export function suggestStartScores(
  avgA: number,
  avgB: number,
  baseScore = 501,
  pointsPer10 = 50,
  minScore = 101,
): [number, number] {
  const diff = Math.abs(avgA - avgB);
  const reduction = Math.round(((diff / 10) * pointsPer10) / 10) * 10;
  const reduced = Math.max(minScore, baseScore - reduction);
  if (avgA === avgB || reduction === 0) return [baseScore, baseScore];
  return avgA > avgB ? [baseScore, reduced] : [reduced, baseScore];
}
