"use client";
import { useState } from "react";
import { useHydrated, useStore } from "@/lib/store/store";
import type { Player } from "@/lib/store/types";
import { Button, Card, Empty, Loading, Page, PageHeader } from "@/components/ui";
import { playerAverages } from "@/lib/store/history";
import { PlayerDialog } from "@/components/PlayerDialog";

export default function PlayersPage() {
  const hydrated = useHydrated();
  const players = useStore((s) => s.players);
  const matches = useStore((s) => s.matches);
  const [edit, setEdit] = useState<Partial<Player> | null>(null);
  if (!hydrated) return <Loading />;

  const list = Object.values(players).sort((a, b) => (a.nickname || a.firstName).localeCompare(b.nickname || b.firstName));
  const avgs = playerAverages(matches);

  return (
    <Page>
      <PageHeader title="Spieler" back="/" right={<Button variant="primary" onClick={() => setEdit({})}>+ Spieler</Button>} />
      {list.length === 0 ? (
        <Empty>Noch keine Spieler. Tippe auf „+ Spieler“.</Empty>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((p) => (
            <button key={p.id} onClick={() => setEdit(p)} className="text-left">
              <Card className="active:scale-[0.99]">
                <div className="font-display text-3xl uppercase text-white">{p.nickname || p.firstName}</div>
                <div className="text-muted">{[p.firstName, p.lastName].filter(Boolean).join(" ")}</div>
                {p.walkOn && <div className="mt-1 truncate text-sm text-pink">♪ {p.walkOn}</div>}
                {avgs[p.id] && (
                  <div className="mt-2 text-sm text-cyan tabular">Ø {avgs[p.id].average.toFixed(1)} · {avgs[p.id].matches} Matches</div>
                )}
              </Card>
            </button>
          ))}
        </div>
      )}
      <PlayerDialog value={edit} onClose={() => setEdit(null)} />
    </Page>
  );
}

