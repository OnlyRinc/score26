import { computeMatch, matchStats, mergeStats, type PlayerStats } from "@/lib/game";
import type { StoredMatch } from "./types";

/** Statistiken pro Spieler über alle gespeicherten Matches (Spielerhistorie). */
export function playerHistory(matches: Record<string, StoredMatch>, filter?: (m: StoredMatch) => boolean): Record<string, { stats: PlayerStats; matches: number; wins: number }> {
  const acc: Record<string, { list: PlayerStats[]; matches: number; wins: number }> = {};
  for (const m of Object.values(matches)) {
    if (filter && !filter(m)) continue;
    if (m.visits.length === 0) continue;
    const st = computeMatch(m.setup, m.visits);
    m.setup.players.forEach((p, i) => {
      if (!p.playerId) return;
      const e = (acc[p.playerId] ??= { list: [], matches: 0, wins: 0 });
      e.list.push(matchStats(st, i));
      if (st.finished) e.matches++;
      if (st.winner === i) e.wins++;
    });
  }
  const out: Record<string, { stats: PlayerStats; matches: number; wins: number }> = {};
  for (const [id, e] of Object.entries(acc)) out[id] = { stats: mergeStats(e.list), matches: e.matches, wins: e.wins };
  return out;
}

export function playerAverages(matches: Record<string, StoredMatch>): Record<string, { average: number; matches: number }> {
  const h = playerHistory(matches);
  const out: Record<string, { average: number; matches: number }> = {};
  for (const [id, e] of Object.entries(h)) if (e.stats.darts > 0) out[id] = { average: e.stats.average, matches: e.matches };
  return out;
}
