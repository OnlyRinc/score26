"use client";
import { useEffect, useState } from "react";
import { isPossibleVisitTotal } from "@/lib/game";
import { cx } from "@/components/ui";

const QUICK = [26, 41, 45, 60, 81, 85, 100, 140, 180];

export function TotalPad({ onSubmit, remaining, canCheckout, onUndo }: {
  onSubmit: (total: number) => void; remaining: number; canCheckout: boolean; onUndo: () => void;
}) {
  const [input, setInput] = useState("");
  const value = input === "" ? null : parseInt(input, 10);
  const valid = value !== null && isPossibleVisitTotal(value);

  const submit = (v: number) => {
    if (!isPossibleVisitTotal(v)) return;
    setInput("");
    onSubmit(v);
  };

  // Tastatur (für Laptop)
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (/^[0-9]$/.test(e.key)) setInput((s) => (s.length < 3 ? s + e.key : s));
      else if (e.key === "Backspace") setInput((s) => s.slice(0, -1));
      else if (e.key === "Enter") {
        setInput((s) => {
          if (s === "") return s;
          const v = parseInt(s, 10);
          if (isPossibleVisitTotal(v)) { onSubmit(v); return ""; }
          return s;
        });
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onSubmit]);

  const key = "rounded-2xl bg-surface-2 border border-line font-display text-[min(5.2vh,8vw,2.6rem)] font-semibold active:bg-pink/40 active:scale-[0.97] transition";

  return (
    <div className="flex h-full gap-2 sm:gap-3">
      <div className="grid flex-[3] grid-cols-3 grid-rows-[auto_1fr_1fr_1fr_1fr] gap-2 sm:gap-3">
        <div className={cx("col-span-3 flex h-[min(9vh,4.5rem)] items-center justify-between rounded-2xl border px-5", value !== null && !valid ? "border-live bg-live/10" : "border-line bg-black/40")}>
          <span className="text-sm uppercase tracking-widest text-muted">Aufnahme</span>
          <span className={cx("font-display text-[min(6.5vh,3.2rem)] font-bold tabular", value !== null && !valid && "text-live")}>{input || "–"}</span>
        </div>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <button key={n} className={key} onClick={() => setInput((s) => (s.length < 3 ? s + n : s))}>{n}</button>
        ))}
        <button className={cx(key, "text-muted")} onClick={() => setInput((s) => s.slice(0, -1))}>⌫</button>
        <button className={key} onClick={() => setInput((s) => (s.length < 3 && s !== "" ? s + "0" : s))}>0</button>
        <button
          className={cx("rounded-2xl font-display text-[min(4.5vh,5vw,2.2rem)] font-bold uppercase transition active:scale-[0.97]", input === "" ? "bg-sage-dark text-white" : valid ? "bg-pink text-white" : "bg-surface-2 text-muted")}
          onClick={() => (input === "" ? submit(0) : valid && submit(value!))}
        >
          {input === "" ? "No Score" : "OK"}
        </button>
      </div>
      <div className="grid flex-[2] grid-cols-2 grid-rows-6 gap-2 sm:gap-3">
        {QUICK.map((q) => (
          <button key={q} onClick={() => submit(q)} className={cx("rounded-2xl border border-line font-display text-[min(4vh,6vw,2rem)] font-semibold active:scale-[0.97] transition", q >= 100 ? "bg-pink/15 active:bg-pink/40" : "bg-surface active:bg-line")}>
            {q}
          </button>
        ))}
        <button
          disabled={!canCheckout}
          onClick={() => submit(remaining)}
          className="rounded-2xl bg-cyan/20 font-display text-[min(3.6vh,4.2vw,1.8rem)] font-bold uppercase text-cyan active:scale-[0.97] disabled:opacity-25"
        >
          Check {canCheckout ? remaining : ""}
        </button>
        <button onClick={onUndo} className="col-span-2 rounded-2xl border border-live/40 bg-live/10 font-display text-[min(3.6vh,4.5vw,1.8rem)] font-semibold uppercase text-live active:bg-live/30">
          ↶ Rückgängig
        </button>
      </div>
    </div>
  );
}
