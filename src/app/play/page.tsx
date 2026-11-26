"use client";
import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { suggestStartScores, type MatchFormat, type MatchPlayer, type MatchSetup, type PlayerRules } from "@/lib/game";
import { defaultRules, useHydrated, useStore } from "@/lib/store/store";
import { buildSetup, displayName, fullName, groupFixtures, koFixtures } from "@/lib/store/tournamentHelpers";
import { playerAverages } from "@/lib/store/history";
import { Button, Card, Loading, Modal, Page, PageHeader, Segmented, Stepper, cx, inputCls } from "@/components/ui";
import { FormatEditor, RulesEditor, rulesLabel } from "@/components/RulesEditor";
import { PlayerDialog } from "@/components/PlayerDialog";

export default function PlayPage() {
  return <Suspense fallback={<Loading />}><PlaySetup /></Suspense>;
}

function PlaySetup() {
  const hydrated = useHydrated();
  const params = useSearchParams();
  const tid = params.get("t");
  const fkey = params.get("f");
  const players = useStore((s) => s.players);
  const tournaments = useStore((s) => s.tournaments);
  if (!hydrated) return <Loading />;
  const t = tid ? tournaments[tid] : undefined;
  if (t && fkey) {
    const fixture = [...groupFixtures(t), ...koFixtures(t)].find((f) => f.key === fkey);
    if (!fixture || !fixture.a || !fixture.b) return <Page><PageHeader title="Match" back /><p>Begegnung nicht gefunden.</p></Page>;
    const setup = buildSetup(t, fixture, players);
    return <SetupForm initial={setup} tournamentId={t.id} fixtureKey={fkey} title={`${t.name} · ${fixture.label}`} lockPlayers />;
  }
  return <SetupForm initial={null} title="Neues Spiel" />;
}

function emptyPlayer(rules: PlayerRules): MatchPlayer {
  return { name: "", nickname: "", rules: { ...rules }, headStart: { legs: 0, sets: 0 } };
}

