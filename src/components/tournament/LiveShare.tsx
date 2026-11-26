"use client";
import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import type { Tournament } from "@/lib/store/types";
import { useStore } from "@/lib/store/store";
import { liveEnabled } from "@/lib/live/config";
import { useLiveStatus } from "@/lib/live/publisher";
import { Button, Card, Field, Wordmark, inputCls } from "@/components/ui";

const STATUS_TEXT: Record<string, [string, string]> = {
  off: ["Live aus", "text-muted"],
  nopin: ["Bitte eine PIN (mind. 4 Ziffern) festlegen", "text-live"],
  sending: ["Wird gesendet …", "text-cyan"],
  ok: ["Live: Zuschauer sehen den aktuellen Stand", "text-win"],
  pin: ["PIN falsch: Dieses Turnier wurde mit einer anderen PIN veröffentlicht", "text-live"],
  offline: ["Keine Verbindung, versuche es erneut …", "text-live"],
};

export function LiveShare({ t }: { t: Tournament }) {
  const update = useStore((s) => s.updateTournament);
  const status = useLiveStatus((s) => s.status);
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  const url = `${origin}/live/?t=${t.id}`;
  const tvUrl = `${url}&tv=1`;

  if (!liveEnabled()) {
    return <Card><p className="text-muted">Die Live-Ansicht ist in dieser Version noch nicht eingerichtet (Supabase fehlt).</p></Card>;
  }
  const [label, color] = STATUS_TEXT[status] ?? STATUS_TEXT.off;

  return (
    <div className="space-y-4">
      <Card className="print:hidden">
        <div className="flex flex-wrap items-end gap-4">
          <Field label="Admin-PIN (nur du kannst damit den Live-Stand verändern)">
            <input inputMode="numeric" maxLength={8} className={inputCls + " !w-48"} value={t.pin} onChange={(e) => update(t.id, { pin: e.target.value.replace(/\D/g, "") })} placeholder="z. B. 2626" />
          </Field>
          <div className={`pb-3 font-semibold ${color}`}>● {label}</div>
        </div>
      </Card>

      <Card className="print-area print:border-0 print:bg-white print:text-black">
        <div className="grid items-center gap-6 md:grid-cols-[auto_1fr]">
          <div className="rounded-2xl bg-white p-4"><QRCodeSVG value={url} size={240} level="M" /></div>
          <div className="space-y-3">
            <div className="hidden print:block"><Wordmark className="text-5xl text-black" /></div>
            <div className="font-display text-3xl uppercase">{t.name} live verfolgen</div>
            <p className="text-muted print:text-black">QR-Code mit der Handy-Kamera scannen. Ohne Anmeldung: Live-Spiel, Tabellen, KO-Baum und nächste Spiele.</p>
            <div className="break-all rounded-xl bg-surface-2 px-3 py-2 font-mono text-sm print:bg-white">{url}</div>
            <div className="flex flex-wrap gap-2 print:hidden">
              <Button variant="primary" onClick={() => window.print()}>🖨 QR-Code drucken</Button>
              <Button onClick={() => navigator.clipboard?.writeText(url)}>Link kopieren</Button>
              <Button href={`/live/?t=${t.id}`}>Live-Ansicht öffnen</Button>
              <Button href={`/live/?t=${t.id}&tv=1`}>📺 TV-/Beamer-Ansicht</Button>
            </div>
            <p className="text-xs text-muted print:hidden">TV-Link: {tvUrl}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
