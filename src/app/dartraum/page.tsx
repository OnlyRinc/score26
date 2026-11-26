"use client";
import { Suspense, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { emptyProfile, useHydrated, useStore } from "@/lib/store/store";
import { displayName, koRounds } from "@/lib/store/tournamentHelpers";
import { ACHIEVEMENTS, computeEarnings, unlockedAchievements } from "@/lib/dartraum/economy";
import {
  BARRELS, BARREL_FINISH, BEARDS, FLIGHT_DESIGNS, FLIGHT_SHAPES, GLASSES, GRIPS, HAIR_COLORS, HAIR_STYLES, HATS,
  JERSEY_COLORS, JERSEY_DESIGNS, PANTS, ROOM_LEVELS, SANDBOX, SHAFT_LENGTHS, SHOES, SKIN_TONES,
  normalizeLook, type DartSetup, type Jersey, type Look,
} from "@/lib/dartraum/catalog";
import { Figure, FigureCard } from "@/components/dartraum/Figure";
import { DartImage } from "@/components/dartraum/Dart";
import dynamic from "next/dynamic";
const Figure3DLazy = dynamic(() => import("@/components/dartraum/Figure3D").then((m) => m.Figure3D), { ssr: false, loading: () => <div className="h-[340px]" /> });
const Room3D = dynamic(() => import("@/components/dartraum/Room3D").then((m) => m.Room3D), { ssr: false, loading: () => <div className="grid aspect-[4/3] place-items-center rounded-3xl border border-line text-muted sm:aspect-[16/10]">3D-Raum wird geladen …</div> });
import { Button, Card, Empty, Loading, Page, PageHeader, Segmented, cx, inputCls } from "@/components/ui";

export default function DartraumPage() {
  return <Suspense fallback={<Loading />}><Dartraum /></Suspense>;
}

function useEconomy(pid: string | null) {
  const matches = useStore((s) => s.matches);
  const tournaments = useStore((s) => s.tournaments);
  const trainings = useStore((s) => s.trainings);
  return useMemo(() => (pid ? computeEarnings(pid, { matches, tournaments, trainings }, koRounds) : null), [pid, matches, tournaments, trainings]);
}

function useLook(pid: string): Look {
  const raw = useStore((s) => s.dartraum[pid]?.look);
  return useMemo(() => normalizeLook(raw), [raw]);
}

function Coins({ value, className = "" }: { value: number; className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-1.5 rounded-full border border-[#e8c25a]/40 bg-[#e8c25a]/10 px-3 py-1 font-display font-semibold tabular text-[#f3d77f]", className)}>
      <span className="grid h-5 w-5 place-items-center rounded-full bg-gradient-to-br from-[#fff1b8] via-[#e8c25a] to-[#a87b1c] text-[10px] font-bold text-[#5a3d00]">C</span>
      {value.toLocaleString("de-DE")}
    </span>
  );
}

function SandboxBanner() {
  if (!SANDBOX) return null;
  return (
    <div className="mb-5 flex items-center gap-3 rounded-2xl border border-cyan/40 bg-cyan/10 px-4 py-3 text-sm">
      <span className="text-2xl">🧪</span>
      <span><b className="text-cyan">Testmodus:</b> Alles ist frei wählbar, auch Raumstufen. Coins werden gezählt, aber noch nicht abgezogen.</span>
    </div>
  );
}

function Dartraum() {
  const hydrated = useHydrated();
  const pid = useSearchParams().get("p");
  const players = useStore((s) => s.players);
  if (!hydrated) return <Loading />;
  if (!pid || !players[pid]) return <PlayerPick />;
  return <Profile pid={pid} />;
}

function PlayerPick() {
  const players = useStore((s) => s.players);
  const dartraum = useStore((s) => s.dartraum);
  const list = Object.values(players).sort((a, b) => displayName(a).localeCompare(displayName(b)));
  return (
    <Page>
      <PageHeader title="Mein Dartraum" back="/" />
      <SandboxBanner />
      <p className="mb-5 text-muted">Stell dir deinen Spieler zusammen: Trikot mit deinem Namen, eigene Darts, Frisur und deinen eigenen Dartraum.</p>
      {list.length === 0 ? (
        <Empty>Lege zuerst unter <Link className="text-pink underline" href="/players/">Spieler</Link> einen Spieler an.</Empty>
      ) : (
        <div className="stagger grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {list.map((p) => (
            <Link key={p.id} href={`/dartraum/?p=${p.id}`} className="tile rounded-3xl border border-line bg-gradient-to-b from-pink-dark/25 to-surface p-3 text-center">
              <FigureCard look={normalizeLook(dartraum[p.id]?.look)} name={displayName(p)} uid={`pp${p.id}`} size={160} className="mx-auto h-auto w-2/3" />
              <div className="mt-2 truncate font-display text-2xl uppercase">{displayName(p)}</div>
              <div className="text-xs uppercase tracking-widest text-muted">{ROOM_LEVELS[dartraum[p.id]?.room ?? 0].name}</div>
            </Link>
          ))}
        </div>
      )}
    </Page>
  );
}

