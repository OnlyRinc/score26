"use client";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store/store";
import type { PlayerHandicap, RoundFormat, Tournament } from "@/lib/store/types";
import { displayName, fullName } from "@/lib/store/tournamentHelpers";
import { playerAverages } from "@/lib/store/history";
import {
  drawGroups, groupName, groupSizes, makePlan, nextPow2, roundName, suggestPlan, TIEBREAKER_LABELS, type Tiebreaker,
} from "@/lib/tournament";
import { Button, Card, Field, Segmented, Stepper, cx, inputCls } from "@/components/ui";
import { FormatEditor, IN_LABEL, OUT_LABEL, RulesEditor, ScoreSelect, formatLabel, rulesLabel } from "@/components/RulesEditor";
import { PlayerDialog } from "@/components/PlayerDialog";
import type { InRule, OutRule } from "@/lib/game";

export function koRoundNames(koSize: number, thirdPlace: boolean): string[] {
  const rounds = Math.log2(nextPow2(Math.max(2, koSize)));
  const names = Array.from({ length: rounds }, (_, r) => roundName(rounds, r));
  if (thirdPlace && rounds >= 2) names.splice(names.length - 1, 0, "Spiel um Platz 3");
  return names;
}

export function Section({ n, title, children, right }: { n?: number; title: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {n !== undefined && <span className="grid h-8 w-8 place-items-center rounded-full bg-pink font-display font-bold">{n}</span>}
        <h2 className="flex-1 font-display text-xl uppercase tracking-wide">{title}</h2>
        {right}
      </div>
      {children}
    </Card>
  );
}

