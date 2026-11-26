"use client";
import { useEffect } from "react";
import { create } from "zustand";
import { useStore } from "@/lib/store/store";
import { buildSnapshot, publish } from "./client";
import { liveEnabled } from "./config";

export type LiveStatus = "off" | "nopin" | "sending" | "ok" | "pin" | "offline";
export const useLiveStatus = create<{ status: LiveStatus; at?: number; set: (s: LiveStatus) => void }>((set) => ({
  status: "off",
  set: (status) => set({ status, at: status === "ok" ? Date.now() : undefined }),
}));

let timer: ReturnType<typeof setTimeout> | null = null;
let retry: ReturnType<typeof setTimeout> | null = null;

/** Schickt den Turnierstand (inkl. laufendem Match) an die Live-Ansicht. */
export function useLivePublisher(tournamentId: string | undefined, _matchId?: string) {
  void _matchId;
  const t = useStore((s) => (tournamentId ? s.tournaments[tournamentId] : undefined));
  const players = useStore((s) => s.players);
  const matches = useStore((s) => s.matches);
  const setStatus = useLiveStatus((s) => s.set);

  useEffect(() => {
    if (!t || t.status === "setup" || !liveEnabled()) { setStatus("off"); return; }
    if (!t.pin || t.pin.length < 4) { setStatus("nopin"); return; }
    if (timer) clearTimeout(timer);
    const send = async () => {
      setStatus("sending");
      const snap = buildSnapshot(t, players, matches);
      const res = await publish(t, snap).catch(() => "error" as const);
      if (res === "ok") setStatus("ok");
      else if (res === "pin") setStatus("pin");
      else {
        setStatus("offline");
        if (retry) clearTimeout(retry);
        retry = setTimeout(send, 5000); // später erneut versuchen
      }
    };
    timer = setTimeout(send, 300);
    return () => { if (timer) clearTimeout(timer); };
  }, [t, players, matches, setStatus]);
}
