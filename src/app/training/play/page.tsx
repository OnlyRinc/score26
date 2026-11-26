"use client";
import { Suspense, useCallback, useEffect, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useHydrated, useStore } from "@/lib/store/store";
import type { TrainingSession } from "@/lib/store/types";
import { dartLabel, isCheckoutPossible, minDartsToFinish, suggestCheckout } from "@/lib/game";
import {
  GAME_INFO, RING_LABEL, computeAtc, computeBobs27, computeC121, computeCheckout, computeD99, computeScoring,
  randomCheckoutTargets, settingsLabel, summarize, type TrainingEvent,
} from "@/lib/training/training";
import { personalBest } from "@/lib/training/history";
import { TotalPad } from "@/components/match/TotalPad";
import { Button, Card, Loading, Modal, Page, PageHeader, cx } from "@/components/ui";
import { sound180, soundHighFinish, soundLeg, soundTon } from "@/lib/sound/effects";

export default function TrainingPlayPage() {
  return <Suspense fallback={<Loading />}><TrainingPlay /></Suspense>;
}

function TrainingPlay() {
  const hydrated = useHydrated();
  const id = useSearchParams().get("id") ?? "";
  const t = useStore((s) => s.trainings[id]);
  const add = useStore((s) => s.addTrainingEvent);
  const undo = useStore((s) => s.undoTrainingEvent);
  const finish = useStore((s) => s.finishTraining);
  const soundsOn = useStore((s) => s.settings.sounds !== false);
  const summary = t ? summarize(t.settings, t.events) : null;

  useEffect(() => {
    if (t && summary?.finished && !t.finishedAt) finish(t.id);
  }, [t, summary?.finished, finish]);

  const push = useCallback((e: TrainingEvent, sound?: () => void) => {
    add(id, e);
    if (sound && soundsOn) sound();
  }, [add, id, soundsOn]);
  const onUndo = useCallback(() => undo(id), [undo, id]);

  if (!hydrated) return <Loading />;
  if (!t || !summary) {
    return <Page><PageHeader title="Training" back="/training/" /><Card>Dieses Training gibt es nicht mehr.</Card></Page>;
  }
  if (summary.finished) return <Result t={t} onUndo={onUndo} />;

  return (
    <div className="flex h-dvh flex-col overflow-hidden px-3 pb-3 sm:px-5">
      <div className="-mx-3 sm:-mx-5"><div className="px-4 sm:px-6">
        <PageHeader title={<>{GAME_INFO[t.settings.game].name} <span className="text-pink">· {t.playerName}</span></>} back="/training/" />
      </div></div>
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <GameView t={t} push={push} onUndo={onUndo} />
      </div>
    </div>
  );
}

type Push = (e: TrainingEvent, sound?: () => void) => void;

function GameView({ t, push, onUndo }: { t: TrainingSession; push: Push; onUndo: () => void }) {
  const st = t.settings;
  switch (st.game) {
    case "c121": return <C121View s={st.s} events={t.events} push={push} onUndo={onUndo} />;
    case "scoring": return <ScoringView s={st.s} events={t.events} push={push} onUndo={onUndo} />;
    case "d99": return <D99View s={st.s} events={t.events} push={push} onUndo={onUndo} />;
    case "atc": return <AtcView s={st.s} events={t.events} push={push} onUndo={onUndo} />;
    case "bobs27": return <BobsView s={st.s} events={t.events} push={push} onUndo={onUndo} />;
    case "checkout": return <CheckoutView s={st.s} events={t.events} push={push} onUndo={onUndo} />;
  }
}

