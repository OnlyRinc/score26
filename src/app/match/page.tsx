"use client";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  computeMatch, dartValue, evaluateVisit, isCheckoutPossible, matchStats, maxDartsAtDouble, minDartsToFinish, lastVisits,
  type Dart, type Visit,
} from "@/lib/game";
import { useHydrated, useStore } from "@/lib/store/store";
import { resultFromMatch } from "@/lib/store/tournamentHelpers";
import { numberToWords, say } from "@/lib/speech/caller";
import { Button, Loading, Modal, Segmented, cx } from "@/components/ui";
import { PlayerPanel } from "@/components/match/PlayerPanel";
import { TotalPad } from "@/components/match/TotalPad";
import { DartPad } from "@/components/match/DartPad";
import { StatsTable } from "@/components/match/StatsTable";
import { formatLabel } from "@/components/RulesEditor";
import { useLivePublisher } from "@/lib/live/publisher";
import { Celebration, type CelebrationData } from "@/components/match/Celebration";
import { sound180, soundHighFinish, soundLeg, soundMatch, soundTon } from "@/lib/sound/effects";

export default function MatchPage() {
  return <Suspense fallback={<Loading />}><MatchScreen /></Suspense>;
}

type Pending =
  | { kind: "checkout"; total: number; options: { darts: number; doubles: number }[] }
  | { kind: "doubles"; total: number; max: number };