type Tab = "room" | "wardrobe" | "achievements" | "coins";

function Profile({ pid }: { pid: string }) {
  const router = useRouter();
  const player = useStore((s) => s.players[pid]);
  const profile = useStore((s) => s.dartraum[pid]) ?? emptyProfile();
  const look = useLook(pid);
  const setRoom = useStore((s) => s.setRoom);
  const e = useEconomy(pid)!;
  const [tab, setTab] = useState<Tab>("room");
  const balance = e.total - profile.spent;
  const unlocked = unlockedAchievements(e.facts);
  const name = (look.backName || displayName(player)).toUpperCase();
  const lvl = ROOM_LEVELS[profile.room] ?? ROOM_LEVELS[0];

  return (
    <Page>
      <PageHeader title={<>Dartraum <span className="text-pink">· {displayName(player)}</span></>} back="/dartraum/" right={<Coins value={balance} />} />
      <SandboxBanner />
      <Segmented value={tab} onChange={setTab} size="lg" className="mb-5"
        options={[{ value: "room", label: "Raum" }, { value: "wardrobe", label: "Ausstatten" }, { value: "achievements", label: `Erfolge ${unlocked.size}/${ACHIEVEMENTS.length}` }, { value: "coins", label: "Coins" }]} />

      {tab === "room" && (
        <div className="space-y-4">
          <Room3D level={lvl.level} look={look} name={name} trophies={e.facts.tournamentsWon.length} medals={unlocked.size} />
          <Card>
            <div className="mb-3 text-xs uppercase tracking-widest text-muted">Raumstufe wählen</div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {ROOM_LEVELS.map((r) => (
                <button key={r.level} onClick={() => setRoom(pid, r.level)}
                  className={cx("rounded-xl border px-3 py-2 text-left transition active:scale-95", r.level === lvl.level ? "border-pink bg-pink/15" : "border-line bg-surface-2/60")}>
                  <div className="text-[10px] uppercase tracking-widest text-muted">Stufe {r.level + 1}</div>
                  <div className="font-display text-lg uppercase leading-tight">{r.name}</div>
                  {r.price > 0 && <div className="text-xs text-[#f3d77f]/70">später {r.price.toLocaleString("de-DE")} C</div>}
                </button>
              ))}
            </div>
            <p className="mt-3 text-sm text-muted">{lvl.desc}</p>
          </Card>
          <p className="text-sm text-muted">Dein Spieler wirft von selbst, holt die Pfeile, setzt sich auf die Couch oder holt sich was an der Bar. Im Regal stehen deine echten Turniersiege als Pokale und eine Medaille pro Erfolg.</p>
        </div>
      )}

      {tab === "wardrobe" && <Wardrobe pid={pid} look={look} defaultName={displayName(player)} />}

      {tab === "achievements" && (
        <div className="stagger grid gap-3 sm:grid-cols-2">
          {ACHIEVEMENTS.map((a) => {
            const p = a.progress(e.facts);
            const done = p >= 1;
            return (
              <div key={a.id} className={cx("rounded-2xl border p-4", done ? "border-[#e8c25a]/50 bg-gradient-to-br from-[#e8c25a]/15 to-surface" : "border-line bg-surface/80")}>
                <div className="flex items-center gap-3">
                  <span className={cx("grid h-11 w-11 shrink-0 place-items-center rounded-full text-xl", done ? "bg-gradient-to-br from-[#fff1b8] via-[#e8c25a] to-[#a87b1c]" : "bg-surface-2 grayscale")}>🏅</span>
                  <div className="min-w-0">
                    <div className="font-display text-xl uppercase">{a.name}</div>
                    <div className="text-sm text-muted">{a.desc}</div>
                  </div>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2">
                  <div className="h-full rounded-full bg-gradient-to-r from-pink to-cyan transition-all duration-700" style={{ width: `${Math.round(p * 100)}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === "coins" && (
        <Card>
          <table className="w-full">
            <thead><tr className="text-left text-xs uppercase tracking-widest text-muted"><th className="py-2">Wofür</th><th className="py-2 text-right">Anzahl</th><th className="py-2 text-right">Coins</th></tr></thead>
            <tbody className="divide-y divide-line">
              {e.lines.map((l) => (
                <tr key={l.key} className={l.count ? "" : "text-muted"}>
                  <td className="py-2">{l.label}</td><td className="py-2 text-right tabular">{l.count}</td><td className="py-2 text-right font-semibold tabular">{l.coins.toLocaleString("de-DE")}</td>
                </tr>
              ))}
              <tr><td className="pt-3 font-semibold">Verdient</td><td /><td className="pt-3 text-right font-semibold tabular">{e.total.toLocaleString("de-DE")}</td></tr>
              <tr><td className="py-2 font-display text-xl uppercase">Kontostand</td><td /><td className="py-2 text-right"><Coins value={balance} /></td></tr>
            </tbody>
          </table>
          <p className="mt-3 text-xs text-muted">Coins zählen nur für beendete Matches und Trainings. Im Testmodus wird beim Ausprobieren nichts abgezogen.</p>
        </Card>
      )}
      <div className="mt-6"><Button variant="ghost" onClick={() => router.push("/dartraum/")}>‹ Anderer Spieler</Button></div>
    </Page>
  );
}

// ---------------- Kleiderschrank ----------------

type WTab = "jersey" | "outfit" | "head" | "darts";

function Section({ title, children, hint }: { title: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="mb-5">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <div className="text-xs uppercase tracking-widest text-muted">{title}</div>
        {hint && <div className="text-xs text-muted">{hint}</div>}
      </div>
      {children}
    </div>
  );
}

function Swatches({ colors, value, onPick, label }: { colors: { hex: string; name: string }[]; value: string; onPick: (hex: string) => void; label: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {colors.map((c) => (
        <button key={c.hex} title={c.name} aria-label={`${label} ${c.name}`} onClick={() => onPick(c.hex)}
          className={cx("h-9 w-9 rounded-full border-2 shadow-inner transition active:scale-90", value.toLowerCase() === c.hex.toLowerCase() ? "border-pink ring-2 ring-pink/40" : "border-white/15")}
          style={{ background: c.hex }} />
      ))}
    </div>
  );
}

function Chips<T extends string>({ items, value, onPick, render }: { items: readonly { id: T; name: string; price?: number }[]; value: string; onPick: (id: T) => void; render?: (id: T) => ReactNode }) {
  return (
    <div className={cx("grid gap-2", render ? "grid-cols-2 sm:grid-cols-3 xl:grid-cols-4" : "grid-cols-2 sm:grid-cols-3 xl:grid-cols-4")}>
      {items.map((it) => (
        <button key={it.id} onClick={() => onPick(it.id)}
          className={cx("rounded-xl border p-2 text-left transition active:scale-95", value === it.id ? "border-pink bg-pink/15" : "border-line bg-surface-2/60 hover:border-white/30")}>
          {render && <div className="mb-1">{render(it.id)}</div>}
          <div className="truncate font-display text-base uppercase leading-tight">{it.name}</div>
          {!!it.price && <div className="text-[11px] text-[#f3d77f]/70">später {it.price} C</div>}
        </button>
      ))}
    </div>
  );
}

/** Nur der Kopf einer Figur (für Frisur, Bart, Brille, Kopf) */
function HeadCard({ look, uid }: { look: Look; uid: string }) {
  return (
    <svg viewBox="-19 -122 38 46" className="mx-auto h-20 w-20" role="img" aria-label="Kopf">
      <Figure look={look} uid={uid} holdDart={false} />
    </svg>
  );
}

const named = (list: readonly string[], prefix: string) => list.map((hex, i) => ({ hex, name: `${prefix} ${i + 1}` }));

function Wardrobe({ pid, look, defaultName }: { pid: string; look: Look; defaultName: string }) {
  const setLook = useStore((s) => s.setLook);
  const [tab, setTab] = useState<WTab>("jersey");
  const name = (look.backName || defaultName).toUpperCase();
  const set = (p: Partial<Look>) => setLook(pid, p);
  const setJersey = (p: Partial<Jersey>) => set({ jersey: { ...look.jersey, ...p } });
  const setDarts = (p: Partial<DartSetup>) => set({ darts: { ...look.darts, ...p } });

  return (
    <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
      <Card className="text-center lg:sticky lg:top-24 lg:self-start">
        <Figure3DLazy look={look} name={name} className="mx-auto h-[340px] w-full overflow-hidden rounded-2xl bg-[radial-gradient(ellipse_at_50%_35%,#2c2140_0%,#14101b_70%)]" />
        <div className="mt-3 rounded-xl bg-surface-2/60 p-2">
          <DartImage setup={look.darts} uid="wd" className="h-auto w-full" />
        </div>
        <Button variant="ghost" size="sm" className="mt-3" onClick={() => set(normalizeLook({ ...look, jersey: undefined, darts: undefined, hat: "none", glasses: "none" }))}>Trikot & Darts zurücksetzen</Button>
      </Card>

      <div>
        <Segmented value={tab} onChange={setTab} className="mb-4"
          options={[{ value: "jersey", label: "Trikot" }, { value: "outfit", label: "Hose & Schuhe" }, { value: "head", label: "Kopf & Gesicht" }, { value: "darts", label: "Darts" }]} />

        {tab === "jersey" && (
          <div key="jersey" className="fade-in">
            <Section title="Name auf dem Rücken" hint="wie bei echten Dart-Trikots">
              <input className={inputCls} maxLength={12} placeholder={defaultName.toUpperCase()} value={look.backName ?? ""}
                onChange={(ev) => set({ backName: ev.target.value.toUpperCase() })} />
            </Section>
            <Section title="Design">
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 xl:grid-cols-6">
                {JERSEY_DESIGNS.map((d) => (
                  <button key={d.id} onClick={() => setJersey(d.tag === "Club26" ? { design: d.id, primary: "#0e0e12", secondary: "#d63ce0", accent: "#5fe3f0" } : { design: d.id })}
                    className={cx("relative rounded-xl border p-1.5 transition active:scale-95", look.jersey.design === d.id ? "border-pink bg-pink/15" : "border-line bg-surface-2/60")}>
                    {d.tag && <span className="absolute left-1 top-1 z-10 rounded-full bg-pink px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">Club26</span>}
                    <svg viewBox="-24 -86 48 46" className="h-auto w-full" role="img" aria-label={d.name}>
                      <Figure look={{ ...look, jersey: { ...look.jersey, design: d.id } }} uid={`jd${d.id}`} holdDart={false} />
                    </svg>
                    <div className="truncate font-display text-sm uppercase">{d.name}</div>
                    {!!d.price && <div className="text-[10px] text-[#f3d77f]/70">später {d.price} C</div>}
                  </button>
                ))}
              </div>
            </Section>
            <Section title="Hauptfarbe"><Swatches label="Hauptfarbe" colors={JERSEY_COLORS} value={look.jersey.primary} onPick={(primary) => setJersey({ primary })} /></Section>
            <Section title="Zweitfarbe"><Swatches label="Zweitfarbe" colors={JERSEY_COLORS} value={look.jersey.secondary} onPick={(secondary) => setJersey({ secondary })} /></Section>
            <Section title="Akzentfarbe"><Swatches label="Akzentfarbe" colors={JERSEY_COLORS} value={look.jersey.accent} onPick={(accent) => setJersey({ accent })} /></Section>
            <div className="grid gap-4 sm:grid-cols-2">
              <Section title="Kragen">
                <Segmented value={look.jersey.collar} onChange={(collar) => setJersey({ collar })} options={[{ value: "polo", label: "Polo" }, { value: "vneck", label: "V-Ausschnitt" }]} />
              </Section>
              <Section title="Sponsoren-Patches">
                <Segmented value={look.jersey.sponsors ? "on" : "off"} onChange={(v) => setJersey({ sponsors: v === "on" })} options={[{ value: "on", label: "Mit" }, { value: "off", label: "Ohne" }]} />
              </Section>
            </div>
          </div>
        )}

        {tab === "outfit" && (
          <div key="outfit" className="fade-in">
            <Section title="Hose"><Chips items={PANTS} value={look.pants} onPick={(pants) => set({ pants })} render={(id) => <span className="block h-6 rounded-md" style={{ background: PANTS.find((p) => p.id === id)!.color }} />} /></Section>
            <Section title="Schuhe"><Chips items={SHOES} value={look.shoes} onPick={(shoes) => set({ shoes })} render={(id) => { const s = SHOES.find((x) => x.id === id)!; return <span className="flex h-6 overflow-hidden rounded-md"><span className="flex-[3]" style={{ background: s.upper }} /><span className="flex-1" style={{ background: s.accent }} /><span className="flex-1" style={{ background: s.sole }} /></span>; }} /></Section>
          </div>
        )}

        {tab === "head" && (
          <div key="head" className="fade-in">
            <Section title="Hautfarbe"><Swatches label="Hautfarbe" colors={named(SKIN_TONES, "Ton")} value={SKIN_TONES[look.skin]} onPick={(hex) => set({ skin: SKIN_TONES.indexOf(hex) })} /></Section>
            <Section title="Haarfarbe"><Swatches label="Haarfarbe" colors={named(HAIR_COLORS, "Farbe")} value={HAIR_COLORS[look.hairColor]} onPick={(hex) => set({ hairColor: HAIR_COLORS.indexOf(hex) })} /></Section>
            <Section title="Frisur" hint="kostenlos"><Chips items={HAIR_STYLES} value={look.hair} onPick={(hair) => set({ hair })} /></Section>
            <Section title="Bart" hint="kostenlos"><Chips items={BEARDS} value={look.beard} onPick={(beard) => set({ beard })} /></Section>
            <Section title="Brille" hint="kostenlos"><Chips items={GLASSES} value={look.glasses} onPick={(glasses) => set({ glasses })} render={(id) => <HeadCard look={{ ...look, glasses: id }} uid={`g${id}`} />} /></Section>
            <Section title="Kopfbedeckung"><Chips items={HATS} value={look.hat} onPick={(hat) => set({ hat })} render={(id) => <HeadCard look={{ ...look, hat: id }} uid={`k${id}`} />} /></Section>
            {look.hat !== "none" && look.hat !== "crown" && (
              <Section title="Farbe der Kopfbedeckung"><Swatches label="Mützenfarbe" colors={JERSEY_COLORS} value={look.hatColor} onPick={(hatColor) => set({ hatColor })} /></Section>
            )}
          </div>
        )}

        {tab === "darts" && (
          <div key="darts" className="fade-in">
            <p className="mb-4 text-sm text-muted">Bau dir deinen Pfeil aus Barrel, Schaft und Flight, so wie im Dartshop.</p>
            <Section title="Barrel-Form">
              <Chips items={BARRELS} value={look.darts.barrel} onPick={(barrel) => setDarts({ barrel })}
                render={(id) => <DartImage setup={{ ...look.darts, barrel: id }} uid={`db${id}`} className="h-auto w-full" />} />
              <p className="mt-2 text-xs text-muted">{BARRELS.find((b) => b.id === look.darts.barrel)?.desc}</p>
            </Section>
            <Section title="Griff"><Chips items={GRIPS} value={look.darts.grip} onPick={(grip) => setDarts({ grip })} /></Section>
            <Section title="Beschichtung">
              <div className="flex flex-wrap gap-2">
                {BARREL_FINISH.map((f) => (
                  <button key={f.id} onClick={() => setDarts({ finish: f.id })}
                    className={cx("flex items-center gap-2 rounded-xl border px-3 py-2 transition active:scale-95", look.darts.finish === f.id ? "border-pink bg-pink/15" : "border-line bg-surface-2/60")}>
                    <span className="h-5 w-5 rounded-full" style={{ background: f.id === "rainbow" ? "linear-gradient(135deg,#ff5fd2,#ffd23f,#5fe3f0,#8a7bff)" : `linear-gradient(180deg,${f.dark},${f.light} 35%,${f.mid} 60%,${f.dark})` }} />
                    <span className="font-display uppercase">{f.name}</span>
                  </button>
                ))}
              </div>
            </Section>
            <Section title="Schaftlänge"><Segmented value={look.darts.shaft} onChange={(shaft) => setDarts({ shaft })} options={SHAFT_LENGTHS.map((s) => ({ value: s.id as string, label: s.name }))} /></Section>
            <Section title="Schaftfarbe"><Swatches label="Schaftfarbe" colors={JERSEY_COLORS} value={look.darts.shaftColor} onPick={(shaftColor) => setDarts({ shaftColor })} /></Section>
            <Section title="Flight-Form">
              <Chips items={FLIGHT_SHAPES} value={look.darts.flight} onPick={(flight) => setDarts({ flight })}
                render={(id) => <DartImage setup={{ ...look.darts, flight: id }} uid={`df${id}`} className="h-auto w-full" />} />
            </Section>
            <Section title="Flight-Motiv">
              <Chips items={FLIGHT_DESIGNS} value={look.darts.flightDesign} onPick={(flightDesign) => setDarts({ flightDesign })}
                render={(id) => <DartImage setup={{ ...look.darts, flightDesign: id }} uid={`dm${id}`} className="h-auto w-full" />} />
            </Section>
            <Section title="Flight-Farbe"><Swatches label="Flight-Farbe" colors={JERSEY_COLORS} value={look.darts.flightColor} onPick={(flightColor) => setDarts({ flightColor })} /></Section>
            <Section title="Flight-Zweitfarbe"><Swatches label="Flight-Zweitfarbe" colors={JERSEY_COLORS} value={look.darts.flightColor2} onPick={(flightColor2) => setDarts({ flightColor2 })} /></Section>
          </div>
        )}
      </div>
    </div>
  );
}
