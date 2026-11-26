"use client";
import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { emptyProfile, useHydrated, useStore } from "@/lib/store/store";
import { displayName, koRounds } from "@/lib/store/tournamentHelpers";
import { ACHIEVEMENTS, computeEarnings, unlockedAchievements } from "@/lib/dartraum/economy";
import {
  HAIR_COLORS, ITEMS, ROOM_LEVELS, SKIN_TONES, SLOT_LABEL, freeItems, type Item, type Look, type Slot,
} from "@/lib/dartraum/catalog";
import { FigureCard } from "@/components/dartraum/Figure";
import { Room } from "@/components/dartraum/Room";
import { Button, Card, Empty, Loading, Page, PageHeader, Segmented, cx, inputCls } from "@/components/ui";
import { soundTon } from "@/lib/sound/effects";

export default function DartraumPage() {
  return <Suspense fallback={<Loading />}><Dartraum /></Suspense>;
}

function useEconomy(pid: string | null) {
  const matches = useStore((s) => s.matches);
  const tournaments = useStore((s) => s.tournaments);
  const trainings = useStore((s) => s.trainings);
  return useMemo(() => (pid ? computeEarnings(pid, { matches, tournaments, trainings }, koRounds) : null), [pid, matches, tournaments, trainings]);
}

function Coins({ value, className = "" }: { value: number; className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-1.5 rounded-full border border-[#e8c25a]/40 bg-[#e8c25a]/10 px-3 py-1 font-display font-semibold tabular text-[#f3d77f]", className)}>
      <span className="grid h-5 w-5 place-items-center rounded-full bg-gradient-to-br from-[#fff1b8] via-[#e8c25a] to-[#a87b1c] text-[10px] font-bold text-[#5a3d00]">C</span>
      {value.toLocaleString("de-DE")}
    </span>
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
      <p className="mb-5 text-muted">Sammle Coins mit Matches, Turnieren, 180ern, High Finishes und Training. Damit kleidest du deinen Spieler ein und baust deinen Dartraum aus.</p>
      {list.length === 0 ? (
        <Empty>Lege zuerst unter <Link className="text-pink underline" href="/players/">Spieler</Link> einen Spieler an.</Empty>
      ) : (
        <div className="stagger grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {list.map((p) => (
            <Link key={p.id} href={`/dartraum/?p=${p.id}`} className="tile rounded-3xl border border-line bg-gradient-to-b from-pink-dark/25 to-surface p-3 text-center">
              <FigureCard look={(dartraum[p.id] ?? emptyProfile()).look} size={160} className="mx-auto h-auto w-2/3" />
              <div className="mt-2 truncate font-display text-2xl uppercase">{displayName(p)}</div>
              <PlayerCoins pid={p.id} />
            </Link>
          ))}
        </div>
      )}
    </Page>
  );
}

function PlayerCoins({ pid }: { pid: string }) {
  const e = useEconomy(pid);
  const spent = useStore((s) => s.dartraum[pid]?.spent ?? 0);
  return <Coins value={(e?.total ?? 0) - spent} className="mt-1 text-sm" />;
}

type Tab = "room" | "wardrobe" | "achievements" | "coins";

