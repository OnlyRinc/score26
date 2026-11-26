"use client";
import Link from "next/link";
import { computeMatch } from "@/lib/game";
import { useHydrated, useStore } from "@/lib/store/store";
import { Loading, Page, Wordmark } from "@/components/ui";

export default function Home() {
  const hydrated = useHydrated();
  const matches = useStore((s) => s.matches);
  const tournaments = useStore((s) => s.tournaments);
  const deleteMatch = useStore((s) => s.deleteMatch);
  if (!hydrated) return <Loading />;

  const running = Object.values(matches)
    .filter((m) => !m.finishedAt && m.visits.length > 0 && !computeMatch(m.setup, m.visits).finished)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 4);
  const activeTournaments = Object.values(tournaments).filter((t) => t.status !== "done").sort((a, b) => b.createdAt - a.createdAt);

  const tiles = [
    { href: "/play/", title: "Neues Spiel", sub: "Schnell ein Match zählen", accent: "from-pink/30" },
    { href: "/tournaments/", title: "Turniere", sub: "Gruppen, KO-Baum, Spielplan", accent: "from-cyan/20" },
    { href: "/players/", title: "Spieler", sub: "Anlegen und verwalten", accent: "from-sage/30" },
  ];

  return (
    <Page className="pt-10">
      <div className="mb-10 text-center">
        <Wordmark className="text-7xl sm:text-8xl" />
        <p className="mt-3 font-display text-lg uppercase tracking-[0.3em] text-muted">Dart Counter</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {tiles.map((t) => (
          <Link key={t.href} href={t.href} className={`rounded-3xl border border-line bg-gradient-to-br ${t.accent} to-surface p-6 transition-transform active:scale-[0.98]`}>
            <div className="font-display text-3xl font-semibold uppercase">{t.title}</div>
            <div className="mt-1 text-muted">{t.sub}</div>
          </Link>
        ))}
      </div>

      {activeTournaments.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 font-display text-xl uppercase tracking-wide text-muted">Laufende Turniere</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {activeTournaments.map((t) => (
              <Link key={t.id} href={`/tournament/?id=${t.id}`} className="rounded-2xl border border-line bg-surface p-4 active:scale-[0.99]">
                <div className="font-display text-2xl uppercase">{t.name}</div>
                <div className="text-sm text-muted">{t.date} · {t.playerIds.length} Spieler</div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {running.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 font-display text-xl uppercase tracking-wide text-muted">Weiterspielen</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {running.map((m) => {
              const st = computeMatch(m.setup, m.visits);
              return (
                <div key={m.id} className="flex items-center gap-2 rounded-2xl border border-line bg-surface p-2 pl-4">
                  <Link href={`/match/?id=${m.id}`} className="min-w-0 flex-1 py-2">
                    <div className="truncate font-display text-xl uppercase">{m.setup.players.map((p) => p.nickname).join(" vs ")}</div>
                    <div className="text-sm text-muted tabular">
                      {st.isSetPlay ? `Sets ${st.players.map((p) => p.sets).join(":")} · ` : ""}Legs {st.players.map((p) => p.legs).join(":")}
                    </div>
                  </Link>
                  {!m.tournamentId && (
                    <button aria-label="Match verwerfen" onClick={() => { if (confirm("Dieses Match verwerfen?")) deleteMatch(m.id); }}
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-lg text-muted active:bg-live/30">🗑</button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </Page>
  );
}