// ---------- Bausteine ----------
function Board({ children }: { children: ReactNode }) {
  return <div className="rounded-3xl border border-line bg-surface/90 p-4 sm:p-6">{children}</div>;
}
function Big({ label, value, accent }: { label: string; value: ReactNode; accent?: string }) {
  return (
    <div className="min-w-0 text-center">
      <div className="text-xs uppercase tracking-widest text-muted sm:text-sm">{label}</div>
      <div className={cx("font-display text-[min(7vh,9vw,4.5rem)] font-bold leading-none tabular", accent)}>{value}</div>
    </div>
  );
}
function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-xl bg-surface-2 px-3 py-2 text-center">
      <div className="text-[11px] uppercase tracking-widest text-muted">{label}</div>
      <div className="font-display text-xl font-semibold tabular">{value}</div>
    </div>
  );
}
function Suggest({ remaining, darts }: { remaining: number; darts: number }) {
  const s = suggestCheckout(remaining, "double", Math.min(3, darts));
  if (!s) return null;
  return <div className="mt-2 text-center font-display text-2xl tracking-wide text-cyan">{s.map(dartLabel).join(" · ")}</div>;
}
function BigButton({ children, onClick, className, disabled }: { children: ReactNode; onClick: () => void; className?: string; disabled?: boolean }) {
  return (
    <button disabled={disabled} onClick={onClick}
      className={cx("rounded-2xl border border-line font-display text-[min(5vh,7vw,2.6rem)] font-bold uppercase transition active:scale-[0.97] disabled:opacity-30", className)}>
      {children}
    </button>
  );
}
function UndoButton({ onUndo, disabled }: { onUndo: () => void; disabled: boolean }) {
  return (
    <button disabled={disabled} onClick={onUndo}
      className="rounded-2xl border border-live/40 bg-live/10 py-4 font-display text-2xl font-semibold uppercase text-live active:bg-live/30 disabled:opacity-30">
      ↶ Rückgängig
    </button>
  );
}
const targetName = (seg: number, prefix = "") => (seg === 25 ? (prefix === "D" ? "Bull" : "Bull") : `${prefix}${seg}`);
const visitSound = (v: number) => (v === 180 ? sound180 : v >= 100 ? soundTon : undefined);

// ---------- 121 ----------
function C121View({ s, events, push, onUndo }: { s: Parameters<typeof computeC121>[0]; events: TrainingEvent[]; push: Push; onUndo: () => void }) {
  const st = computeC121(s, events);
  const [ask, setAsk] = useState(false);
  const can = isCheckoutPossible(st.remaining, "double", 3);
  const left = s.dartsPerTarget - st.dartsUsed;
  const onSubmit = (v: number) => {
    if (v === st.remaining && can) {
      if ((minDartsToFinish(st.remaining, "double") ?? 3) >= 3) push({ v, d: 3 }, soundLeg);
      else setAsk(true);
    } else push({ v }, visitSound(v));
  };
  const minD = minDartsToFinish(st.remaining, "double") ?? 3;
  return (
    <>
      <Board>
        <div className="grid grid-cols-3 items-end gap-2">
          <Big label="Ziel" value={st.target} accent="text-pink" />
          <Big label="Rest" value={st.remaining} />
          <Big label="Darts übrig" value={left} accent="text-cyan" />
        </div>
        <Suggest remaining={st.remaining} darts={left} />
        <div className="mt-3 flex flex-wrap justify-center gap-2 text-sm text-muted">
          <span>Ziel {Math.min(st.round + 1, s.rounds)} von {s.rounds}</span>·
          <span>{st.done.filter((d) => d.success).length} gecheckt</span>
          {st.best > 0 && <>·<span>Höchstes: {st.best}</span></>}
        </div>
      </Board>
      <div className="min-h-0 flex-1"><TotalPad onSubmit={onSubmit} remaining={st.remaining} canCheckout={can} onUndo={onUndo} /></div>
      <Modal open={ask} onClose={() => setAsk(false)} title="Mit wie vielen Darts gecheckt?">
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((d) => (
            <BigButton key={d} disabled={d < minD} className="bg-surface-2 py-6 active:bg-pink/40"
              onClick={() => { setAsk(false); push({ v: st.remaining, d }, st.remaining >= 100 ? soundHighFinish : soundLeg); }}>{d}</BigButton>
          ))}
        </div>
      </Modal>
    </>
  );
}

// ---------- Scoring ----------
function ScoringView({ s, events, push, onUndo }: { s: Parameters<typeof computeScoring>[0]; events: TrainingEvent[]; push: Push; onUndo: () => void }) {
  const st = computeScoring(s, events);
  const last = events.slice(-6).reverse();
  return (
    <>
      <Board>
        <div className="grid grid-cols-3 items-end gap-2">
          <Big label="Average" value={st.average.toFixed(1)} accent="text-pink" />
          <Big label="Aufnahme" value={`${Math.min(st.visits + 1, s.visits)}/${s.visits}`} />
          <Big label="Höchste" value={st.highest} accent="text-cyan" />
        </div>
        <div className="mt-3 flex justify-center gap-2 text-lg tabular text-muted">
          {last.length ? last.map((e, i) => <span key={i} className={cx("rounded-lg bg-surface-2 px-2", i === 0 && "text-white")}>{e.v}</span>) : <span className="text-sm">Noch keine Aufnahme</span>}
        </div>
      </Board>
      <div className="min-h-0 flex-1"><TotalPad onSubmit={(v) => push({ v }, visitSound(v))} remaining={0} canCheckout={false} onUndo={onUndo} /></div>
    </>
  );
}

