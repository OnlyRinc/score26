"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { nanoid } from "nanoid";
import type { MatchSetup, Visit } from "@/lib/game";
import { DEFAULT_TIEBREAKERS } from "@/lib/tournament";
import type { FixtureResult, Player, Settings, StoredMatch, Tournament } from "./types";

export interface AppState {
  players: Record<string, Player>;
  matches: Record<string, StoredMatch>;
  tournaments: Record<string, Tournament>;
  settings: Settings;

  addPlayer(p: Omit<Player, "id" | "createdAt">): string;
  updatePlayer(id: string, p: Partial<Player>): void;
  deletePlayer(id: string): void;

  createMatch(setup: MatchSetup, extra?: Partial<StoredMatch>): string;
  addVisit(matchId: string, v: Visit): void;
  undoVisit(matchId: string): void;
  finishMatch(matchId: string): void;
  reopenMatch(matchId: string): void;
  deleteMatch(matchId: string): void;

  createTournament(name: string, date: string): string;
  updateTournament(id: string, patch: Partial<Tournament> | ((t: Tournament) => Partial<Tournament>)): void;
  deleteTournament(id: string): void;
  setFixtureResult(tid: string, stage: "group" | "ko", key: string, result: FixtureResult | null): void;

  updateSettings(s: Partial<Settings>): void;
}

export const defaultRules = { startScore: 501, inRule: "straight" as const, outRule: "double" as const };

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      players: {},
      matches: {},
      tournaments: {},
      settings: { inputMode: "total", speech: false, handicapPointsPer10: 50, askDoubles: true },

      addPlayer(p) {
        const id = nanoid(10);
        set((s) => ({ players: { ...s.players, [id]: { ...p, id, createdAt: Date.now() } } }));
        return id;
      },
      updatePlayer(id, p) {
        set((s) => ({ players: { ...s.players, [id]: { ...s.players[id], ...p } } }));
      },
      deletePlayer(id) {
        set((s) => {
          const players = { ...s.players };
          delete players[id];
          return { players };
        });
      },

      createMatch(setup, extra) {
        const id = nanoid(10);
        const now = Date.now();
        set((s) => ({ matches: { ...s.matches, [id]: { id, setup, visits: [], createdAt: now, updatedAt: now, ...extra } } }));
        return id;
      },
      addVisit(matchId, v) {
        set((s) => {
          const m = s.matches[matchId];
          if (!m) return s;
          return { matches: { ...s.matches, [matchId]: { ...m, visits: [...m.visits, { ...v, at: Date.now() }], updatedAt: Date.now() } } };
        });
      },
      undoVisit(matchId) {
        set((s) => {
          const m = s.matches[matchId];
          if (!m || m.visits.length === 0) return s;
          return { matches: { ...s.matches, [matchId]: { ...m, visits: m.visits.slice(0, -1), finishedAt: undefined, updatedAt: Date.now() } } };
        });
      },
      finishMatch(matchId) {
        set((s) => {
          const m = s.matches[matchId];
          if (!m) return s;
          return { matches: { ...s.matches, [matchId]: { ...m, finishedAt: Date.now() } } };
        });
      },
      reopenMatch(matchId) {
        set((s) => {
          const m = s.matches[matchId];
          if (!m) return s;
          return { matches: { ...s.matches, [matchId]: { ...m, finishedAt: undefined } } };
        });
      },
      deleteMatch(matchId) {
        set((s) => {
          const matches = { ...s.matches };
          delete matches[matchId];
          return { matches };
        });
      },

      createTournament(name, date) {
        const id = nanoid(10);
        const t: Tournament = {
          id, name, date, pin: "", playerIds: [], seeded: [], status: "setup",
          groupsCount: 1, advancePerGroup: 2, thirdPlace: false, pointsWin: 2, pointsLoss: 0,
          tiebreakers: [...DEFAULT_TIEBREAKERS],
          groupFormat: { format: { sets: 1, legs: 3 }, rules: { ...defaultRules } },
          koFormats: {}, handicaps: {}, groups: [], groupResults: {}, koSlots: null, koResults: {},
          createdAt: Date.now(),
        };
        set((s) => ({ tournaments: { ...s.tournaments, [id]: t } }));
        return id;
      },
      updateTournament(id, patch) {
        set((s) => {
          const t = s.tournaments[id];
          if (!t) return s;
          const p = typeof patch === "function" ? patch(t) : patch;
          return { tournaments: { ...s.tournaments, [id]: { ...t, ...p } } };
        });
      },
      deleteTournament(id) {
        set((s) => {
          const tournaments = { ...s.tournaments };
          delete tournaments[id];
          // zugehörige Matches mit löschen
          const matches = Object.fromEntries(Object.entries(s.matches).filter(([, m]) => m.tournamentId !== id));
          return { tournaments, matches };
        });
      },
      setFixtureResult(tid, stage, key, result) {
        set((s) => {
          const t = s.tournaments[tid];
          if (!t) return s;
          const field = stage === "group" ? "groupResults" : "koResults";
          const map = { ...t[field] };
          if (result) map[key] = result;
          else delete map[key];
          return { tournaments: { ...s.tournaments, [tid]: { ...t, [field]: map } } };
        });
      },

      updateSettings(p) {
        set((s) => ({ settings: { ...s.settings, ...p } }));
      },
    }),
    { name: "score26", version: 1 },
  ),
);

/** Wartet, bis die gespeicherten Daten geladen sind (verhindert Flackern). */
import { useEffect, useState } from "react";
export function useHydrated() {
  const [h, setH] = useState(false);
  useEffect(() => {
    if (useStore.persist.hasHydrated()) setH(true);
    return useStore.persist.onFinishHydration(() => setH(true));
  }, []);
  return h;
}
