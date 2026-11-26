"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useHydrated, useStore } from "@/lib/store/store";
import { Button, Empty, Field, Loading, Modal, Page, PageHeader, inputCls } from "@/components/ui";

const STATUS: Record<string, string> = { setup: "Vorbereitung", groups: "Gruppenphase", ko: "KO-Runde", done: "Beendet" };

export default function TournamentsPage() {
  const hydrated = useHydrated();
  const router = useRouter();
  const tournaments = useStore((s) => s.tournaments);
  const createTournament = useStore((s) => s.createTournament);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("1. Kühl Open");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  if (!hydrated) return <Loading />;
  const list = Object.values(tournaments).sort((a, b) => b.createdAt - a.createdAt);
  return (
    <Page>
      <PageHeader title="Turniere" back="/" right={<Button variant="primary" onClick={() => setOpen(true)}>+ Turnier</Button>} />
      {list.length === 0 ? <Empty>Noch kein Turnier. Tippe auf „+ Turnier“.</Empty> : (
        <div className="grid gap-3 sm:grid-cols-2">
          {list.map((t) => (
            <Link key={t.id} href={`/tournament/?id=${t.id}`} className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-4 active:scale-[0.99]">
              {t.logo && <img src={t.logo} alt="" className="h-14 w-14 rounded-xl object-contain" />}
              <div>
                <div className="font-display text-2xl uppercase">{t.name}</div>
                <div className="text-sm text-muted">{t.date} · {t.playerIds.length} Spieler · {STATUS[t.status]}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title="Neues Turnier">
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (!name.trim()) return; const id = createTournament(name.trim(), date); router.push(`/tournament/?id=${id}`); }}>
          <Field label="Name"><input autoFocus className={inputCls} value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="Datum"><input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <div className="flex justify-end gap-3"><Button variant="ghost" onClick={() => setOpen(false)}>Abbrechen</Button><Button type="submit" variant="primary">Anlegen</Button></div>
        </form>
      </Modal>
    </Page>
  );
}
