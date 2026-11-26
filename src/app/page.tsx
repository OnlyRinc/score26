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
    { href: "/play/", title: "Neues Spiel", sub: "Schnell ein Match zählen", icon: "🎯", accent: "from-pink/35", ring: "text-pink" },
    { href: "/tournaments/", title: "Turniere", sub: "Gruppen, KO-Baum, Spielplan", icon: "🏆", accent: "from-cyan/25", ring: "text-cyan" },
    { href: "/training/", title: "Training", sub: "121, 99 Darts, Bob's 27 …", icon: "💪", accent: "from-pink-dark/40", ring: "text-pink" },
    { href: "/dartraum/", title: "Mein Dartraum", sub: "Coins, Avatar, Raum ausbauen", icon: "🏠", accent: "from-[#e8c25a]/25", ring: "text-[#e8c25a]" },
    { href: "/players/", title: "Spieler", sub: "Anlegen und verwalten", icon: "👥", accent: "from-sage/35", ring: "text-sage" },
  ];

  return (
    <Page className="pt-8">
      <div className="relative mb-10 grid place-items-center py-10 text-center">
        <Board className="spin-slow pointer-events-none absolute h-72 w-72 opacity-25 sm:h-96 sm:w-96" />
        <div className="relative rise">
          <Wordmark className="neon-flicker text-7xl drop-shadow-[0_0_30px_rgba(214,60,224,0.35)] sm:text-9xl" />
          <p className="mt-3 font-display text-lg uppercase tracking-[0.4em] text-white/70">Dart Counter</p>
        </div>
      </div>

      <div className="stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((t) => (
          <Link key={t.href} href={t.href} className={`tile group overflow-hidden rounded-3xl border border-line bg-gradient-to-br ${t.accent} to-surface p-6`}>
            <div className="mb-6 flex items-start justify-between">
              <span className="grid h-14 w-14 place-items-center rounded-2xl border border-white/10 bg-black/30 text-3xl shadow-inner">{t.icon}</span>
              <span className={`text-2xl opacity-40 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100 ${t.ring}`}>→</span>
            </div>
            <div className="font-display text-3xl font-semibold uppercase leading-none">{t.title}</div>
            <div className="mt-2 text-sm text-white/60">{t.sub}</div>
          </Link>
        ))}
      </div>

      {activeTournaments.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 font-display text-xl uppercase tracking-wide text-muted">Laufende Turniere</h2>
          <div className="stagger grid gap-3 sm:grid-cols-2">
            {activeTournaments.map((t) => (
              <Link key={t.id} href={`/tournament/?id=${t.id}`} className="tile rounded-2xl border border-line bg-surface/90 p-4">
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
          <div className="stagger grid gap-3 sm:grid-cols-2">
            {running.map((m) => {
              const st = computeMatch(m.setup, m.visits);
              return (
                <div key={m.id} className="tile flex items-center gap-2 rounded-2xl border border-line bg-surface/90 p-2 pl-4">
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

/** Dekorative Dartscheibe (nur Linien) */
function Board({ className = "" }: { className?: string }) {
  const segs = Array.from({ length: 20 }, (_, i) => i * 18 - 9);
  return (
    <svg viewBox="-100 -100 200 200" className={className} aria-hidden>
      <defs>
        <linearGradient id="bd" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#d63ce0" /><stop offset="1" stopColor="#5fe3f0" />
        </linearGradient>
      </defs>
      <g fill="none" stroke="url(#bd)" strokeWidth="0.8">
        {[98, 90, 62, 56, 14, 6].map((r) => <circle key={r} r={r} />)}
        {segs.map((a) => {
          const rad = (a * Math.PI) / 180;
          return <line key={a} x1={Math.sin(rad) * 14} y1={-Math.cos(rad) * 14} x2={Math.sin(rad) * 90} y2={-Math.cos(rad) * 90} />;
        })}
      </g>
    </svg>
  );
}
