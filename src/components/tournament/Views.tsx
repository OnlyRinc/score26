"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { computeMatch } from "@/lib/game";
import { useStore } from "@/lib/store/store";
import type { Player, StoredMatch, Tournament } from "@/lib/store/types";
import {
  displayName, groupFixtures, groupStandings, koFixtures, koRoundLabel, koRounds, roundFormatFor, scoreLine, upcomingFixtures,
  type Fixture,
} from "@/lib/store/tournamentHelpers";
import { playerHistory } from "@/lib/store/history";
import { groupName } from "@/lib/tournament";
import { Button, Card, Empty, Modal, Stepper, cx } from "@/components/ui";
import { formatLabel, rulesLabel } from "@/components/RulesEditor";

// ---------- Tabellen ----------
export function GroupTables({ t, players, compact }: { t: Tournament; players: Record<string, Player>; compact?: boolean }) {
  return (
    <div className={cx("grid gap-4", t.groups.length > 1 && "md:grid-cols-2")}>
      {t.groups.map((_, gi) => {
        const rows = groupStandings(t, gi);
        return (
          <Card key={gi} className="!p-0 overflow-hidden">
            <div className="bg-gradient-to-r from-pink/30 to-transparent px-4 py-2 font-display text-xl uppercase tracking-wide">{groupName(gi)}</div>
            <table className="w-full text-left tabular">
              <thead className="text-xs uppercase text-muted">
                <tr>
                  <th className="py-2 pl-4">#</th><th>Spieler</th><th className="text-center">Sp</th><th className="text-center">S</th>
                  {!compact && <th className="text-center">N</th>}
                  <th className="text-center">Legs</th><th className="text-center">+/-</th>
                  {!compact && <th className="text-center">Ø</th>}
                  <th className="pr-4 text-right">Pkt</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.playerId} className={cx("border-t border-line/60", i < t.advancePerGroup && "bg-sage-dark/25")}>
                    <td className="py-2.5 pl-4 font-display text-lg">{i + 1}</td>
                    <td className="font-display text-lg uppercase">{displayName(players[r.playerId])}</td>
                    <td className="text-center">{r.played}</td>
                    <td className="text-center">{r.won}</td>
                    {!compact && <td className="text-center">{r.lost}</td>}
                    <td className="text-center">{r.legsFor}:{r.legsAgainst}</td>
                    <td className="text-center">{r.legDiff > 0 ? `+${r.legDiff}` : r.legDiff}</td>
                    {!compact && <td className="text-center">{r.darts ? r.average.toFixed(1) : "–"}</td>}
                    <td className="pr-4 text-right font-display text-xl font-bold">{r.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        );
      })}
    </div>
  );
}

// ---------- KO-Baum ----------
export function Bracket({ t, players, onFixture }: { t: Tournament; players: Record<string, Player>; onFixture?: (key: string) => void }) {
  const rounds = koRounds(t);
  if (!rounds.length) return <Empty>Der KO-Baum entsteht, sobald alle Gruppenspiele beendet sind.</Empty>;
  const main = rounds.filter((r) => r[0]?.key !== "third");
  const third = rounds.find((r) => r[0]?.key === "third");
  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex min-w-max gap-6">
        {main.map((round, ri) => (
          <div key={ri} className="flex w-60 flex-col">
            <div className="mb-3 text-center font-display text-lg uppercase tracking-wide text-pink">{koRoundLabel(rounds, round[0])}</div>
            <div className="flex flex-1 flex-col justify-around gap-3">
              {round.map((m) => <BracketMatch key={m.key} t={t} players={players} m={m} onClick={onFixture} />)}
            </div>
          </div>
        ))}
        {third && (
          <div className="flex w-60 flex-col justify-end">
            <div className="mb-3 text-center font-display text-lg uppercase tracking-wide text-sage">Spiel um Platz 3</div>
            <BracketMatch t={t} players={players} m={third[0]} onClick={onFixture} />
          </div>
        )}
      </div>
    </div>
  );
}