function SetupForm({ initial, tournamentId, fixtureKey, title, lockPlayers }: {
  initial: MatchSetup | null; tournamentId?: string; fixtureKey?: string; title: string; lockPlayers?: boolean;
}) {
  const router = useRouter();
  const players = useStore((s) => s.players);
  const matches = useStore((s) => s.matches);
  const settings = useStore((s) => s.settings);
  const createMatch = useStore((s) => s.createMatch);
  const updateTournament = useStore((s) => s.updateTournament);

  const [baseRules, setBaseRules] = useState<PlayerRules>(initial?.players[0].rules ?? { ...defaultRules });
  const [format, setFormat] = useState<MatchFormat>(initial?.format ?? { sets: 1, legs: 3 });
  const [mps, setMps] = useState<MatchPlayer[]>(initial?.players ?? [emptyPlayer(defaultRules), emptyPlayer(defaultRules)]);
  const [first, setFirst] = useState<number | null>(null);
  const [picking, setPicking] = useState<number | null>(null);
  const [handicapOpen, setHandicapOpen] = useState<boolean>(() => !!initial?.players.some((p) => p.headStart.legs || p.headStart.sets || p.rules.startScore !== initial.players[0].rules.startScore || p.rules.outRule !== initial.players[0].rules.outRule || p.rules.inRule !== initial.players[0].rules.inRule));
  const avgs = useMemo(() => playerAverages(matches), [matches]);

  const applyBase = (r: PlayerRules) => {
    setBaseRules(r);
    if (!handicapOpen) setMps((list) => list.map((p) => ({ ...p, rules: { ...r } })));
  };
  const setPlayer = (i: number, patch: Partial<MatchPlayer>) => setMps((list) => list.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  const ready = mps.length >= 1 && mps.every((p) => p.nickname.trim());

  const start = () => {
    if (!ready || first === null) return;
    const finalPlayers = mps.map((p) => (handicapOpen ? p : { ...p, rules: { ...baseRules }, headStart: { legs: 0, sets: 0 } }));
    const setup: MatchSetup = { players: finalPlayers, format, firstPlayer: first };
    const id = createMatch(setup, { tournamentId, fixtureKey });
    if (tournamentId) updateTournament(tournamentId, { activeMatchId: id });
    router.replace(`/match/?id=${id}`);
  };

  const suggestion = (() => {
    if (mps.length !== 2) return null;
    const a = mps[0].playerId && avgs[mps[0].playerId];
    const b = mps[1].playerId && avgs[mps[1].playerId];
    if (!a || !b) return null;
    return { scores: suggestStartScores(a.average, b.average, baseRules.startScore, settings.handicapPointsPer10), a: a.average, b: b.average };
  })();

  return (
    <Page>
      <PageHeader title={title} back />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-display text-xl uppercase tracking-wide">Spieler</h2>
          <div className="space-y-3">
            {mps.map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <button
                  disabled={lockPlayers}
                  onClick={() => setPicking(i)}
                  className={cx("flex-1 rounded-xl border border-line bg-surface-2 px-4 py-3 text-left", !p.nickname && "text-muted")}
                >
                  <span className="font-display text-2xl uppercase">{p.nickname || `Spieler ${i + 1} wählen`}</span>
                  {p.name && p.name !== p.nickname && <span className="ml-2 text-sm text-muted">{p.name}</span>}
                </button>
                {!lockPlayers && mps.length > 1 && (
                  <button className="h-12 w-12 rounded-xl bg-surface-2 text-xl text-muted" onClick={() => setMps(mps.filter((_, j) => j !== i))}>×</button>
                )}
              </div>
            ))}
            {!lockPlayers && mps.length < 4 && (
              <Button variant="ghost" onClick={() => setMps([...mps, emptyPlayer(baseRules)])}>+ weiterer Spieler</Button>
            )}
          </div>
        </Card>

        <Card>
          <h2 className="mb-3 font-display text-xl uppercase tracking-wide">Format</h2>
          <FormatEditor value={format} onChange={setFormat} />
          <div className="my-4 border-t border-line" />
          <RulesEditor value={baseRules} onChange={applyBase} />
        </Card>

        <Card className="lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-xl uppercase tracking-wide">Handicap</h2>
            <Segmented value={handicapOpen ? "on" : "off"} options={[{ value: "off", label: "Aus" }, { value: "on", label: "Pro Spieler einstellen" }]}
              onChange={(v) => { setHandicapOpen(v === "on"); if (v === "on") setMps((l) => l.map((p) => ({ ...p, rules: p.rules ?? { ...baseRules } }))); }} />
          </div>
          {handicapOpen && (
            <div className="mt-4 space-y-4">
              {suggestion && (
                <div className="flex flex-wrap items-center gap-3 rounded-xl border border-cyan/30 bg-cyan/5 p-3 text-sm">
                  <span>Vorschlag nach Average ({suggestion.a.toFixed(1)} vs {suggestion.b.toFixed(1)}): <b className="tabular">{suggestion.scores[0]}</b> / <b className="tabular">{suggestion.scores[1]}</b> Punkte</span>
                  <Button size="sm" variant="secondary" onClick={() => setMps((l) => l.map((p, i) => ({ ...p, rules: { ...p.rules, startScore: suggestion.scores[i] } })))}>Übernehmen</Button>
                </div>
              )}
              <div className="grid gap-4 md:grid-cols-2">
                {mps.map((p, i) => (
                  <div key={i} className="rounded-xl border border-line bg-surface-2/50 p-4">
                    <div className="mb-3 font-display text-2xl uppercase">{p.nickname || `Spieler ${i + 1}`}</div>
                    <RulesEditor compact value={p.rules} onChange={(rules) => setPlayer(i, { rules })} />
                    <div className="mt-3 flex flex-wrap items-center gap-4">
                      <span className="w-40 text-sm font-medium text-muted">Vorsprung</span>
                      <Stepper value={p.headStart.legs} max={20} label="Legs" onChange={(legs) => setPlayer(i, { headStart: { ...p.headStart, legs } })} />
                      {format.sets > 1 && <Stepper value={p.headStart.sets} max={10} label="Sets" onChange={(sets) => setPlayer(i, { headStart: { ...p.headStart, sets } })} />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {!handicapOpen && <p className="mt-2 text-sm text-muted">Alle spielen {rulesLabel(baseRules)}.</p>}
        </Card>

        <Card className="lg:col-span-2">
          <h2 className="mb-1 font-display text-xl uppercase tracking-wide">Wer wirft zuerst?</h2>
          <p className="mb-3 text-sm text-muted">Ausbullen und hier den Gewinner antippen, oder zufällig losen.</p>
          <div className="flex flex-wrap gap-3">
            {mps.map((p, i) => (
              <button key={i} onClick={() => setFirst(i)}
                className={cx("min-w-40 rounded-2xl border px-6 py-4 font-display text-2xl uppercase", first === i ? "border-pink bg-pink/20 glow-pink" : "border-line bg-surface-2")}>
                {p.nickname || `Spieler ${i + 1}`}
              </button>
            ))}
            <Button variant="ghost" size="lg" onClick={() => setFirst(Math.floor(Math.random() * mps.length))}>🎲 Zufall</Button>
          </div>
        </Card>
      </div>

      <div className="sticky bottom-0 -mx-4 mt-6 border-t border-line bg-bg/90 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6">
        <Button variant="primary" size="lg" className="w-full" disabled={!ready || first === null} onClick={start}>
          {!ready ? "Spieler wählen" : first === null ? "Wer beginnt?" : "Game on!"}
        </Button>
      </div>

      <PlayerPicker
        open={picking !== null}
        onClose={() => setPicking(null)}
        exclude={mps.map((p) => p.playerId).filter(Boolean) as string[]}
        onPick={(id, guest) => {
          if (picking === null) return;
          if (id) {
            const pl = players[id];
            setPlayer(picking, { playerId: id, nickname: displayName(pl), name: fullName(pl) || displayName(pl) });
          } else if (guest) setPlayer(picking, { playerId: undefined, nickname: guest, name: guest });
          setPicking(null);
        }}
      />
    </Page>
  );
}

function PlayerPicker({ open, onClose, onPick, exclude }: { open: boolean; onClose: () => void; onPick: (id?: string, guest?: string) => void; exclude: string[] }) {
  const players = useStore((s) => s.players);
  const [guest, setGuest] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const list = Object.values(players).filter((p) => !exclude.includes(p.id)).sort((a, b) => displayName(a).localeCompare(displayName(b)));
  return (
    <>
      <Modal open={open && !newOpen} onClose={onClose} title="Spieler wählen" wide>
        <div className="grid max-h-[50dvh] gap-2 overflow-auto sm:grid-cols-2">
          {list.map((p) => (
            <button key={p.id} onClick={() => onPick(p.id)} className="rounded-xl border border-line bg-surface-2 px-4 py-3 text-left active:bg-line">
              <div className="font-display text-xl uppercase">{displayName(p)}</div>
              <div className="text-sm text-muted">{fullName(p)}</div>
            </button>
          ))}
          <button onClick={() => setNewOpen(true)} className="rounded-xl border border-dashed border-pink/60 px-4 py-3 text-left text-pink">+ Neuen Spieler anlegen</button>
        </div>
        <form className="mt-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (guest.trim()) { onPick(undefined, guest.trim()); setGuest(""); } }}>
          <input className={inputCls} placeholder="oder Gast-Name (wird nicht gespeichert)" value={guest} onChange={(e) => setGuest(e.target.value)} />
          <Button type="submit" variant="secondary">OK</Button>
        </form>
      </Modal>
      <PlayerDialog value={newOpen ? {} : null} onClose={() => setNewOpen(false)} onCreated={(id) => { setNewOpen(false); onPick(id); }} />
    </>
  );
}
