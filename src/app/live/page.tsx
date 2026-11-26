"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { computeMatch } from "@/lib/game";
import { fetchLive, subscribeLive, type LiveSnapshot } from "@/lib/live/client";
import { liveEnabled } from "@/lib/live/config";
import type { Player, Tournament } from "@/lib/store/types";
import { displayName, groupFixtures, koFixtures, scoreLine, upcomingFixtures } from "@/lib/store/tournamentHelpers";
import { Loading, Segmented, Wordmark, cx } from "@/components/ui";
import { Bracket, Ceremony, GroupTables, TournamentStats } from "@/components/tournament/Views";
import { LiveMatch } from "@/components/live/LiveMatch";

export default function LivePage() {
  return <Suspense fallback={<Loading />}><Live /></Suspense>;
}

type Tab = "live" | "tables" | "ko" | "plan" | "stats";

function Live() {
  const params = useSearchParams();
  const id = params.get("t") ?? "";
  const tv = params.get("tv") === "1";
  const [snap, setSnap] = useState<LiveSnapshot | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<Tab>("live");
  const [, tick] = useState(0);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    const load = () => fetchLive(id).then((d) => { if (alive) { if (d) setSnap(d); setLoaded(true); } });
    load();
    const unsub = subscribeLive(id, (d) => setSnap(d));
    const poll = setInterval(load, 15000); // Sicherheitsnetz, falls Echtzeit kurz ausfällt
    const clock = setInterval(() => tick((x) => x + 1), 5000);
    const onVis = () => { if (document.visibilityState === "visible") load(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { alive = false; unsub(); clearInterval(poll); clearInterval(clock); document.removeEventListener("visibilitychange", onVis); };
  }, [id]);

  const t = snap?.tournament as Tournament | undefined;
  const players = (snap?.players ?? {}) as Record<string, Player>;
  const matches = useMemo(() => snap?.matches ?? {}, [snap]);
  const active = t?.activeMatchId ? matches[t.activeMatchId] : undefined;
  const activeRunning = active && !active.finishedAt && !computeMatch(active.setup, active.visits).finished ? active : undefined;
  const activeLabel = activeRunning && t ? [...groupFixtures(t), ...koFixtures(t)].find((f) => f.key === activeRunning.fixtureKey)?.label : undefined;

  // TV: Ansicht automatisch wechseln
  const [tvPane, setTvPane] = useState(0);
  useEffect(() => {
    if (!tv) return;
    const i = setInterval(() => setTvPane((x) => x + 1), 15000);
    return () => clearInterval(i);
  }, [tv]);

  if (!liveEnabled()) return <Center>Die Live-Ansicht ist noch nicht eingerichtet.</Center>;
  if (!id) return <Center>Kein Turnier angegeben.</Center>;
  if (!loaded) return <Loading />;
  if (!t) return <Center>Dieses Turnier ist (noch) nicht live. Bitte QR-Code erneut scannen.</Center>;

  const ago = snap ? Math.max(0, Math.round((Date.now() - snap.publishedAt) / 1000)) : 0;
  const header = (
    <header className="flex items-center gap-3 py-3">
      {t.logo ? <img src={t.logo} alt="" className={cx("rounded-lg object-contain", tv ? "h-16 w-16" : "h-10 w-10")} /> : null}
      <div className="min-w-0 flex-1">
        <div className={cx("truncate font-display font-bold uppercase", tv ? "text-5xl" : "text-2xl")}>{t.name}</div>
        <div className="text-xs text-muted">Aktualisiert {ago < 10 ? "gerade eben" : ago < 60 ? `vor ${ago} s` : `vor ${Math.round(ago / 60)} min`}</div>
      </div>
      <Wordmark className={tv ? "text-4xl" : "text-2xl"} />
    </header>
  );

  if (tv) {
    const panes = [
      t.groups.length && t.status === "groups" ? <GroupTables key="g" t={t} players={players} compact /> : null,
      t.koSlots ? <Bracket key="k" t={t} players={players} /> : null,
      <NextUp key="n" t={t} players={players} exclude={activeRunning?.fixtureKey} />,
    ].filter(Boolean);
    return (
      <div className="min-h-dvh px-8 pb-8">
        {header}
        {t.status === "done" && <div className="mb-6"><Ceremony t={t} players={players} /></div>}
        <div className={cx("grid gap-8", activeRunning && "grid-cols-[1.2fr_1fr]")}>
          {activeRunning && <LiveMatch m={activeRunning} label={activeLabel} big />}
          <div className="min-w-0 text-lg">{panes[tvPane % panes.length]}</div>
        </div>
      </div>
    );
  }

  const tabs: { value: Tab; label: string }[] = [
    { value: "live", label: "Live" },
    ...(t.groups.length ? [{ value: "tables" as Tab, label: "Tabellen" }] : []),
    ...(t.koSlots ? [{ value: "ko" as Tab, label: "KO-Baum" }] : []),
    { value: "plan", label: "Spielplan" },
    { value: "stats", label: "Statistik" },
  ];

  return (
    <div className="mx-auto min-h-dvh max-w-4xl px-3 pb-12">
      {header}
      <div className="sticky top-0 z-10 -mx-3 mb-4 overflow-x-auto bg-bg/90 px-3 py-2 backdrop-blur">
        <Segmented value={tab} options={tabs} onChange={setTab} />
      </div>
      {tab === "live" && (
        <div className="space-y-4">
          {t.status === "done" && <Ceremony t={t} players={players} />}
          {activeRunning ? <LiveMatch m={activeRunning} label={activeLabel} /> : t.status !== "done" && (
            <div className="rounded-2xl border border-dashed border-line p-6 text-center text-muted">Gerade läuft kein Match.</div>
          )}
          <NextUp t={t} players={players} exclude={activeRunning?.fixtureKey} />
        </div>
      )}
      {tab === "tables" && <GroupTables t={t} players={players} compact />}
      {tab === "ko" && <Bracket t={t} players={players} />}
      {tab === "plan" && <Results t={t} players={players} />}
      {tab === "stats" && <TournamentStats t={t} players={players} matches={matches} />}
    </div>
  );
}

