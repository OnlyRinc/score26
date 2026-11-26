"use client";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL, liveEnabled } from "./config";
import type { Player, StoredMatch, Tournament } from "@/lib/store/types";

let client: SupabaseClient | null = null;
export function supabase(): SupabaseClient | null {
  if (!liveEnabled()) return null;
  if (!client) client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  return client;
}

/** Was die Zuschauer zu sehen bekommen. */
export interface LiveSnapshot {
  v: 1;
  tournament: Omit<Tournament, "pin">;
  players: Record<string, Pick<Player, "id" | "nickname" | "firstName" | "lastName" | "createdAt">>;
  /** Alle fertigen Turnier-Matches (für Statistiken) und das laufende Match */
  matches: Record<string, StoredMatch>;
  publishedAt: number;
}

export function buildSnapshot(t: Tournament, players: Record<string, Player>, matches: Record<string, StoredMatch>): LiveSnapshot {
  const { pin: _pin, ...pub } = t;
  void _pin;
  const ps: LiveSnapshot["players"] = {};
  for (const id of t.playerIds) {
    const p = players[id];
    if (p) ps[id] = { id, nickname: p.nickname, firstName: p.firstName, lastName: p.lastName, createdAt: p.createdAt };
  }
  const ms: Record<string, StoredMatch> = {};
  for (const m of Object.values(matches)) if (m.tournamentId === t.id) ms[m.id] = m;
  return { v: 1, tournament: pub, players: ps, matches: ms, publishedAt: Date.now() };
}

export async function publish(t: Tournament, snapshot: LiveSnapshot): Promise<"ok" | "pin" | "error"> {
  const sb = supabase();
  if (!sb) return "error";
  const { data, error } = await sb.rpc("publish_live", { p_id: t.id, p_pin: t.pin, p_data: snapshot });
  if (error) return "error";
  return data ? "ok" : "pin";
}

export async function fetchLive(id: string): Promise<LiveSnapshot | null> {
  const sb = supabase();
  if (!sb) return null;
  const { data } = await sb.from("live_tournaments").select("data").eq("id", id).maybeSingle();
  return (data?.data as LiveSnapshot) ?? null;
}

export function subscribeLive(id: string, onData: (s: LiveSnapshot) => void): () => void {
  const sb = supabase();
  if (!sb) return () => {};
  const ch = sb
    .channel(`live-${id}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "live_tournaments", filter: `id=eq.${id}` }, () => {
      // Immer frisch laden (große Datenmengen werden im Echtzeit-Signal ggf. gekürzt)
      fetchLive(id).then((d) => d && onData(d));
    })
    .subscribe();
  return () => { sb.removeChannel(ch); };
}