function Profile({ pid }: { pid: string }) {
  const router = useRouter();
  const player = useStore((s) => s.players[pid]);
  const profile = useStore((s) => s.dartraum[pid]) ?? emptyProfile();
  const sounds = useStore((s) => s.settings.sounds !== false);
  const buyRoom = useStore((s) => s.buyRoom);
  const e = useEconomy(pid)!;
  const [tab, setTab] = useState<Tab>("room");
  const balance = e.total - profile.spent;
  const unlocked = unlockedAchievements(e.facts);
  const next = ROOM_LEVELS[profile.room + 1];

  return (
    <Page>
      <PageHeader title={<>Dartraum <span className="text-pink">· {displayName(player)}</span></>} back="/dartraum/" right={<Coins value={balance} />} />
      <Segmented value={tab} onChange={setTab} size="lg" className="mb-5"
        options={[{ value: "room", label: "Raum" }, { value: "wardrobe", label: "Kleiderschrank" }, { value: "achievements", label: `Erfolge ${unlocked.size}/${ACHIEVEMENTS.length}` }, { value: "coins", label: "Coins" }]} />

      {tab === "room" && (
        <div className="space-y-4">
          <Room level={profile.room} look={profile.look} trophies={e.facts.tournamentsWon} medals={unlocked.size} />
          <Card className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <div className="text-xs uppercase tracking-widest text-muted">Stufe {profile.room + 1} von {ROOM_LEVELS.length}</div>
              <div className="font-display text-3xl uppercase">{ROOM_LEVELS[profile.room].name}</div>
              {next && <div className="text-sm text-muted">Als Nächstes: <span className="text-white">{next.name}</span>. {next.desc}</div>}
              {!next && <div className="text-sm text-cyan">Voll ausgebaut. Respekt!</div>}
            </div>
            {next && (
              <Button variant="primary" size="lg" className="w-full sm:w-auto" disabled={balance < next.price}
                onClick={() => { buyRoom(pid, next.level, next.price); if (sounds) soundTon(); }}>
                Ausbauen · {next.price.toLocaleString("de-DE")} C
              </Button>
            )}
          </Card>
          <p className="text-sm text-muted">Im Regal stehen deine echten Turniersiege als Pokale und eine Medaille für jeden Erfolg.</p>
        </div>
      )}

      {tab === "wardrobe" && <Wardrobe pid={pid} balance={balance} unlocked={unlocked} />}

      {tab === "achievements" && (
        <div className="stagger grid gap-3 sm:grid-cols-2">
          {ACHIEVEMENTS.map((a) => {
            const p = a.progress(e.facts);
            const done = p >= 1;
            const reward = ITEMS.find((i) => i.achievement === a.id);
            return (
              <div key={a.id} className={cx("rounded-2xl border p-4", done ? "border-[#e8c25a]/50 bg-gradient-to-br from-[#e8c25a]/15 to-surface" : "border-line bg-surface/80")}>
                <div className="flex items-center gap-3">
                  <span className={cx("grid h-11 w-11 shrink-0 place-items-center rounded-full text-xl", done ? "bg-gradient-to-br from-[#fff1b8] via-[#e8c25a] to-[#a87b1c]" : "bg-surface-2 grayscale")}>🏅</span>
                  <div className="min-w-0">
                    <div className="font-display text-xl uppercase">{a.name}</div>
                    <div className="text-sm text-muted">{a.desc}{reward ? <> · Belohnung: <span className="text-pink">{reward.name}</span></> : null}</div>
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
              <tr><td className="py-1 text-muted">Ausgegeben</td><td /><td className="py-1 text-right tabular text-muted">−{profile.spent.toLocaleString("de-DE")}</td></tr>
              <tr><td className="py-2 font-display text-xl uppercase">Kontostand</td><td /><td className="py-2 text-right"><Coins value={balance} /></td></tr>
            </tbody>
          </table>
          <p className="mt-3 text-xs text-muted">Coins zählen nur für beendete Matches und Trainings. Wird ein Match gelöscht, verschwinden auch seine Coins.</p>
        </Card>
      )}
      <div className="mt-6"><Button variant="ghost" onClick={() => router.push("/dartraum/")}>‹ Anderer Spieler</Button></div>
    </Page>
  );
}

const SLOTS: Slot[] = ["shirt", "hair", "beard", "glasses", "hat", "darts"];

function Wardrobe({ pid, balance, unlocked }: { pid: string; balance: number; unlocked: Set<string> }) {
  const profile = useStore((s) => s.dartraum[pid]) ?? emptyProfile();
  const setLook = useStore((s) => s.setLook);
  const buyItem = useStore((s) => s.buyItem);
  const sounds = useStore((s) => s.settings.sounds !== false);
  const [slot, setSlot] = useState<Slot>("shirt");
  const [preview, setPreview] = useState<Item | null>(null);
  const free = new Set(freeItems());
  const owns = (it: Item) => free.has(it.id) || profile.owned.includes(it.id) || (!!it.achievement && unlocked.has(it.achievement));
  const lookWith = (it: Item | null): Look => (it ? { ...profile.look, [it.slot]: it.id } : profile.look);
  const shown = lookWith(preview);
  const ach = (id?: string) => ACHIEVEMENTS.find((a) => a.id === id);

  const pick = (it: Item) => {
    if (owns(it)) { setLook(pid, { [it.slot]: it.id } as Partial<Look>); setPreview(null); }
    else setPreview(it);
  };
  const buy = (it: Item) => {
    buyItem(pid, it.id, it.price);
    setLook(pid, { [it.slot]: it.id } as Partial<Look>);
    setPreview(null);
    if (sounds) soundTon();
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <Card className="text-center lg:sticky lg:top-24 lg:self-start">
        <div className="flex justify-center gap-2">
          <FigureCard key={JSON.stringify(shown)} look={shown} size={150} className="animate-pop h-auto w-1/2 max-w-[150px]" />
          <FigureCard look={shown} size={150} view="back" className="h-auto w-1/2 max-w-[150px] opacity-80" />
        </div>
        {preview ? (
          <div className="mt-3 space-y-2">
            <div className="font-display text-2xl uppercase">{preview.name}</div>
            {preview.achievement ? (
              <div className="text-sm text-muted">Freischalten durch den Erfolg „{ach(preview.achievement)?.name}“: {ach(preview.achievement)?.desc}</div>
            ) : (
              <Button variant="primary" size="lg" className="w-full" disabled={balance < preview.price} onClick={() => buy(preview)}>
                {balance < preview.price ? `Noch ${(preview.price - balance).toLocaleString("de-DE")} C sammeln` : `Kaufen · ${preview.price} C`}
              </Button>
            )}
            <Button variant="ghost" className="w-full" onClick={() => setPreview(null)}>Zurück zu meinem Look</Button>
          </div>
        ) : (
          <div className="mt-4 space-y-3 text-left">
            <div>
              <div className="mb-1.5 text-xs uppercase tracking-widest text-muted">Hautfarbe</div>
              <div className="flex gap-2">{SKIN_TONES.map((c, i) => <button key={c} aria-label={`Hautfarbe ${i + 1}`} onClick={() => setLook(pid, { skin: i })} className={cx("h-9 w-9 rounded-full border-2 transition active:scale-90", profile.look.skin === i ? "border-pink" : "border-transparent")} style={{ background: c }} />)}</div>
            </div>
            <div>
              <div className="mb-1.5 text-xs uppercase tracking-widest text-muted">Haarfarbe</div>
              <div className="flex gap-2">{HAIR_COLORS.map((c, i) => <button key={c} aria-label={`Haarfarbe ${i + 1}`} onClick={() => setLook(pid, { hairColor: i })} className={cx("h-9 w-9 rounded-full border-2 transition active:scale-90", profile.look.hairColor === i ? "border-pink" : "border-transparent")} style={{ background: c }} />)}</div>
            </div>
            <div>
              <div className="mb-1.5 text-xs uppercase tracking-widest text-muted">Nummer auf dem Trikot</div>
              <input className={inputCls} maxLength={3} placeholder="z. B. 26" value={profile.look.number ?? ""} onChange={(ev) => setLook(pid, { number: ev.target.value.toUpperCase() })} />
            </div>
          </div>
        )}
      </Card>
      <div>
        <Segmented value={slot} onChange={(s) => { setSlot(s); setPreview(null); }} className="mb-4" options={SLOTS.map((s) => ({ value: s, label: SLOT_LABEL[s] }))} />
        <div className="stagger grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4" key={slot}>
          {ITEMS.filter((i) => i.slot === slot).map((it) => {
            const own = owns(it);
            const worn = profile.look[it.slot as keyof Look] === it.id;
            const locked = !!it.achievement && !own;
            return (
              <button key={it.id} onClick={() => pick(it)}
                className={cx("tile relative rounded-2xl border p-2 text-left", worn ? "border-pink bg-pink/15" : preview?.id === it.id ? "border-cyan bg-cyan/10" : "border-line bg-surface/80")}>
                {it.tag && <span className={cx("absolute left-2 top-2 z-10 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase", it.tag === "Club26" ? "bg-pink text-white" : "bg-[#e8c25a] text-[#3a2a00]")}>{it.tag}</span>}
                <FigureCard look={lookWith(it)} size={120} className={cx("mx-auto h-auto w-3/4", locked && "opacity-40 grayscale")} />
                <div className="mt-1 truncate font-display text-lg uppercase">{it.name}</div>
                <div className="text-sm">
                  {worn ? <span className="text-pink">Angezogen</span> : own ? <span className="text-cyan">Im Schrank</span> : locked ? <span className="text-muted">🔒 {ach(it.achievement)?.name}</span> : <span className="text-[#f3d77f]">{it.price} C</span>}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

