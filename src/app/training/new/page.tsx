"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useHydrated, useStore } from "@/lib/store/store";
import { displayName } from "@/lib/store/tournamentHelpers";
import {
  GAME_INFO, RING_LABEL, defaultSettings, randomCheckoutTargets, type Ring, type TrainingGame, type TrainingSettings,
} from "@/lib/training/training";
import { Button, Card, Loading, Page, PageHeader, Segmented, Stepper, cx, inputCls } from "@/components/ui";

export default function NewTrainingPage() {
  return <Suspense fallback={<Loading />}><NewTraining /></Suspense>;
}

function NewTraining() {
  const hydrated = useHydrated();
  const router = useRouter();
  const game = (useSearchParams().get("game") ?? "c121") as TrainingGame;
  const players = useStore((s) => s.players);
  const lastName = useStore((s) => Object.values(s.trainings).sort((a, b) => b.createdAt - a.createdAt)[0]);
  const createTraining = useStore((s) => s.createTraining);
  const [settings, setSettings] = useState<TrainingSettings>(() => defaultSettings(game));
  const [playerId, setPlayerId] = useState<string | undefined>(lastName?.playerId);
  const [guest, setGuest] = useState(lastName && !lastName.playerId ? lastName.playerName : "");
  if (!hydrated) return <Loading />;
  if (!GAME_INFO[game]) return <Page><PageHeader title="Training" back="/training/" /></Page>;

  const list = Object.values(players).sort((a, b) => displayName(a).localeCompare(displayName(b)));
  const name = playerId ? displayName(players[playerId]) : guest.trim();
  const start = () => {
    if (!name) return;
    let s = settings;
    if (s.game === "checkout") s = { game: "checkout", s: { ...s.s, targets: randomCheckoutTargets(s.s.min, s.s.max, s.s.rounds) } };
    const id = createTraining(s, playerId, name);
    router.replace(`/training/play/?id=${id}`);
  };

  return (
    <Page>
      <PageHeader title={GAME_INFO[game].name} back="/training/" />
      <p className="mb-4 text-muted">{GAME_INFO[game].desc}</p>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-display text-xl uppercase tracking-wide">Wer trainiert?</h2>
          <div className="flex flex-wrap gap-2">
            {list.map((p) => (
              <button key={p.id} onClick={() => { setPlayerId(p.id); setGuest(""); }}
                className={cx("rounded-xl border px-4 py-2.5 font-display text-lg uppercase", playerId === p.id ? "border-pink bg-pink/20" : "border-line bg-surface-2")}>
                {displayName(p)}
              </button>
            ))}
          </div>
          <input className={inputCls + " mt-3"} placeholder="oder Name eingeben" value={guest}
            onChange={(e) => { setGuest(e.target.value); setPlayerId(undefined); }} />
        </Card>
        <Card>
          <h2 className="mb-3 font-display text-xl uppercase tracking-wide">Einstellungen</h2>
          <SettingsEditor value={settings} onChange={setSettings} />
        </Card>
      </div>
      <div className="sticky bottom-0 -mx-4 mt-6 border-t border-line bg-bg/90 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6">
        <Button variant="primary" size="lg" className="w-full" disabled={!name} onClick={start}>{name ? "Training starten" : "Spieler wählen"}</Button>
      </div>
    </Page>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 py-1.5">
      <div className="w-36 shrink-0 text-sm font-medium text-muted">{label}</div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

const SEGMENTS = [...Array.from({ length: 20 }, (_, i) => 20 - i), 25];

function SettingsEditor({ value: t, onChange }: { value: TrainingSettings; onChange: (t: TrainingSettings) => void }) {
  switch (t.game) {
    case "c121": {
      const s = t.s;
      const set = (p: Partial<typeof s>) => onChange({ game: "c121", s: { ...s, ...p } });
      return (
        <div>
          <Row label="Startziel"><Stepper value={s.start} min={2} max={170} onChange={(start) => set({ start })} /></Row>
          <Row label="Anzahl Ziele"><Stepper value={s.rounds} min={1} max={50} onChange={(rounds) => set({ rounds })} /></Row>
          <Row label="Darts pro Ziel"><Segmented value={s.dartsPerTarget} options={[3, 6, 9].map((v) => ({ value: v as 3 | 6 | 9, label: String(v) }))} onChange={(dartsPerTarget) => set({ dartsPerTarget })} /></Row>
          <Row label="Nicht geschafft">
            <Segmented value={s.onFail} options={[{ value: "stay", label: "Ziel bleibt" }, { value: "down", label: "Ziel −1" }, { value: "reset", label: "Zurück auf Start" }]} onChange={(onFail) => set({ onFail })} />
          </Row>
        </div>
      );
    }
    case "d99": {
      const s = t.s;
      const set = (p: Partial<typeof s>) => onChange({ game: "d99", s: { ...s, ...p } });
      return (
        <div>
          <Row label="Feld">
            <select className={inputCls + " !w-32 !py-2"} value={s.segment} onChange={(e) => set({ segment: parseInt(e.target.value, 10), ring: parseInt(e.target.value, 10) === 25 && s.ring === "triple" ? "any" : s.ring })}>
              {SEGMENTS.map((x) => <option key={x} value={x}>{x === 25 ? "Bull" : x}</option>)}
            </select>
          </Row>
          <Row label="Zählt als Treffer">
            <Segmented value={s.ring} options={(["any", "single", "double", "triple"] as Ring[]).filter((r) => !(s.segment === 25 && r === "triple")).map((r) => ({ value: r, label: RING_LABEL[r] }))} onChange={(ring) => set({ ring })} />
          </Row>
          <Row label="Anzahl Darts"><Segmented value={s.darts} options={[30, 60, 99].map((v) => ({ value: v, label: String(v) }))} onChange={(darts) => set({ darts })} /></Row>
        </div>
      );
    }
    case "atc": {
      const s = t.s;
      const set = (p: Partial<typeof s>) => onChange({ game: "atc", s: { ...s, ...p } });
      return (
        <div>
          <Row label="Treffer zählt bei"><Segmented value={s.ring} options={(["any", "single", "double", "triple"] as Ring[]).map((r) => ({ value: r, label: RING_LABEL[r] }))} onChange={(ring) => set({ ring })} /></Row>
          <Row label="Bull am Ende"><Segmented value={s.bull ? "y" : "n"} options={[{ value: "y", label: "Ja" }, { value: "n", label: "Nein" }]} onChange={(v) => set({ bull: v === "y" })} /></Row>
        </div>
      );
    }
    case "bobs27": {
      const s = t.s;
      return (
        <div>
          <Row label="Unter 0"><Segmented value={s.stopAtZero ? "y" : "n"} options={[{ value: "y", label: "Spiel endet" }, { value: "n", label: "Weiterspielen" }]} onChange={(v) => onChange({ game: "bobs27", s: { stopAtZero: v === "y" } })} /></Row>
          <p className="mt-2 text-sm text-muted">Pro Doppel (D1 bis Bull) 3 Darts. Jeder Treffer bringt den Doppelwert, kein Treffer zieht ihn einmal ab.</p>
        </div>
      );
    }
    case "checkout": {
      const s = t.s;
      const set = (p: Partial<typeof s>) => onChange({ game: "checkout", s: { ...s, ...p } });
      const ranges: [number, number, string][] = [[2, 40, "2–40"], [41, 60, "41–60"], [61, 100, "61–100"], [101, 130, "101–130"], [131, 170, "131–170"], [2, 170, "Alles"]];
      return (
        <div>
          <Row label="Bereich">
            <Segmented value={`${s.min}-${s.max}`} options={ranges.map(([a, b, l]) => ({ value: `${a}-${b}`, label: l }))} onChange={(v) => { const [a, b] = v.split("-").map(Number); set({ min: a, max: b }); }} />
          </Row>
          <Row label="Anzahl Finishes"><Stepper value={s.rounds} min={5} max={100} step={5} onChange={(rounds) => set({ rounds })} /></Row>
          <Row label="Darts pro Finish"><Segmented value={s.darts} options={[3, 6, 9].map((v) => ({ value: v as 3 | 6 | 9, label: String(v) }))} onChange={(darts) => set({ darts })} /></Row>
        </div>
      );
    }
    case "scoring": {
      const s = t.s;
      return <Row label="Aufnahmen"><Segmented value={s.visits} options={[10, 20, 30, 50].map((v) => ({ value: v, label: String(v) }))} onChange={(visits) => onChange({ game: "scoring", s: { visits } })} /></Row>;
    }
  }
}
