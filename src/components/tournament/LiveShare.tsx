"use client";
import type { Tournament } from "@/lib/store/types";
import { Empty } from "@/components/ui";

// Wird in Stufe 2 mit Live-Link und QR-Code gefüllt.
export function LiveShare({ t: _t }: { t: Tournament }) {
  return <Empty>Die Live-Ansicht für Zuschauer (QR-Code) kommt in Stufe 2, heute Abend.</Empty>;
}
