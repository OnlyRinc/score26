"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useHydrated, useStore } from "@/lib/store/store";
import { buildKoSlots, groupsFinished, koRounds } from "@/lib/store/tournamentHelpers";
import { Button, Card, Loading, Page, PageHeader, Segmented } from "@/components/ui";
import { HandicapEditor, Section, TiebreakerEditor, TournamentSetup } from "@/components/tournament/Setup";
import { Bracket, Ceremony, GroupTables, Schedule, TournamentStats } from "@/components/tournament/Views";
import { LiveShare } from "@/components/tournament/LiveShare";

export default function TournamentPage() {
  return <Suspense fallback={<Loading />}><TournamentScreen /></Suspense>;
}

type Tab = "plan" | "groups" | "ko" | "stats" | "live" | "settings";

function TournamentScreen() {
  const hydrated = useHydrated();
  const router = useRouter();
  const params = useSearchParams();
  const id = params.get("id") ?? "";
  const t = useStore((s) => s.tournaments[id]);
  const players = useStore((s) => s.players);
  const matches = useStore((s) => s.matches);
  const update = useStore((s) => s.updateTournament);
  const deleteTournament = useStore((s) => s.deleteTournament);
  const [tab, setTab] = useState<Tab>((params.get("tab") as Tab) || "plan");

  if (!hydrated) return <Loading />;
  if (!t) return <Page><PageHeader title="Turnier" back="/tournaments/" /><p>Turnier nicht gefunden.</p></Page>;

  const logo = t.logo ? <img src={t.logo} alt="" className="h-10 w-10 rounded-lg object-contain" /> : null;

  if (t.status === "setup") {
    return (
      <Page>
        <PageHeader title={t.name} back="/tournaments/" right={logo} />
        <TournamentSetup t={t} />
      </Page>
    );
  }

  const groupsDone = t.status === "groups" && groupsFinished(t);
  const rounds = koRounds(t);
  const final = rounds.filter((r) => r[0]?.key !== "third").at(-1)?.[0];
  const third = rounds.find((r) => r[0]?.key === "third")?.[0];
  const koDone = t.status === "ko" && !!final?.winner && (!third || !!third.winner || !third.a || !third.b);

  const tabs: { value: Tab; label: string }[] = [
    { value: "plan", label: "Spielplan" },
    ...(t.groups.length ? [{ value: "groups" as Tab, label: "Gruppen" }] : []),
    { value: "ko", label: "KO-Baum" },
    { value: "stats", label: "Statistik" },
    { value: "live", label: "Live / QR" },
    { value: "settings", label: "Einstellungen" },
  ];

  return (
    <Page>
      <PageHeader title={t.name} back="/tournaments/" right={logo} />
      <Segmented className="mb-5" size="lg" value={tab} options={tabs} onChange={setTab} />

      {groupsDone && (
        <Card className="mb-5 border-cyan/60 bg-cyan/10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><div className="font-display text-2xl uppercase">Gruppenphase beendet</div><div className="text-sm text-muted">Jetzt den KO-Baum aus den Platzierungen erstellen.</div></div>
            <Button variant="primary" size="lg" onClick={() => { update(t.id, { koSlots: buildKoSlots(t), status: "ko" }); setTab("ko"); }}>KO-Runde erstellen</Button>
          </div>
        </Card>
      )}
      {koDone && (
        <Card className="mb-5 border-pink/60 bg-pink/10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="font-display text-2xl uppercase">Alle Spiele gespielt!</div>
            <Button variant="primary" size="lg" onClick={() => { update(t.id, { status: "done" }); setTab("stats"); }}>Turnier abschließen</Button>
          </div>
        </Card>
      )}
      {t.status === "done" && <div className="mb-5"><Ceremony t={t} players={players} /></div>}

      {tab === "plan" && <Schedule t={t} players={players} matches={matches} />}
      {tab === "groups" && <GroupTables t={t} players={players} />}
      {tab === "ko" && <Bracket t={t} players={players} onFixture={() => setTab("plan")} />}
      {tab === "stats" && <TournamentStats t={t} players={players} matches={matches} />}
      {tab === "live" && <LiveShare t={t} />}
      {tab === "settings" && (
        <div className="space-y-4">
          <Section title="Hinweis">
            <p className="text-sm text-muted">Formate und Handicaps gelten für alle Spiele, die ab jetzt gestartet werden. Vor jedem Match kannst du sie auch einzeln anpassen.</p>
          </Section>
          <FormatsAfterStart tId={t.id} />
          <Section title="Tiebreaker">
            <TiebreakerEditor value={t.tiebreakers} onChange={(tiebreakers) => update(t.id, { tiebreakers })} />
          </Section>
          <HandicapEditor t={t} />
          <Section title="Gefahrenzone">
            <div className="flex flex-wrap gap-3">
              {t.status === "ko" && Object.keys(t.koResults).length === 0 && (
                <Button variant="danger" onClick={() => { if (confirm("KO-Baum löschen und zurück zur Gruppenphase?")) update(t.id, { status: "groups", koSlots: null }); }}>Zurück zur Gruppenphase</Button>
              )}
              {t.status === "groups" && Object.keys(t.groupResults).length === 0 && (
                <Button variant="danger" onClick={() => update(t.id, { status: "setup" })}>Zurück zur Einrichtung</Button>
              )}
              {t.status === "done" && <Button variant="secondary" onClick={() => update(t.id, { status: "ko" })}>Turnier wieder öffnen</Button>}
              <Button variant="danger" onClick={() => { if (confirm(`Turnier „${t.name}“ endgültig löschen?`)) { deleteTournament(t.id); router.replace("/tournaments/"); } }}>Turnier löschen</Button>
            </div>
          </Section>
        </div>
      )}
    </Page>
  );
}

import { FormatEditor, RulesEditor } from "@/components/RulesEditor";
import { koRoundNames } from "@/components/tournament/Setup";

function FormatsAfterStart({ tId }: { tId: string }) {
  const t = useStore((s) => s.tournaments[tId]);
  const update = useStore((s) => s.updateTournament);
  const koSize = t.groups.length * t.advancePerGroup;
  const names = koRoundNames(koSize, t.thirdPlace);
  const [sel, setSel] = useState<string>(t.status === "groups" ? "Gruppenphase" : names[0]);
  const value = sel === "Gruppenphase" ? t.groupFormat : t.koFormats[sel] ?? t.groupFormat;
  const set = (v: typeof value) => {
    if (sel === "Gruppenphase") update(t.id, { groupFormat: v });
    else update(t.id, { koFormats: { ...t.koFormats, [sel]: v } });
  };
  return (
    <Section title="Spielformat">
      <Segmented className="mb-4" value={sel} options={["Gruppenphase", ...names].map((n) => ({ value: n, label: n }))} onChange={setSel} />
      <div className="space-y-3">
        <FormatEditor value={value.format} onChange={(format) => set({ ...value, format })} />
        <RulesEditor value={value.rules} onChange={(rules) => set({ ...value, rules })} />
      </div>
    </Section>
  );
}