export function TournamentSetup({ t, onDelete }: { t: Tournament; onDelete?: () => void }) {
  const players = useStore((s) => s.players);
  const update = useStore((s) => s.updateTournament);
  const [newPlayer, setNewPlayer] = useState(false);
  const set = (p: Partial<Tournament>) => update(t.id, p);
  const n = t.playerIds.length;
  const suggestion = useMemo(() => suggestPlan(n), [n]);
  const plan = makePlan(Math.max(n, 1), Math.max(1, Math.min(t.groupsCount, Math.max(1, Math.floor(n / 2)))), t.advancePerGroup);
  const allPlayers = Object.values(players).sort((a, b) => displayName(a).localeCompare(displayName(b)));

  const togglePlayer = (id: string) => {
    const has = t.playerIds.includes(id);
    set({ playerIds: has ? t.playerIds.filter((x) => x !== id) : [...t.playerIds, id], seeded: t.seeded.filter((x) => x !== id || !has), groups: [] });
  };
  const toggleSeed = (id: string) => set({ seeded: t.seeded.includes(id) ? t.seeded.filter((x) => x !== id) : [...t.seeded, id], groups: [] });
  const applySuggestion = () => set({ groupsCount: suggestion.groups, advancePerGroup: suggestion.advancePerGroup, groups: [] });
  const draw = () => set({ groups: drawGroups(t.playerIds, plan.groups, t.seeded) });
  const moveTo = (pid: string, gi: number) => {
    const groups = (t.groups.length === plan.groups ? t.groups : Array.from({ length: plan.groups }, () => [] as string[])).map((g) => g.filter((x) => x !== pid));
    groups[gi].push(pid);
    set({ groups });
  };
  const groupsComplete = t.groups.length === plan.groups && t.groups.flat().length === n && t.groups.every((g) => g.length >= 2);
  const minGroup = groupsComplete ? Math.min(...t.groups.map((g) => g.length)) : 0;
  const advOk = groupsComplete && t.advancePerGroup <= minGroup && plan.groups * t.advancePerGroup >= 2;

  const koNames = koRoundNames(plan.groups * plan.advancePerGroup, t.thirdPlace);
  const setKoFormat = (name: string, rf: RoundFormat) => set({ koFormats: { ...t.koFormats, [name]: rf } });

  const start = () => {
    if (!advOk) return;
    set({ status: "groups", groupsCount: plan.groups });
  };

  return (
    <div className="space-y-4">
      <Section n={1} title="Turnier">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Name"><input className={inputCls} value={t.name} onChange={(e) => set({ name: e.target.value })} /></Field>
          <Field label="Datum"><input type="date" className={inputCls} value={t.date} onChange={(e) => set({ date: e.target.value })} /></Field>
          <Field label="Admin-PIN (für die Live-Ansicht)" hint="Schützt das Zählen, wenn die App online ist.">
            <input inputMode="numeric" maxLength={8} className={inputCls} value={t.pin} onChange={(e) => set({ pin: e.target.value.replace(/\D/g, "") })} placeholder="z. B. 2626" />
          </Field>
        </div>
        <div className="mt-4 flex items-center gap-4">
          {t.logo && <img src={t.logo} alt="Logo" className="h-16 w-16 rounded-xl border border-line object-contain" />}
          <label className="cursor-pointer rounded-xl border border-line bg-surface-2 px-4 py-2.5 text-sm font-semibold">
            {t.logo ? "Logo ändern" : "Logo hochladen (optional)"}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) resizeImage(f, 256).then((logo) => set({ logo })); }} />
          </label>
          {t.logo && <Button size="sm" variant="ghost" onClick={() => set({ logo: undefined })}>Entfernen</Button>}
        </div>
      </Section>

      <Section n={2} title={`Spieler auswählen (${n})`} right={<Button size="sm" variant="primary" onClick={() => setNewPlayer(true)}>+ Neuer Spieler</Button>}>
        {allPlayers.length === 0 && <p className="text-muted">Lege zuerst Spieler an.</p>}
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {allPlayers.map((p) => {
            const on = t.playerIds.includes(p.id);
            const seeded = t.seeded.includes(p.id);
            return (
              <div key={p.id} className={cx("flex items-center gap-2 rounded-xl border p-2 pl-3", on ? "border-pink bg-pink/10" : "border-line bg-surface-2")}>
                <button className="flex-1 text-left" onClick={() => togglePlayer(p.id)}>
                  <span className="mr-2">{on ? "✅" : "⬜️"}</span>
                  <span className="font-display text-lg uppercase">{displayName(p)}</span>
                  <span className="ml-2 text-xs text-muted">{fullName(p)}</span>
                </button>
                {on && (
                  <button onClick={() => toggleSeed(p.id)} className={cx("rounded-lg px-2 py-1 text-xs font-bold", seeded ? "bg-cyan text-black" : "bg-surface text-muted")}>
                    {seeded ? `Gesetzt ${t.seeded.indexOf(p.id) + 1}` : "Setzen"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-sm text-muted">„Setzen“ ist optional: Gesetzte Spieler werden beim Auslosen auf verschiedene Gruppen verteilt.</p>
      </Section>

      {n >= 2 && (
        <Section n={3} title="Gruppen">
          <div className="mb-4 rounded-xl border border-cyan/30 bg-cyan/5 p-3 text-sm">
            Vorschlag für {n} Spieler: <b>{suggestion.groups} {suggestion.groups === 1 ? "Gruppe" : "Gruppen"}</b> ({groupSizes(n, suggestion.groups).join(", ")} Spieler),
            die besten <b>{suggestion.advancePerGroup}</b> pro Gruppe kommen weiter → <b>{koRoundNames(suggestion.koSize, false)[0]}</b> mit {suggestion.koSize} Spielern
            {suggestion.bracketSize > suggestion.koSize ? ` (${suggestion.bracketSize - suggestion.koSize} Freilose)` : ""}.
            <Button size="sm" variant="secondary" className="ml-3" onClick={applySuggestion}>Übernehmen</Button>
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-3"><span className="text-sm text-muted">Gruppen</span>
              <Stepper value={plan.groups} min={1} max={Math.max(1, Math.floor(n / 2))} onChange={(g) => set({ groupsCount: g, groups: [] })} /></div>
            <div className="flex items-center gap-3"><span className="text-sm text-muted">Weiter pro Gruppe</span>
              <Stepper value={t.advancePerGroup} min={1} max={Math.max(1, Math.min(...plan.sizes))} onChange={(a) => set({ advancePerGroup: a })} /></div>
            <div className="flex items-center gap-3"><span className="text-sm text-muted">Spiel um Platz 3</span>
              <Segmented value={t.thirdPlace ? "y" : "n"} options={[{ value: "n", label: "Nein" }, { value: "y", label: "Ja" }]} onChange={(v) => set({ thirdPlace: v === "y" })} /></div>
          </div>
          <p className="mt-2 text-sm text-muted">
            KO-Runde mit {plan.groups * t.advancePerGroup} Spielern: {koRoundNames(plan.groups * t.advancePerGroup, t.thirdPlace).join(" → ")}
            {nextPow2(plan.groups * t.advancePerGroup) > plan.groups * t.advancePerGroup ? ` · ${nextPow2(plan.groups * t.advancePerGroup) - plan.groups * t.advancePerGroup} Freilose für die Gruppenbesten` : ""}
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            <Button variant="primary" onClick={draw}>🎲 {t.groups.length ? "Neu auslosen" : "Gruppen auslosen"}</Button>
            <Button variant="secondary" onClick={() => set({ groups: Array.from({ length: plan.groups }, () => []) })}>Manuell einteilen</Button>
          </div>

          {t.groups.length === plan.groups && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {t.groups.map((g, gi) => (
                <div key={gi} className="rounded-xl border border-line bg-surface-2/60 p-3">
                  <div className="mb-2 font-display text-lg uppercase text-pink">{groupName(gi)} <span className="text-sm text-muted">({g.length})</span></div>
                  {g.map((pid) => (
                    <div key={pid} className="flex items-center justify-between py-1">
                      <span className="font-display uppercase">{displayName(players[pid])}</span>
                      <GroupSelect groups={plan.groups} value={gi} onChange={(x) => moveTo(pid, x)} />
                    </div>
                  ))}
                </div>
              ))}
              {t.playerIds.filter((p) => !t.groups.flat().includes(p)).length > 0 && (
                <div className="rounded-xl border border-dashed border-line p-3 sm:col-span-2 lg:col-span-4">
                  <div className="mb-2 text-sm text-muted">Noch keiner Gruppe zugeordnet:</div>
                  <div className="flex flex-wrap gap-2">
                    {t.playerIds.filter((p) => !t.groups.flat().includes(p)).map((pid) => (
                      <div key={pid} className="flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-1.5">
                        <span className="font-display uppercase">{displayName(players[pid])}</span>
                        <GroupSelect groups={plan.groups} value={-1} onChange={(x) => moveTo(pid, x)} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </Section>
      )}

      <Section n={4} title="Spielformat">
        <FormatBlock title="Gruppenphase" value={t.groupFormat} onChange={(groupFormat) => set({ groupFormat })} />
        {koNames.map((name) => (
          <FormatBlock key={name} title={name} value={t.koFormats[name] ?? t.groupFormat} onChange={(rf) => setKoFormat(name, rf)} custom={!!t.koFormats[name]}
            onReset={() => { const k = { ...t.koFormats }; delete k[name]; set({ koFormats: k }); }} />
        ))}
      </Section>

      <Section n={5} title="Tabelle & Wertung">
        <div className="mb-4 flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-3"><span className="text-sm text-muted">Punkte für Sieg</span><Stepper value={t.pointsWin} min={1} max={5} onChange={(pointsWin) => set({ pointsWin })} /></div>
          <div className="flex items-center gap-3"><span className="text-sm text-muted">für Niederlage</span><Stepper value={t.pointsLoss} min={0} max={2} onChange={(pointsLoss) => set({ pointsLoss })} /></div>
        </div>
        <TiebreakerEditor value={t.tiebreakers} onChange={(tiebreakers) => set({ tiebreakers })} />
      </Section>

      {n >= 2 && <HandicapEditor t={t} />}

      {onDelete && (
        <div className="flex justify-end">
          <Button variant="danger" onClick={onDelete}>🗑 Turnier löschen</Button>
        </div>
      )}

      <div className="sticky bottom-0 -mx-4 border-t border-line bg-bg/90 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6">
        <Button variant="primary" size="lg" className="w-full" disabled={!advOk} onClick={start}>
          {n < 2 ? "Mindestens 2 Spieler wählen" : !groupsComplete ? "Gruppen auslosen oder einteilen" : !advOk ? "Weiterkommende anpassen" : "Turnier starten"}
        </Button>
      </div>

      <PlayerDialog value={newPlayer ? {} : null} onClose={() => setNewPlayer(false)} onCreated={(id) => set({ playerIds: [...t.playerIds, id], groups: [] })} />
    </div>
  );
}

function GroupSelect({ groups, value, onChange }: { groups: number; value: number; onChange: (g: number) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(parseInt(e.target.value, 10))} className="rounded-lg border border-line bg-surface px-2 py-1 text-sm">
      {value === -1 && <option value={-1}>Gruppe…</option>}
      {Array.from({ length: groups }, (_, i) => <option key={i} value={i}>{groupName(i)}</option>)}
    </select>
  );
}

function FormatBlock({ title, value, onChange, custom, onReset }: { title: string; value: RoundFormat; onChange: (v: RoundFormat) => void; custom?: boolean; onReset?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-line/60 py-3 last:border-0">
      <button className="flex w-full items-center gap-3 text-left" onClick={() => setOpen(!open)}>
        <span className="w-40 font-display text-lg uppercase">{title}</span>
        <span className="flex-1 text-sm text-muted">{formatLabel(value.format)} · {rulesLabel(value.rules)}{onReset && !custom ? " (wie Gruppe)" : ""}</span>
        <span className="text-muted">{open ? "▲" : "Ändern ▼"}</span>
      </button>
      {open && (
        <div className="mt-3 space-y-3 rounded-xl bg-surface-2/50 p-3">
          <FormatEditor value={value.format} onChange={(format) => onChange({ ...value, format })} />
          <RulesEditor value={value.rules} onChange={(rules) => onChange({ ...value, rules })} />
          {custom && onReset && <Button size="sm" variant="ghost" onClick={onReset}>Wie Gruppenphase</Button>}
        </div>
      )}
    </div>
  );
}

export function TiebreakerEditor({ value, onChange }: { value: Tiebreaker[]; onChange: (v: Tiebreaker[]) => void }) {
  const all = Object.keys(TIEBREAKER_LABELS) as Tiebreaker[];
  const unused = all.filter((x) => !value.includes(x));
  const move = (i: number, d: number) => {
    const v = [...value];
    const j = i + d;
    if (j < 0 || j >= v.length) return;
    [v[i], v[j]] = [v[j], v[i]];
    onChange(v);
  };
  return (
    <div>
      <div className="mb-2 text-sm text-muted">Reihenfolge bei Gleichstand (oben = wichtigster):</div>
      <ol className="space-y-1.5">
        {value.map((tb, i) => (
          <li key={tb} className="flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-1.5">
            <span className="w-6 text-muted">{i + 1}.</span>
            <span className="flex-1 font-semibold">{TIEBREAKER_LABELS[tb]}</span>
            <button className="h-8 w-8 rounded bg-surface" onClick={() => move(i, -1)}>▲</button>
            <button className="h-8 w-8 rounded bg-surface" onClick={() => move(i, 1)}>▼</button>
            {tb !== "points" && <button className="h-8 w-8 rounded bg-surface text-muted" onClick={() => onChange(value.filter((x) => x !== tb))}>×</button>}
          </li>
        ))}
      </ol>
      {unused.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {unused.map((tb) => <Button key={tb} size="sm" variant="ghost" onClick={() => onChange([...value, tb])}>+ {TIEBREAKER_LABELS[tb]}</Button>)}
        </div>
      )}
    </div>
  );
}

export function HandicapEditor({ t }: { t: Tournament }) {
  const players = useStore((s) => s.players);
  const matches = useStore((s) => s.matches);
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const update = useStore((s) => s.updateTournament);
  const avgs = useMemo(() => playerAverages(matches), [matches]);
  const setH = (pid: string, h: PlayerHandicap | null) => {
    const handicaps = { ...t.handicaps };
    if (h) handicaps[pid] = h; else delete handicaps[pid];
    update(t.id, { handicaps });
  };
  const base = t.groupFormat.rules;
  const known = t.playerIds.filter((p) => avgs[p]);
  const best = known.length ? Math.max(...known.map((p) => avgs[p].average)) : 0;
  const suggestAll = () => {
    const handicaps = { ...t.handicaps };
    for (const pid of known) {
      const diff = best - avgs[pid].average;
      const red = Math.round(((diff / 10) * settings.handicapPointsPer10) / 10) * 10;
      const startScore = Math.max(101, base.startScore - red);
      handicaps[pid] = { ...(handicaps[pid] ?? { legs: 0, sets: 0 }), startScore: startScore === base.startScore ? undefined : startScore };
    }
    update(t.id, { handicaps });
  };
  return (
    <Section n={6} title="Handicaps (optional)">
      <p className="mb-3 text-sm text-muted">Gilt für alle Spiele dieses Turniers. Vor jedem einzelnen Match kannst du es nochmal ändern.</p>
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-cyan/30 bg-cyan/5 p-3 text-sm">
        <span>Vorschlag nach bisherigem Average: pro 10 Punkte Average-Unterschied</span>
        <Stepper value={settings.handicapPointsPer10} min={10} max={150} step={10} onChange={(handicapPointsPer10) => updateSettings({ handicapPointsPer10 })} />
        <span>Punkte weniger.</span>
        <Button size="sm" disabled={known.length < 2} onClick={suggestAll}>{known.length < 2 ? "Noch keine Averages" : "Vorschlag übernehmen"}</Button>
      </div>
      <div className="space-y-2">
        {t.playerIds.map((pid) => {
          const h = t.handicaps[pid];
          const hv: PlayerHandicap = h ?? { legs: 0, sets: 0 };
          return (
            <div key={pid} className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl bg-surface-2/60 px-3 py-2">
              <span className="w-36 font-display text-lg uppercase">{displayName(players[pid])}</span>
              {avgs[pid] && <span className="w-16 text-xs text-cyan tabular">Ø {avgs[pid].average.toFixed(1)}</span>}
              <ScoreSelect value={hv.startScore ?? base.startScore} onChange={(v) => setH(pid, { ...hv, startScore: v === base.startScore ? undefined : v })} />
              <select className="rounded-lg border border-line bg-surface px-2 py-2 text-sm" value={hv.inRule ?? ""} onChange={(e) => setH(pid, { ...hv, inRule: (e.target.value || undefined) as InRule | undefined })}>
                <option value="">In: wie Runde</option>
                {(["straight", "double"] as InRule[]).map((r) => <option key={r} value={r}>{IN_LABEL[r]}</option>)}
              </select>
              <select className="rounded-lg border border-line bg-surface px-2 py-2 text-sm" value={hv.outRule ?? ""} onChange={(e) => setH(pid, { ...hv, outRule: (e.target.value || undefined) as OutRule | undefined })}>
                <option value="">Out: wie Runde</option>
                {(["single", "double", "master"] as OutRule[]).map((r) => <option key={r} value={r}>{OUT_LABEL[r]}</option>)}
              </select>
              <Stepper value={hv.legs} max={10} label="Legs" onChange={(legs) => setH(pid, { ...hv, legs })} />
              {h && <Button size="sm" variant="ghost" onClick={() => setH(pid, null)}>Zurücksetzen</Button>}
            </div>
          );
        })}
      </div>
    </Section>
  );
}

function resizeImage(file: File, max: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL("image/png"));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}
