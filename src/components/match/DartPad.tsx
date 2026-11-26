"use client";
import { useState } from "react";
import { dartLabel, type Dart } from "@/lib/game";
import { cx } from "@/components/ui";

export function DartPad({ darts, onDart, onUndo }: { darts: Dart[]; onDart: (d: Dart) => void; onUndo: () => void }) {
  const [mult, setMult] = useState<1 | 2 | 3>(1);
  const throwDart = (segment: number) => {
    const m = segment === 25 ? (Math.min(mult, 2) as 1 | 2) : segment === 0 ? 1 : mult;
    onDart({ segment, multiplier: m });
    setMult(1);
  };
  const key = "rounded-xl bg-surface-2 border border-line font-display text-[min(4.4vh,2.2rem)] font-semibold active:scale-[0.96] transition";
  const multBtn = (m: 1 | 2 | 3, label: string, color: string) => (
    <button onClick={() => setMult(mult === m ? 1 : m)} className={cx("rounded-xl font-display text-[min(4vh,2rem)] font-bold uppercase transition", mult === m ? color : "bg-surface-2 border border-line text-white/70")}>
      {label}
    </button>
  );
  return (
    <div className="flex h-full flex-col gap-2">
      <div className="grid grid-cols-[1fr_1fr_1fr_1.3fr] gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className={cx("flex h-[min(8vh,4rem)] items-center justify-center rounded-xl border font-display text-[min(5vh,2.4rem)] font-bold tabular", darts[i] ? "border-pink/60 bg-pink/10" : "border-line bg-black/40 text-muted")}>
            {darts[i] ? dartLabel(darts[i]) : `${i + 1}.`}
          </div>
        ))}
        <button onClick={onUndo} className="rounded-xl border border-live/40 bg-live/10 font-display text-xl font-semibold uppercase text-live active:bg-live/30">↶ Zurück</button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {multBtn(1, "Single", "bg-white text-black")}
        {multBtn(2, "Double", "bg-pink text-white")}
        {multBtn(3, "Triple", "bg-cyan text-black")}
      </div>
      <div className="grid flex-1 grid-cols-7 grid-rows-3 gap-2">
        {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
          <button key={n} className={cx(key, mult === 2 && "border-pink/50", mult === 3 && "border-cyan/50")} onClick={() => throwDart(n)}>
            {mult === 3 ? "T" : mult === 2 ? "D" : ""}{n}
          </button>
        ))}
        <button className={cx(key, "text-lg")} onClick={() => throwDart(25)}>{mult >= 2 ? "Bull" : "25"}</button>
      </div>
      <button className="h-[min(8vh,4rem)] rounded-xl bg-sage-dark font-display text-2xl font-bold uppercase active:bg-sage" onClick={() => throwDart(0)}>Daneben (0)</button>
    </div>
  );
}
