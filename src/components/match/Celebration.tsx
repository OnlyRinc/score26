"use client";
import { useEffect, useMemo } from "react";
import { cx } from "@/components/ui";

export type CelebrationKind = "180" | "finish" | "leg" | "match" | "ton";
export interface CelebrationData {
  kind: CelebrationKind;
  title: string;
  sub?: string;
  id: number;
}

const COLORS = ["#d63ce0", "#5fe3f0", "#ffffff", "#7b8b7e", "#ef3340"];

export function Celebration({ data, onDone }: { data: CelebrationData | null; onDone: () => void }) {
  useEffect(() => {
    if (!data) return;
    const ms = data.kind === "ton" ? 1100 : data.kind === "leg" ? 1800 : 2800;
    const t = setTimeout(onDone, ms);
    return () => clearTimeout(t);
  }, [data, onDone]);

  const confetti = useMemo(
    () =>
      Array.from({ length: 70 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        dur: 1.6 + Math.random() * 1.4,
        size: 6 + Math.random() * 10,
        color: COLORS[i % COLORS.length],
        rot: Math.random() * 360,
        drift: (Math.random() - 0.5) * 160,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data?.id],
  );

  if (!data) return null;
  const big = data.kind === "180" || data.kind === "finish" || data.kind === "match";

  if (data.kind === "ton") {
    return (
      <div className="pointer-events-none fixed inset-x-0 top-[18%] z-40 flex justify-center">
        <div className="celebrate-ton rounded-2xl bg-pink/90 px-8 py-3 font-display text-5xl font-bold tabular shadow-2xl">{data.title}</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden" onClick={onDone}>
      <div className={cx("absolute inset-0", big ? "celebrate-bg" : "bg-black/40")} />
      {big && confetti.map((c, i) => (
        <span key={i} className="confetti" style={{
          left: `${c.left}%`, width: c.size, height: c.size * 0.45, background: c.color,
          animationDelay: `${c.delay}s`, animationDuration: `${c.dur}s`,
          ["--rot" as string]: `${c.rot}deg`, ["--drift" as string]: `${c.drift}px`,
        }} />
      ))}
      {big && <div className="celebrate-rays" />}
      <div className="relative text-center">
        <div className={cx("celebrate-title font-display font-bold uppercase leading-none tabular",
          data.kind === "180" ? "text-[min(38vh,22rem)] text-white" : data.kind === "leg" ? "text-7xl text-white" : "text-[min(20vh,10rem)] text-white")}>
          {data.title}
        </div>
        {data.sub && <div className="celebrate-sub mt-2 font-display text-[min(6vh,3rem)] uppercase tracking-[0.2em] text-cyan">{data.sub}</div>}
      </div>
    </div>
  );
}
