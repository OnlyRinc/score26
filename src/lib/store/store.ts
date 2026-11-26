"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { nanoid } from "nanoid";
import type { MatchSetup, Visit } from "@/lib/game";
import { DEFAULT_TIEBREAKERS } from "@/lib/tournament";
import type { FixtureResult, Player, Settings, StoredMatch, Tournament, TrainingSession } from "./types";
import type { TrainingEvent, TrainingSettings } from "@/lib/training/training";
import { DEFAULT_LOOK, normalizeLook, type Look } from "@/lib/dartraum/catalog";

/** Dartraum-Profil eines Spielers. Verdiente Coins werden aus den Spielen berechnet, hier steht nur, was ausgegeben wurde. */
export interface DartraumProfile {
  look: Look;
  owned: string[];
  spent: number;
  room: number;
}
export const emptyProfile = (): DartraumProfile => ({ look: { ...DEFAULT_LOOK }, owned: [], spent: 0, room: 0 });

export interface AppState {
  players: Record<string, Player>;
  matches: Record<string, StoredMatch>;
  tournaments: Record<string, Tournament>;
  trainings: Record<string, TrainingSession>;
  settings: Settings;
  dartraum: Record<string, DartraumProfile>;

  setLook(playerId: string, patch: Partial<Look>): void;
  /** Kauf mit Preis; prüft den Kontostand nicht, das macht die Oberfläche */
  buyItem(playerId: string, itemId: string, price: number): void;
  buyRoom(playerId: string, level: number, price: number): void;
  /** Testmodus: Raumstufe frei wählen */
  setRoom(playerId: string, level: number): void;

  createTraining(settings: TrainingSettings, playerId: string | undefined, playerName: string): string;
  addTrainingEvent(id: string, e: TrainingEvent): void;
  undoTrainingEvent(id: string): void;
  finishTraining(id: string): void;
  deleteTraining(id: string): void;

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
      trainings: {},
      dartraum: {},
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

      createTraining(settings, playerId, playerName) {
        const id = nanoid(10);
        set((s) => ({ trainings: { ...s.trainings, [id]: { id, settings, playerId, playerName, events: [], createdAt: Date.now() } } }));
        return id;
      },
      addTrainingEvent(id, e) {
        set((s) => {
          const t = s.trainings[id];
          if (!t) return s;
          return { trainings: { ...s.trainings, [id]: { ...t, events: [...t.events, e] } } };
        });
      },
      undoTrainingEvent(id) {
        set((s) => {
          const t = s.trainings[id];
          if (!t || !t.events.length) return s;
          return { trainings: { ...s.trainings, [id]: { ...t, events: t.events.slice(0, -1), finishedAt: undefined } } };
        });
      },
      finishTraining(id) {
        set((s) => {
          const t = s.trainings[id];
          if (!t) return s;
          return { trainings: { ...s.trainings, [id]: { ...t, finishedAt: t.finishedAt ?? Date.now() } } };
        });
      },
      deleteTraining(id) {
        set((s) => {
          const trainings = { ...s.trainings };
          delete trainings[id];
          return { trainings };
        });
      },

      setLook(pid, patch) {
        set((s) => {
          const pr = s.dartraum[pid] ?? emptyProfile();
          return { dartraum: { ...s.dartraum, [pid]: { ...pr, look: { ...normalizeLook(pr.look), ...patch } } } };
        });
      },
      buyItem(pid, itemId, price) {
        set((s) => {
          const pr = s.dartraum[pid] ?? emptyProfile();
          if (pr.owned.includes(itemId)) return s;
          return { dartraum: { ...s.dartraum, [pid]: { ...pr, owned: [...pr.owned, itemId], spent: pr.spent + price } } };
        });
      },
      buyRoom(pid, level, price) {
        set((s) => {
          const pr = s.dartraum[pid] ?? emptyProfile();
          if (pr.room >= level) return s;
          return { dartraum: { ...s.dartraum, [pid]: { ...pr, room: level, spent: pr.spent + price } } };
        });
      },

      setRoom(pid, level) {
        set((s) => {
          const pr = s.dartraum[pid] ?? emptyProfile();
          return { dartraum: { ...s.dartraum, [pid]: { ...pr, room: level } } };
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
