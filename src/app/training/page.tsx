"use client";
import Link from "next/link";
import { useHydrated, useStore } from "@/lib/store/store";
import { GAME_INFO, settingsLabel, summarize, type TrainingGame } from "@/lib/training/training";
import { sessionsFor } from "@/lib/training/history";
import { Empty, Loading, Page, PageHeader, cx } from "@/components/ui";

const GAMES: TrainingGame[] = ["c121", "d99", "atc", "bobs27", "checkout", "scoring"];

export default function TrainingHome() {
  const hydrated = useHydrated();
  const trainings = useStore((s) => s.trainings);
  const deleteTraining = useStore((s) => s.deleteTraining);
  if (!hydrated) return <Loading />;
  const recent = sessionsFor(trainings).slice(0, 30);
  return (
    <Page>
      <PageHeader title="Training" back="/" />
      <div className="stagger grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {GAMES.map((g) => {
          const count = sessionsFor(trainings, g).filter((t) => t.finishedAt).length;
          return (
            <Link key={g} href={`/training/new/?game=${g}`} className="tile group flex gap-4 rounded-3xl border border-line bg-gradient-to-br from-pink-dark/25 to-surface p-5">
              <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-pink/20 font-display text-2xl font-bold text-pink neon-text border border-pink/30">{GAME_INFO[g].short}</div>
              <div className="min-w-0">
                <div className="font-display text-2xl uppercase">{GAME_INFO[g].name}</div>
                <div className="text-sm text-muted">{GAME_INFO[g].desc}</div>
                {count > 0 && <div className="mt-1 text-xs text-cyan">{count}× gespielt</div>}
              </div>
            </Link>
          );
        })}
      </div>

      <h2 className="mb-3 mt-10 font-display text-xl uppercase tracking-wide text-muted">Verlauf</h2>
      {recent.length === 0 ? <Empty>Noch keine Trainings. Wähle oben ein Spiel.</Empty> : (
        <div className="space-y-2">
          {recent.map((t) => {
            const s = summarize(t.settings, t.events);
            return (
              <div key={t.id} className="flex items-center gap-2 rounded-xl border border-line bg-surface p-2 pl-4">
                <Link href={`/training/play/?id=${t.id}`} className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-0.5 py-1.5">
                  <span className="w-40 font-display text-lg uppercase">{GAME_INFO[t.settings.game].name}</span>
                  <span className="w-28 truncate font-display text-lg uppercase text-pink">{t.playerName}</span>
                  <span className={cx("font-semibold tabular", !t.finishedAt && "text-muted")}>{t.finishedAt ? s.scoreLabel : "läuft noch …"}</span>
                  <span className="text-xs text-muted">{settingsLabel(t.settings)} · {new Date(t.createdAt).toLocaleDateString("de-DE")}</span>
                </Link>
                <button aria-label="Training löschen" onClick={() => { if (confirm("Training löschen?")) deleteTraining(t.id); }}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-muted active:bg-live/30">🗑</button>
              </div>
            );
          })}
        </div>
      )}
    </Page>
  );
}