function BracketMatch({ t, players, m, onClick }: { t: Tournament; players: Record<string, Player>; m: ReturnType<typeof koRounds>[number][number]; onClick?: (key: string) => void }) {
  const r = t.koResults[m.key];
  const row = (id: string | null) => {
    const won = m.winner && id === m.winner;
    const score = r && id ? scoreLine(r, id).split(" : ")[0] : "";
    return (
      <div className={cx("flex items-center justify-between px-3 py-2", won && "bg-pink/25")}>
        <span className={cx("truncate font-display text-lg uppercase", !id && "text-muted", m.winner && !won && "opacity-50")}>
          {id ? displayName(players[id]) : m.bye ? "Freilos" : "…"}
        </span>
        <span className="font-display text-xl font-bold tabular">{m.bye ? "" : score}</span>
      </div>
    );
  };
  const live = t.activeMatchId && m.ready;
  return (
    <button disabled={!onClick || (!m.ready && !r)} onClick={() => onClick?.(m.key)}
      className={cx("w-full overflow-hidden rounded-xl border text-left divide-y divide-line/60", m.ready ? "border-cyan/50 bg-surface-2" : "border-line bg-surface", m.bye && "opacity-50", live && "")}>
      {row(m.a)}
      {row(m.b)}
    </button>
  );
}