function NextUp({ t, players, exclude }: { t: Tournament; players: Record<string, Player>; exclude?: string }) {
  const next = upcomingFixtures(t).filter((f) => f.key !== exclude).slice(0, 5);
  if (!next.length) return null;
  return (
    <section>
      <h3 className="mb-2 font-display text-lg uppercase tracking-wide text-muted">Als Nächstes</h3>
      <div className="space-y-2">
        {next.map((f, i) => (
          <div key={f.key} className={cx("flex items-center gap-3 rounded-xl border px-3 py-2.5", i === 0 ? "border-pink/60 bg-pink/10" : "border-line bg-surface")}>
            <span className="w-20 shrink-0 text-xs uppercase text-muted">{f.label}</span>
            <span className="min-w-0 flex-1 truncate font-display text-lg uppercase">{displayName(players[f.a!])} <span className="text-sm text-muted">vs</span> {displayName(players[f.b!])}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function Results({ t, players }: { t: Tournament; players: Record<string, Player> }) {
  const all = [...groupFixtures(t), ...koFixtures(t)];
  const done = all.filter((f) => f.result).reverse();
  return (
    <div className="space-y-6">
      <NextUp t={t} players={players} />
      <section>
        <h3 className="mb-2 font-display text-lg uppercase tracking-wide text-muted">Ergebnisse</h3>
        {done.length === 0 && <p className="text-muted">Noch keine Ergebnisse.</p>}
        <div className="space-y-2">
          {done.map((f) => (
            <div key={f.key} className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2.5">
              <span className="w-16 shrink-0 text-[0.65rem] uppercase text-muted">{f.label}</span>
              <span className={cx("min-w-0 flex-1 truncate text-right font-display text-lg uppercase", f.result!.winner === f.a && "text-pink")}>{displayName(players[f.a!])}</span>
              <span className="w-14 shrink-0 text-center font-display text-xl font-bold tabular">{scoreLine(f.result!, f.a!)}</span>
              <span className={cx("min-w-0 flex-1 truncate font-display text-lg uppercase", f.result!.winner === f.b && "text-pink")}>{displayName(players[f.b!])}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="grid min-h-dvh place-items-center p-6 text-center"><div><Wordmark className="mb-6 block text-5xl" /><p className="text-muted">{children}</p></div></div>;
}
