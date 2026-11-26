import type { TrainingSession } from "@/lib/store/types";
import { settingsLabel, summarize, type TrainingGame } from "./training";

/** Bestwert eines Spielers (oder aller) für ein Spiel mit gleichen Einstellungen. */
export function personalBest(trainings: Record<string, TrainingSession>, ref: TrainingSession, excludeSelf = true) {
  const label = settingsLabel(ref.settings);
  let best: { score: number; label: string; at: number } | null = null;
  for (const t of Object.values(trainings)) {
    if (excludeSelf && t.id === ref.id) continue;
    if (!t.finishedAt || t.settings.game !== ref.settings.game) continue;
    if (settingsLabel(t.settings) !== label) continue;
    if ((t.playerId ?? t.playerName) !== (ref.playerId ?? ref.playerName)) continue;
    const s = summarize(t.settings, t.events);
    if (!best || (s.higherIsBetter ? s.score > best.score : s.score < best.score)) best = { score: s.score, label: s.scoreLabel, at: t.finishedAt };
  }
  return best;
}

export function sessionsFor(trainings: Record<string, TrainingSession>, game?: TrainingGame) {
  return Object.values(trainings)
    .filter((t) => !game || t.settings.game === game)
    .sort((a, b) => b.createdAt - a.createdAt);
}