// ---------- 99 Darts ----------
function D99View({ s, events, push, onUndo }: { s: Parameters<typeof computeD99>[0]; events: TrainingEvent[]; push: Push; onUndo: () => void }) {
  const st = computeD99(s, events);
  const bull = s.segment === 25;
  const rate = st.thrown ? Math.round((st.hits / st.thrown) * 100) : 0;
  const visitDart = (st.thrown % 3) + 1;
  const buttons: { v: number; label: string; cls: string }[] = bull
    ? [{ v: 0, label: "Daneben", cls: "bg-surface-2" }, { v: 1, label: "25", cls: "bg-sage-dark/60" }, { v: 2, label: "Bull", cls: "bg-pink/30" }]
    : [{ v: 0, label: "Daneben", cls: "bg-surface-2" }, { v: 1, label: `S${s.segment}`, cls: "bg-sage-dark/60" }, { v: 2, label: `D${s.segment}`, cls: "bg-cyan/20" }, { v: 3, label: `T${s.segment}`, cls: "bg-pink/30" }];
  return (
    <>
      <Board>
        <div className="grid grid-cols-3 items-end gap-2">
          <Big label={`Treffer (${RING_LABEL[s.ring]})`} value={st.hits} accent="text-pink" />
          <Big label="Dart" value={`${Math.min(st.thrown + 1, s.darts)}/${s.darts}`} />
          <Big label="Quote" value={`${rate}%`} accent="text-cyan" />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
          <Stat label="Punkte" value={st.points} />
          <Stat label="Single" value={st.singles} />
          <Stat label="Doppel" value={st.doubles} />
          {!bull && <Stat label="Triple" value={st.triples} />}
        </div>
        <div className="mt-3 flex justify-center gap-2">
          {[1, 2, 3].map((d) => <span key={d} className={cx("h-3 w-10 rounded-full", d < visitDart ? "bg-pink" : d === visitDart ? "bg-pink/40" : "bg-surface-2")} />)}
        </div>
      </Board>
      <div className={cx("grid min-h-0 flex-1 gap-3", bull ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-4")}>
        {buttons.map((b) => <BigButton key={b.v} className={b.cls} onClick={() => push({ v: b.v })}>{b.label}</BigButton>)}
      </div>
      <UndoButton onUndo={onUndo} disabled={!events.length} />
    </>
  );
}

// ---------- Around the Clock ----------
function AtcView({ s, events, push, onUndo }: { s: Parameters<typeof computeAtc>[0]; events: TrainingEvent[]; push: Push; onUndo: () => void }) {
  const st = computeAtc(s, events);
  const seg = st.sequence[st.index];
  const prefix = s.ring === "double" ? "D" : s.ring === "triple" ? "T" : "";
  const label = seg === 25 ? "Bull" : `${prefix}${seg}`;
  return (
    <>
      <Board>
        <div className="text-center text-sm uppercase tracking-widest text-muted">Aktuelles Ziel ({RING_LABEL[s.ring]})</div>
        <div className="text-center font-display text-[min(18vh,30vw,11rem)] font-bold leading-none text-pink">{label}</div>
        <div className="mt-3 flex flex-wrap justify-center gap-1">
          {st.sequence.map((n, i) => (
            <span key={n} className={cx("grid h-8 min-w-8 place-items-center rounded-lg px-1 text-sm font-semibold tabular", i < st.index ? "bg-sage-dark text-white" : i === st.index ? "bg-pink text-white" : "bg-surface-2 text-muted")}>
              {n === 25 ? "B" : n}
            </span>
          ))}
        </div>
        <div className="mt-3 text-center text-muted">{st.thrown} Darts geworfen</div>
      </Board>
      <div className="grid min-h-0 flex-1 grid-cols-2 gap-3">
        <BigButton className="bg-surface-2" onClick={() => push({ v: 0 })}>Daneben</BigButton>
        <BigButton className="bg-pink/30" onClick={() => push({ v: 1 })}>Treffer</BigButton>
      </div>
      <UndoButton onUndo={onUndo} disabled={!events.length} />
    </>
  );
}

// ---------- Bob's 27 ----------
function BobsView({ s, events, push, onUndo }: { s: Parameters<typeof computeBobs27>[0]; events: TrainingEvent[]; push: Push; onUndo: () => void }) {
  const st = computeBobs27(s, events);
  const seg = st.sequence[st.index];
  const value = seg * 2;
  return (
    <>
      <Board>
        <div className="grid grid-cols-2 items-end gap-2">
          <Big label="Ziel" value={targetName(seg, "D")} accent="text-pink" />
          <Big label="Punkte" value={st.score} accent={st.score <= 0 ? "text-live" : "text-cyan"} />
        </div>
        <div className="mt-3 text-center text-muted">Pro Treffer +{value}, kein Treffer −{value} · {st.index + 1} von {st.sequence.length}</div>
      </Board>
      <div className="text-center text-sm uppercase tracking-widest text-muted">Treffer mit 3 Darts</div>
      <div className="grid min-h-0 flex-1 grid-cols-2 gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((h) => (
          <BigButton key={h} className={h === 0 ? "bg-surface-2" : "bg-pink/25"} onClick={() => push({ v: h }, h === 3 ? soundTon : undefined)}>
            {h === 0 ? "Keiner" : `${h}×`}
          </BigButton>
        ))}
      </div>
      <UndoButton onUndo={onUndo} disabled={!events.length} />
    </>
  );
}