// ---------- Spielplan ----------
export function Schedule({ t, players, matches }: { t: Tournament; players: Record<string, Player>; matches: Record<string, StoredMatch> }) {
  const router = useRouter();
  const [manual, setManual] = useState<Fixture | null>(null);
  const [detail, setDetail] = useState<Fixture | null>(null);
  const upcoming = upcomingFixtures(t);
  const all = t.status === "groups" ? groupFixtures(t) : [...groupFixtures(t), ...koFixtures(t)];
  const done = all.filter((f) => f.result).reverse();
  const active = t.activeMatchId ? matches[t.activeMatchId] : undefined;
  const activeLive = active && !active.finishedAt && !computeMatch(active.setup, active.visits).finished ? active : undefined;
  const next = upcoming[0];

  const startFixture = (f: Fixture) => {
    // laufendes Match zu dieser Begegnung fortsetzen
    const existing = Object.values(matches).find((m) => m.tournamentId === t.id && m.fixtureKey === f.key && !m.finishedAt);
    if (existing) router.push(`/match/?id=${existing.id}`);
    else router.push(`/play/?t=${t.id}&f=${encodeURIComponent(f.key)}`);
  };

  return (
    <div className="space-y-6">
      {activeLive && (
        <Card className="border-live/60 bg-live/10">
          <div className="mb-1 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-live"><span className="h-2.5 w-2.5 animate-pulse rounded-full bg-live" /> Läuft gerade</div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="font-display text-3xl uppercase">{activeLive.setup.players.map((p) => p.nickname).join(" vs ")}</div>
            <Button variant="primary" size="lg" href={`/match/?id=${activeLive.id}`}>Weiter zählen</Button>
          </div>
        </Card>
      )}

      {next && !activeLive && (
        <Card className="border-pink/60 bg-gradient-to-br from-pink/20 to-surface">
          <div className="text-sm font-bold uppercase tracking-widest text-pink">Als Nächstes · {next.label}</div>
          <div className="my-3 flex flex-wrap items-center gap-x-6 gap-y-2 font-display text-4xl uppercase sm:text-5xl">
            <span>{displayName(players[next.a!])}</span><span className="text-2xl text-muted">vs</span><span>{displayName(players[next.b!])}</span>
          </div>
          <div className="mb-4 text-sm text-muted">{formatLabel(roundFormatFor(t, next).format)} · {rulesLabel(roundFormatFor(t, next).rules)}</div>
          <Button variant="primary" size="lg" onClick={() => startFixture(next)}>▶ Match starten</Button>
        </Card>
      )}

      {upcoming.length > (activeLive ? 0 : 1) && (
        <section>
          <h3 className="mb-2 font-display text-lg uppercase tracking-wide text-muted">Danach</h3>
          <div className="space-y-2">
            {upcoming.slice(activeLive ? 0 : 1).map((f, i) => (
              <FixtureRow key={f.key} f={f} players={players} index={i + (activeLive ? 1 : 2)} onStart={() => startFixture(f)} onManual={() => setManual(f)} />
            ))}
          </div>
        </section>
      )}

      {done.length > 0 && (
        <section>
          <h3 className="mb-2 font-display text-lg uppercase tracking-wide text-muted">Ergebnisse</h3>
          <div className="space-y-2">
            {done.map((f) => (
              <button key={f.key} onClick={() => setDetail(f)} className="flex w-full items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-left">
                <span className="w-28 text-xs uppercase text-muted">{f.label}</span>
                <span className={cx("flex-1 text-right font-display text-xl uppercase", f.result!.winner === f.a && "text-pink")}>{displayName(players[f.a!])}</span>
                <span className="w-20 text-center font-display text-2xl font-bold tabular">{scoreLine(f.result!, f.a!)}</span>
                <span className={cx("flex-1 font-display text-xl uppercase", f.result!.winner === f.b && "text-pink")}>{displayName(players[f.b!])}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      <ManualResult t={t} fixture={manual} players={players} onClose={() => setManual(null)} />
      <ResultDetail t={t} fixture={detail} players={players} matches={matches} onClose={() => setDetail(null)} />
    </div>
  );
}

function FixtureRow({ f, players, index, onStart, onManual }: { f: Fixture; players: Record<string, Player>; index: number; onStart: () => void; onManual: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-2.5">
      <span className="w-6 text-muted tabular">{index}.</span>
      <span className="w-24 text-xs uppercase text-muted">{f.label}</span>
      <span className="flex-1 font-display text-xl uppercase">{displayName(players[f.a!])} <span className="text-sm text-muted">vs</span> {displayName(players[f.b!])}</span>
      <Button size="sm" variant="ghost" onClick={onManual}>Ergebnis eintragen</Button>
      <Button size="sm" variant="secondary" onClick={onStart}>▶ Start</Button>
    </div>
  );
}

function ManualResult({ t, fixture, players, onClose }: { t: Tournament; fixture: Fixture | null; players: Record<string, Player>; onClose: () => void }) {
  const setFixtureResult = useStore((s) => s.setFixtureResult);
  const [a, setA] = useState(0);
  const [b, setB] = useState(0);
  if (!fixture) return null;
  const sets = roundFormatFor(t, fixture).format.sets > 1;
  const save = () => {
    if (a === b) return;
    setFixtureResult(t.id, fixture.stage, fixture.key, {
      a: fixture.a!, b: fixture.b!, winner: a > b ? fixture.a! : fixture.b!,
      legsA: sets ? 0 : a, legsB: sets ? 0 : b, setsA: sets ? a : 0, setsB: sets ? b : 0,
      pointsA: 0, dartsA: 0, pointsB: 0, dartsB: 0, manual: true,
    });
    setA(0); setB(0);
    onClose();
  };
  return (
    <Modal open onClose={onClose} title="Ergebnis eintragen">
      <p className="mb-4 text-sm text-muted">Nur nutzen, wenn ein Spiel nicht in der App gezählt wurde. Ohne Statistik.</p>
      <div className="flex items-center justify-between gap-4">
        <div className="text-center"><div className="mb-2 font-display text-2xl uppercase">{displayName(players[fixture.a!])}</div><Stepper value={a} max={30} onChange={setA} /></div>
        <span className="text-muted">{sets ? "Sets" : "Legs"}</span>
        <div className="text-center"><div className="mb-2 font-display text-2xl uppercase">{displayName(players[fixture.b!])}</div><Stepper value={b} max={30} onChange={setB} /></div>
      </div>
      <div className="mt-6 flex justify-end gap-3"><Button variant="ghost" onClick={onClose}>Abbrechen</Button><Button variant="primary" disabled={a === b} onClick={save}>Speichern</Button></div>
    </Modal>
  );
}

function ResultDetail({ t, fixture, players, matches, onClose }: { t: Tournament; fixture: Fixture | null; players: Record<string, Player>; matches: Record<string, StoredMatch>; onClose: () => void }) {
  const setFixtureResult = useStore((s) => s.setFixtureResult);
  const reopen = useStore((s) => s.reopenMatch);
  const router = useRouter();
  if (!fixture || !fixture.result) return null;
  const r = fixture.result;
  const m = r.matchId ? matches[r.matchId] : undefined;
  // KO-Ergebnis nur änderbar, solange die nächste Runde nicht gespielt ist
  const dependentPlayed = fixture.stage === "ko" && Object.entries(t.koResults).some(([k, x]) => k !== fixture.key && (x.a === r.winner || x.b === r.winner) && (k === "third" ? false : parseInt(k.slice(1), 10) > (fixture.round ?? 0)));
  const groupLocked = fixture.stage === "group" && t.status !== "groups";
  return (
    <Modal open onClose={onClose} title={`${fixture.label}: ${displayName(players[r.a])} ${scoreLine(r, r.a)} ${displayName(players[r.b])}`}>
      {r.manual && <p className="mb-3 text-sm text-muted">Manuell eingetragen.</p>}
      {m && <p className="mb-3 text-sm text-muted">Average: {displayName(players[r.a])} {r.dartsA ? ((r.pointsA / r.dartsA) * 3).toFixed(1) : "–"} · {displayName(players[r.b])} {r.dartsB ? ((r.pointsB / r.dartsB) * 3).toFixed(1) : "–"}</p>}
      <div className="flex flex-wrap justify-end gap-3">
        {!dependentPlayed && !groupLocked && (
          <Button variant="danger" onClick={() => {
            if (!confirm("Ergebnis wirklich zurücksetzen?")) return;
            setFixtureResult(t.id, fixture.stage, fixture.key, null);
            if (m) { reopen(m.id); onClose(); router.push(`/match/?id=${m.id}`); } else onClose();
          }}>{m ? "Zurücksetzen & weiter zählen" : "Ergebnis löschen"}</Button>
        )}
        <Button onClick={onClose}>Schließen</Button>
      </div>
    </Modal>
  );
}

// ---------- Statistik & Awards ----------
export function TournamentStats({ t, players, matches }: { t: Tournament; players: Record<string, Player>; matches: Record<string, StoredMatch> }) {
  const hist = useMemo(() => playerHistory(matches, (m) => m.tournamentId === t.id && !!m.finishedAt), [matches, t.id]);
  const rows = t.playerIds.map((id) => ({ id, ...(hist[id] ?? null) })).filter((r) => r.stats);
  if (!rows.length) return <Empty>Statistiken erscheinen nach dem ersten gezählten Match.</Empty>;
  rows.sort((a, b) => b.stats!.average - a.stats!.average);
  const award = (title: string, pick: (s: NonNullable<(typeof rows)[number]["stats"]>) => number, fmt: (v: number) => string) => {
    let best: (typeof rows)[number] | null = null;
    for (const r of rows) if (!best || pick(r.stats!) > pick(best.stats!)) best = r;
    if (!best || pick(best.stats!) <= 0) return null;
    return { title, name: displayName(players[best.id]), value: fmt(pick(best.stats!)) };
  };
  const awards = [
    award("Bester Average", (s) => s.average, (v) => v.toFixed(2)),
    award("Meiste 180er", (s) => s.count180, (v) => String(v)),
    award("Höchstes Finish", (s) => s.highestFinish, (v) => String(v)),
    award("Höchste Aufnahme", (s) => s.highestVisit, (v) => String(v)),
    award("Beste Checkout-Quote", (s) => (s.dartsAtDouble >= 3 ? s.checkoutRate : 0), (v) => `${(v * 100).toFixed(0)} %`),
  ].filter(Boolean) as { title: string; name: string; value: string }[];
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {awards.map((a) => (
          <Card key={a.title} className="bg-gradient-to-br from-cyan/10 to-surface">
            <div className="text-xs font-bold uppercase tracking-widest text-cyan">{a.title}</div>
            <div className="mt-1 font-display text-3xl uppercase">{a.name}</div>
            <div className="font-display text-2xl text-muted tabular">{a.value}</div>
          </Card>
        ))}
      </div>
      <Card className="!p-0 overflow-x-auto">
        <table className="w-full min-w-[720px] text-left tabular">
          <thead className="text-xs uppercase text-muted">
            <tr className="border-b border-line">
              <th className="py-3 pl-4">Spieler</th><th className="text-center">Ø</th><th className="text-center">F9 Ø</th><th className="text-center">Max</th>
              <th className="text-center">100+</th><th className="text-center">140+</th><th className="text-center">180</th><th className="text-center">Checkout</th>
              <th className="text-center">Hi-Fin</th><th className="pr-4 text-center">Short</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ id, stats: s }) => (
              <tr key={id} className="border-b border-line/50">
                <td className="py-2.5 pl-4 font-display text-lg uppercase">{displayName(players[id])}</td>
                <td className="text-center font-semibold">{s!.average.toFixed(2)}</td>
                <td className="text-center">{s!.first9Average.toFixed(2)}</td>
                <td className="text-center">{s!.highestVisit}</td>
                <td className="text-center">{s!.count100}</td>
                <td className="text-center">{s!.count140}</td>
                <td className="text-center">{s!.count180}</td>
                <td className="text-center">{s!.dartsAtDouble ? `${(s!.checkoutRate * 100).toFixed(0)} %` : "–"}</td>
                <td className="text-center">{s!.highestFinish || "–"}</td>
                <td className="pr-4 text-center">{s!.shortLegs}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

export function podium(t: Tournament): { first?: string; second?: string; third: string[] } {
  const rounds = koRounds(t);
  const main = rounds.filter((r) => r[0]?.key !== "third");
  const final = main[main.length - 1]?.[0];
  const third = rounds.find((r) => r[0]?.key === "third")?.[0];
  const semis = main.length >= 2 ? main[main.length - 2] : [];
  return {
    first: final?.winner ?? undefined,
    second: final?.loser ?? undefined,
    third: third ? (third.winner ? [third.winner] : []) : semis.map((m) => m.loser).filter(Boolean) as string[],
  };
}

export function Ceremony({ t, players }: { t: Tournament; players: Record<string, Player> }) {
  const p = podium(t);
  if (!p.first) return null;
  const step = (id: string | undefined, place: number, h: string, color: string) => (
    <div className="flex flex-1 flex-col items-center justify-end">
      <div className="mb-2 text-center font-display text-2xl uppercase sm:text-4xl">{id ? displayName(players[id]) : ""}</div>
      <div className={cx("flex w-full items-start justify-center rounded-t-2xl pt-3 font-display text-5xl font-bold", h, color)}>{place}</div>
    </div>
  );
  return (
    <Card className="bg-gradient-to-b from-pink/25 to-surface">
      <div className="mb-6 text-center">
        <div className="font-display text-sm uppercase tracking-[0.4em] text-pink">Siegerehrung</div>
        <div className="font-display text-4xl uppercase">{t.name}</div>
      </div>
      <div className="mx-auto flex max-w-2xl items-end gap-3">
        {step(p.second, 2, "h-28", "bg-white/80 text-black")}
        {step(p.first, 1, "h-40", "bg-pink text-white")}
        <div className="flex flex-1 flex-col items-center justify-end">
          <div className="mb-2 text-center font-display text-2xl uppercase sm:text-4xl">{p.third.map((id) => displayName(players[id])).join(" & ")}</div>
          <div className="flex h-20 w-full items-start justify-center rounded-t-2xl bg-sage pt-3 font-display text-5xl font-bold text-black">3</div>
        </div>
      </div>
    </Card>
  );
}
