"use client";
import { dartLabel, suggestCheckout, type MatchPlayer, type MatchState, type PlayerStats, type VisitResult } from "@/lib/game";
import { cx } from "@/components/ui";
import { OUT_LABEL } from "@/components/RulesEditor";

export function PlayerPanel({
  mp, index, state, stats, last, active, dartsLeft, size, baseStart, baseOut,
}: {
  mp: MatchPlayer; index: number; state: MatchState; stats: PlayerStats; last: VisitResult[]; active: boolean;
  dartsLeft: number; size: "xl" | "lg" | "md"; baseStart: number; baseOut: string;
}) {
  const p = state.players[index];
  const checkout = active && p.opened ? suggestCheckout(p.remaining, mp.rules.outRule, dartsLeft) : null;
  const scoreSize = size === "xl" ? "text-[min(19vh,11rem)]" : size === "lg" ? "text-[min(15vh,8rem)]" : "text-[min(9vh,5rem)]";
  const badges: string[] = [];
  if (mp.rules.startScore !== baseStart) badges.push(String(mp.rules.startScore));
  if (mp.rules.outRule !== baseOut) badges.push(OUT_LABEL[mp.rules.outRule]);
  if (mp.rules.inRule === "double") badges.push(p.opened ? "Double In ✓" : "Double In");

  return (
    <div className={cx(
      "relative flex min-h-0 min-w-0 flex-col overflow-hidden rounded-3xl border p-3 sm:p-4 transition-all",
      active ? "border-pink bg-gradient-to-b from-pink/20 to-surface glow-pink" : "border-line bg-surface/80 opacity-80",
    )}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {active && <span className="h-3 w-3 shrink-0 rounded-full bg-pink shadow-[0_0_12px] shadow-pink" />}
            <div className={cx("truncate font-display font-bold uppercase leading-none", size === "md" ? "text-2xl" : "text-[min(5vh,2.6rem)]")}>{mp.nickname}</div>
          </div>
          {badges.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {badges.map((b) => <span key={b} className="rounded-md bg-sage-dark/70 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide">{b}</span>)}
            </div>
          )}
        </div>
        <div className="flex shrink-0 gap-1.5 font-display tabular">
          {state.isSetPlay && <Counter label="Sets" value={p.sets} accent />}
          <Counter label="Legs" value={p.legs} accent={!state.isSetPlay} />
        </div>
      </div>

      <div className={cx("my-auto py-1 text-center font-display font-bold leading-none tabular", scoreSize)}>{p.remaining}</div>

      <div className="flex min-h-9 items-center justify-center">
        {checkout ? (
          <div className="rounded-xl bg-cyan/15 px-3 py-1.5 font-display text-[min(3.6vh,1.8rem)] font-semibold tracking-wide text-cyan tabular">
            {checkout.map(dartLabel).join("  ")}
          </div>
        ) : null}
      </div>

      <div className="mt-2 flex items-end justify-between gap-2 text-sm">
        <div className="text-muted">
          <span className="text-white/90 font-semibold tabular">Ø {stats.average.toFixed(1)}</span>
          <span className="ml-2 tabular">Darts {stats.darts}</span>
        </div>
        <div className="flex gap-1.5 font-display tabular">
          {last.map((v, i) => (
            <span key={i} className={cx("min-w-11 rounded-lg px-2 py-0.5 text-center text-lg", v.bust ? "bg-live/20 text-live line-through" : v.scored >= 100 ? "bg-pink/25" : "bg-surface-2")}>
              {v.bust ? v.visit.total : v.scored}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function Counter({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className={cx("rounded-xl px-2.5 py-1 text-center", accent ? "bg-white text-black" : "bg-surface-2 text-white")}>
      <div className="text-[0.6rem] font-sans font-bold uppercase tracking-widest opacity-60">{label}</div>
      <div className="text-2xl font-bold leading-none">{value}</div>
    </div>
  );
}
