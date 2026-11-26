"use client";
import { computeMatch, dartLabel, lastVisits, matchStats, suggestCheckout } from "@/lib/game";
import type { StoredMatch } from "@/lib/store/types";
import { cx } from "@/components/ui";
import { formatLabel } from "@/components/RulesEditor";

export function LiveMatch({ m, label, big }: { m: StoredMatch; label?: string; big?: boolean }) {
  const st = computeMatch(m.setup, m.visits);
  return (
    <div className="rounded-3xl border border-live/50 bg-surface/90 p-3 sm:p-5">
      <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
        <span className="flex items-center gap-1.5 rounded-md bg-live px-2 py-0.5 text-white"><span className="h-2 w-2 animate-pulse rounded-full bg-white" />Live</span>
        <span className="truncate text-muted">{label ? `${label} · ` : ""}{formatLabel(m.setup.format)}{st.isSetPlay ? ` · Set ${st.set + 1}` : ""} · Leg {st.leg + 1}</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {m.setup.players.map((mp, i) => {
          const p = st.players[i];
          const active = st.current === i && !st.finished;
          const s = matchStats(st, i);
          const co = active && p.opened ? suggestCheckout(p.remaining, mp.rules.outRule, 3) : null;
          return (
            <div key={i} className={cx("rounded-2xl border p-3 text-center", active ? "border-pink bg-pink/15" : "border-line bg-surface-2/60", st.winner === i && "border-win")}>
              <div className={cx("truncate font-display font-bold uppercase", big ? "text-5xl" : "text-2xl")}>{active && "● "}{mp.nickname}</div>
              <div className={cx("font-display font-bold leading-none tabular", big ? "text-[12rem]" : "text-7xl sm:text-8xl")}>{p.remaining}</div>
              <div className={cx("mt-1 h-8 font-display text-cyan tabular", big ? "text-4xl h-12" : "text-xl")}>{co ? co.map(dartLabel).join(" ") : ""}</div>
              <div className={cx("mt-2 flex justify-center gap-2 font-display tabular", big ? "text-3xl" : "text-lg")}>
                {st.isSetPlay && <span className="rounded-lg bg-white px-2 text-black">Sets {p.sets}</span>}
                <span className={cx("rounded-lg px-2", st.isSetPlay ? "bg-surface" : "bg-white text-black")}>Legs {p.legs}</span>
              </div>
              <div className={cx("mt-2 text-muted tabular", big ? "text-2xl" : "text-sm")}>Ø {s.average.toFixed(1)} · 180er {s.count180}</div>
              <div className="mt-2 flex justify-center gap-1.5 font-display tabular">
                {lastVisits(st, i, 3).map((v, k) => (
                  <span key={k} className={cx("min-w-10 rounded-md px-1.5", big ? "text-2xl" : "text-base", v.bust ? "bg-live/20 text-live line-through" : "bg-surface")}>{v.bust ? v.visit.total : v.scored}</span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