function MatchScreen() {
  const hydrated = useHydrated();
  const router = useRouter();
  const id = useSearchParams().get("id") ?? "";
  const match = useStore((s) => s.matches[id]);
  const settings = useStore((s) => s.settings);
  const addVisit = useStore((s) => s.addVisit);
  const undoVisit = useStore((s) => s.undoVisit);
  const finishMatch = useStore((s) => s.finishMatch);
  const updateSettings = useStore((s) => s.updateSettings);
  const setFixtureResult = useStore((s) => s.setFixtureResult);
  const updateTournament = useStore((s) => s.updateTournament);
  const createMatch = useStore((s) => s.createMatch);

  const [partial, setPartial] = useState<Dart[]>([]);
  const [pending, setPending] = useState<Pending | null>(null);
  const [statsOpen, setStatsOpen] = useState(false);
  const [celebration, setCelebration] = useState<CelebrationData | null>(null);
  const [flash, setFlash] = useState<{ player: number; text: string; id: number; bust: boolean } | null>(null);
  const clearCelebration = useCallback(() => setCelebration(null), []);

  const state = useMemo(() => (match ? computeMatch(match.setup, match.visits) : null), [match]);
  const stats = useMemo(() => (state && match ? match.setup.players.map((_, i) => matchStats(state, i)) : []), [state, match]);

  useLivePublisher(match?.tournamentId, id);

  const commit = useCallback((v: Visit) => {
    if (!match || !state) return;
    const cur = state.current;
    const p = state.players[cur];
    const res = evaluateVisit(p.remaining, p.opened, match.setup.players[cur].rules, v);
    addVisit(match.id, v);
    setPartial([]);
    setPending(null);
    const name = match.setup.players[cur].nickname;
    const sounds = settings.sounds !== false;
    const id = Date.now();
    setFlash({ player: cur, text: res.bust ? "BUST" : `−${res.scored}`, id, bust: res.bust });
    if (res.checkout) {
      const after = computeMatch(match.setup, [...match.visits, v]);
      if (after.finished) {
        setCelebration({ kind: "match", title: name, sub: "Game shot and the match!", id });
        if (sounds) soundMatch();
      } else if (res.scored >= 100) {
        setCelebration({ kind: "finish", title: String(res.scored), sub: `High Finish · ${name}`, id });
        if (sounds) soundHighFinish();
      } else {
        setCelebration({ kind: "leg", title: "Game Shot", sub: `Leg für ${name} · ${res.scored}`, id });
        if (sounds) soundLeg();
      }
    } else if (!res.bust && res.scored === 180) {
      setCelebration({ kind: "180", title: "180", sub: name, id });
      if (sounds) sound180();
    } else if (!res.bust && res.scored >= 100) {
      setCelebration({ kind: "ton", title: String(res.scored), id });
      if (sounds) soundTon();
    }
    if (settings.speech) {
      if (res.checkout) say(`Game shot! ${numberToWords(res.scored)}`);
      else if (res.bust) say("No score");
      else say(numberToWords(res.scored));
    }
  }, [match, state, addVisit, settings.speech, settings.sounds]);

  const submitTotal = useCallback((total: number) => {
    if (!match || !state || state.finished) return;
    const cur = state.current;
    const p = state.players[cur];
    const rules = match.setup.players[cur].rules;
    const out = rules.outRule;
    const ask = settings.askDoubles && out !== "single";
    const isCheckout = total === p.remaining && evaluateVisit(p.remaining, p.opened, rules, { total, dartsThrown: 3, dartsAtDouble: 0 }).checkout;
    if (isCheckout) {
      const minD = minDartsToFinish(p.remaining, out) ?? 3;
      const options: { darts: number; doubles: number }[] = [];
      for (let d = minD; d <= 3; d++) {
        if (!ask) options.push({ darts: d, doubles: 0 });
        else for (let k = 1; k <= d - (minD - 1); k++) options.push({ darts: d, doubles: k });
      }
      if (options.length === 1) commit({ total, dartsThrown: options[0].darts, dartsAtDouble: ask ? options[0].doubles : 0 });
      else setPending({ kind: "checkout", total, options });
      return;
    }
    const maxDoubles = ask && p.opened ? maxDartsAtDouble(p.remaining, total, out) : 0;
    if (maxDoubles > 0) {
      setPending({ kind: "doubles", total, max: maxDoubles });
      return;
    }
    commit({ total, dartsThrown: 3, dartsAtDouble: 0 });
  }, [match, state, settings.askDoubles, commit]);

  const onDart = useCallback((d: Dart) => {
    if (!match || !state || state.finished) return;
    const cur = state.current;
    const p = state.players[cur];
    const rules = match.setup.players[cur].rules;
    const darts = [...partial, d];
    const res = evaluateVisit(p.remaining, p.opened, rules, { total: 0, darts, dartsThrown: darts.length, dartsAtDouble: 0 });
    if (res.bust || res.checkout || darts.length === 3) {
      // Darts aufs Doppel automatisch zählen
      let rem = p.remaining;
      let opened = p.opened;
      let atDouble = 0;
      for (const x of darts) {
        if (opened && rules.outRule !== "single" && isCheckoutPossible(rem, rules.outRule, 1)) atDouble++;
        const r = evaluateVisit(rem, opened, rules, { total: 0, darts: [x], dartsThrown: 1, dartsAtDouble: 0 });
        if (r.bust || r.checkout) break;
        rem -= r.scored;
        opened = r.opened;
      }
      commit({ total: darts.reduce((s, x) => s + dartValue(x), 0), darts, dartsThrown: darts.length, dartsAtDouble: atDouble });
    } else setPartial(darts);
  }, [match, state, partial, commit]);

  const undo = useCallback(() => {
    if (partial.length) setPartial(partial.slice(0, -1));
    else if (match) undoVisit(match.id);
  }, [partial, match, undoVisit]);

  if (!hydrated) return <Loading />;
  if (!match || !state) {
    return <div className="grid min-h-dvh place-items-center"><div className="text-center"><p className="mb-4">Match nicht gefunden.</p><Button href="/">Zur Startseite</Button></div></div>;
  }

  const n = match.setup.players.length;
  const cur = state.current;
  const curRules = match.setup.players[cur].rules;
  const curPlayer = state.players[cur];
  // Vorschau des Rests bei Dart-für-Dart-Eingabe
  const preview = partial.length
    ? evaluateVisit(curPlayer.remaining, curPlayer.opened, curRules, { total: 0, darts: partial, dartsThrown: partial.length, dartsAtDouble: 0 })
    : null;
  const shownState = preview && !preview.bust
    ? { ...state, players: state.players.map((p, i) => (i === cur ? { ...p, remaining: p.remaining - preview.scored, opened: preview.opened } : p)) }
    : state;
  const backHref = match.tournamentId ? `/tournament/?id=${match.tournamentId}` : "/";
  const base = match.setup.players[0].rules;

  const finishToTournament = () => {
    const r = resultFromMatch(match);
    if (!r || !match.tournamentId || !match.fixtureKey) return;
    setFixtureResult(match.tournamentId, match.fixtureKey.startsWith("g") ? "group" : "ko", match.fixtureKey, r);
    finishMatch(match.id);
    updateTournament(match.tournamentId, { activeMatchId: undefined });
    router.replace(backHref);
  };
  const rematch = () => {
    finishMatch(match.id);
    const nid = createMatch({ ...match.setup, firstPlayer: (match.setup.firstPlayer + 1) % n });
    router.replace(`/match/?id=${nid}`);
  };

  return (
    <div className="flex h-dvh flex-col gap-2 overflow-hidden p-2 sm:gap-3 sm:p-3">
      <div className="flex items-center gap-2">
        <button onClick={() => router.push(backHref)} className="grid h-10 w-10 place-items-center rounded-xl bg-surface-2 text-2xl" aria-label="Zurück">‹</button>
        <div className="min-w-0 flex-1 truncate font-display text-sm uppercase tracking-widest text-muted">
          {formatLabel(match.setup.format)} · {state.isSetPlay ? `Set ${state.set + 1} · ` : ""}Leg {state.leg + 1}
        </div>
        <Segmented value={settings.inputMode} onChange={(inputMode) => { setPartial([]); updateSettings({ inputMode }); }}
          options={[{ value: "total", label: "Summe" }, { value: "darts", label: "Dart für Dart" }]} className="shrink-0 !flex-nowrap" />
        <button onClick={() => updateSettings({ sounds: settings.sounds === false })} className={cx("h-10 rounded-xl px-3 text-lg", settings.sounds !== false ? "bg-pink/30" : "bg-surface-2 opacity-60")} aria-label="Soundeffekte">
          {settings.sounds !== false ? "🔊" : "🔇"}
        </button>
        <button onClick={() => updateSettings({ speech: !settings.speech })} className={cx("h-10 rounded-xl px-3 text-lg", settings.speech ? "bg-pink/30" : "bg-surface-2 opacity-60")} aria-label="Caller-Ansage">
          🗣
        </button>
        <button onClick={() => setStatsOpen(true)} className="h-10 rounded-xl bg-surface-2 px-3 text-sm font-semibold">📊<span className="hidden sm:inline"> Statistik</span></button>
      </div>

      <div className={cx("grid min-h-0 gap-2 sm:gap-3", n === 1 ? "grid-cols-1" : n === 2 ? "grid-cols-2" : n === 3 ? "grid-cols-3" : "grid-cols-2 grid-rows-2", "flex-[1_1_44%]")}>
        {match.setup.players.map((mp, i) => (
          <PlayerPanel
            key={i} mp={mp} index={i} state={shownState} stats={stats[i]} last={lastVisits(state, i, 3)}
            active={i === cur && !state.finished} dartsLeft={3 - partial.length}
            size={n <= 2 ? "xl" : n === 3 ? "lg" : "md"} baseStart={base.startScore} baseOut={base.outRule}
            flash={flash && flash.player === i ? flash : null}
          />
        ))}
      </div>

      <div className="min-h-0 flex-[1_1_56%]">
        {settings.inputMode === "total" ? (
          <TotalPad onSubmit={submitTotal} onUndo={undo} remaining={curPlayer.remaining}
            canCheckout={curPlayer.opened && curPlayer.remaining <= 180 && isCheckoutPossible(curPlayer.remaining, curRules.outRule, 3)} />
        ) : (
          <DartPad darts={partial} onDart={onDart} onUndo={undo} />
        )}
      </div>

      <Modal open={!!pending} onClose={() => setPending(null)}
        title={pending?.kind === "checkout" ? `Check ${pending.total}! Wie viele Darts?` : "Darts aufs Doppel?"}>
        {pending?.kind === "checkout" && (
          <div className="grid grid-cols-3 gap-3">
            {pending.options.map((o) => (
              <button key={`${o.darts}-${o.doubles}`} onClick={() => commit({ total: pending.total, dartsThrown: o.darts, dartsAtDouble: o.doubles })}
                className="rounded-2xl border border-line bg-surface-2 p-4 font-display active:bg-pink/40">
                <div className="text-4xl font-bold">{o.darts}</div>
                <div className="text-sm uppercase text-muted">{o.darts === 1 ? "Dart" : "Darts"}</div>
                {settings.askDoubles && o.doubles > 0 && <div className="mt-1 text-sm text-cyan">{o.doubles}× aufs Doppel</div>}
              </button>
            ))}
          </div>
        )}
        {pending?.kind === "doubles" && (
          <div className="grid grid-cols-4 gap-3">
            {Array.from({ length: pending.max + 1 }, (_, k) => k).map((k) => (
              <button key={k} onClick={() => commit({ total: pending.total, dartsThrown: 3, dartsAtDouble: k })}
                className={cx("rounded-2xl p-5 font-display text-5xl font-bold active:scale-95", k === 0 ? "bg-pink text-white" : "border border-line bg-surface-2")}>
                {k}
              </button>
            ))}
          </div>
        )}
        <Button variant="ghost" className="mt-4 w-full" onClick={() => setPending(null)}>Abbrechen</Button>
      </Modal>

      <Modal open={statsOpen} onClose={() => setStatsOpen(false)} title="Statistik" wide>
        <StatsTable players={match.setup.players} stats={stats} />
        <Button className="mt-4 w-full" onClick={() => setStatsOpen(false)}>Schließen</Button>
      </Modal>

      <Modal open={state.finished} title={null} wide>
        {state.winner !== null && (
          <div>
            <div className="text-center">
              <div className="font-display text-lg uppercase tracking-[0.3em] text-pink">Game Shot and the Match</div>
              <div className="my-2 font-display text-6xl font-bold uppercase">{match.setup.players[state.winner].nickname}</div>
              <div className="font-display text-4xl tabular text-muted">
                {state.isSetPlay ? state.players.map((p) => p.sets).join(" : ") + " Sets" : state.players.map((p) => p.legs).join(" : ")}
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button variant="danger" onClick={() => undoVisit(match.id)}>↶ Letzte Aufnahme zurück</Button>
              <div className="flex-1" />
              {match.tournamentId ? (
                <Button variant="primary" size="lg" onClick={finishToTournament}>Ergebnis übernehmen</Button>
              ) : (
                <>
                  <Button onClick={() => { finishMatch(match.id); router.replace("/"); }}>Startseite</Button>
                  <Button variant="primary" onClick={rematch}>Revanche</Button>
                </>
              )}
            </div>
            <div className="mt-5"><StatsTable players={match.setup.players} stats={stats} /></div>
          </div>
        )}
      </Modal>

      <Celebration data={celebration} onDone={clearCelebration} />
    </div>
  );
}