// ---------- Checkout-Training ----------
function CheckoutView({ s, events, push, onUndo }: { s: Parameters<typeof computeCheckout>[0]; events: TrainingEvent[]; push: Push; onUndo: () => void }) {
  const st = computeCheckout(s, events);
  const target = st.target ?? 0;
  const minD = minDartsToFinish(target, "double") ?? 3;
  const options = Array.from({ length: s.darts }, (_, i) => i + 1).filter((d) => d >= minD);
  return (
    <>
      <Board>
        <div className="grid grid-cols-3 items-end gap-2">
          <Big label="Finish" value={target} accent="text-pink" />
          <Big label="Runde" value={`${st.round + 1}/${s.rounds}`} />
          <Big label="Gecheckt" value={st.success} accent="text-cyan" />
        </div>
        <Suggest remaining={target} darts={3} />
        <div className="mt-2 text-center text-sm text-muted">Du hast {s.darts} Darts. Mit wie vielen hast du gecheckt?</div>
      </Board>
      <div className={cx("grid min-h-0 flex-1 gap-3", options.length > 4 ? "grid-cols-3 sm:grid-cols-5" : "grid-cols-2 sm:grid-cols-4")}>
        {options.map((d) => (
          <BigButton key={d} className="bg-pink/25" onClick={() => push({ v: d }, target >= 100 ? soundHighFinish : soundLeg)}>
            {d} {d === 1 ? "Dart" : "Darts"}
          </BigButton>
        ))}
        <BigButton className="bg-surface-2 text-muted" onClick={() => push({ v: 0 })}>Nicht geschafft</BigButton>
      </div>
      <UndoButton onUndo={onUndo} disabled={!events.length} />
    </>
  );
}

// ---------- Ergebnis ----------
function Result({ t, onUndo }: { t: TrainingSession; onUndo: () => void }) {
  const router = useRouter();
  const trainings = useStore((s) => s.trainings);
  const createTraining = useStore((s) => s.createTraining);
  const summary = summarize(t.settings, t.events);
  const best = personalBest(trainings, t);
  const better = !best || (summary.higherIsBetter ? summary.score > best.score : summary.score < best.score);
  const hasHistory = !!best;
  const again = () => {
    let s = t.settings;
    if (s.game === "checkout") s = { game: "checkout", s: { ...s.s, targets: randomCheckoutTargets(s.s.min, s.s.max, s.s.rounds) } };
    const id = createTraining(s, t.playerId, t.playerName);
    router.replace(`/training/play/?id=${id}`);
  };
  return (
    <Page>
      <PageHeader title={<>{GAME_INFO[t.settings.game].name} <span className="text-pink">· {t.playerName}</span></>} back="/training/" />
      <div className="animate-pop mx-auto max-w-xl text-center">
        <div className="text-sm uppercase tracking-widest text-muted">{settingsLabel(t.settings)}</div>
        <div className="my-4 font-display text-6xl font-bold text-pink sm:text-7xl">{summary.scoreLabel}</div>
        {better && hasHistory && <div className="mb-2 inline-block rounded-full bg-cyan/20 px-4 py-1 font-display text-xl uppercase text-cyan">Neuer Bestwert!</div>}
        {!better && best && <div className="mb-2 text-muted">Dein Bestwert: <span className="text-white">{best.label}</span></div>}
        {!hasHistory && <div className="mb-2 text-muted">Erstes Training mit diesen Einstellungen</div>}
        <Card className="mt-4 text-left">
          <dl className="divide-y divide-line">
            {summary.details.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 py-2.5"><dt className="text-muted">{k}</dt><dd className="font-semibold tabular">{v}</dd></div>
            ))}
          </dl>
        </Card>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Button variant="primary" size="lg" onClick={again}>Nochmal</Button>
          <Button size="lg" href="/training/">Andere Übung</Button>
          <Button variant="danger" size="lg" onClick={onUndo}>↶ Letzte Eingabe</Button>
        </div>
      </div>
    </Page>
  );
}
