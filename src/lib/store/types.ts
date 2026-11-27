import type { InRule, MatchFormat, MatchSetup, OutRule, PlayerRules, Visit } from "@/lib/game";
import type { MatchResult, Tiebreaker } from "@/lib/tournament";
import type { TrainingEvent, TrainingSettings } from "@/lib/training/training";

export interface Player {
  id: string;
  firstName: string;
  lastName: string;
  nickname: string;
  /** Walk-on-Song (Titel und Interpret), freier Text */
  walkOn?: string;
  createdAt: number;
}

export interface StoredMatch {
  id: string;
  setup: MatchSetup;
  visits: Visit[];
  createdAt: number;
  updatedAt: number;
  finishedAt?: number;
  tournamentId?: string;
  /** Schlüssel der Begegnung im Turnier (Gruppe oder KO) */
  fixtureKey?: string;
  title?: string;
}

export interface RoundFormat {
  format: MatchFormat;
  rules: PlayerRules;
}

export interface PlayerHandicap {
  startScore?: number;
  inRule?: InRule;
  outRule?: OutRule;
  legs: number;
  sets: number;
}

export type TournamentStatus = "setup" | "groups" | "ko" | "done";

export interface FixtureResult extends MatchResult {
  matchId?: string;
  manual?: boolean;
}

export interface Tournament {
  id: string;
  name: string;
  date: string;
  pin: string;
  logo?: string;
  playerIds: string[];
  seeded: string[];
  status: TournamentStatus;
  groupsCount: number;
  advancePerGroup: number;
  thirdPlace: boolean;
  pointsWin: number;
  pointsLoss: number;
  tiebreakers: Tiebreaker[];
  groupFormat: RoundFormat;
  /** Format pro KO-Runde, Schlüssel = Rundenname (z. B. "Finale") */
  koFormats: Record<string, RoundFormat>;
  handicaps: Record<string, PlayerHandicap>;
  groups: string[][];
  groupResults: Record<string, FixtureResult>;
  koSlots: (string | null)[] | null;
  koResults: Record<string, FixtureResult>;
  /** Match, das gerade am Board läuft */
  activeMatchId?: string;
  createdAt: number;
}

export interface Settings {
  inputMode: "total" | "darts";
  speech: boolean;
  /** Soundeffekte (180, High Finish); undefined = an */
  sounds?: boolean;
  handicapPointsPer10: number;
  askDoubles: boolean;
}

export interface TrainingSession {
  id: string;
  settings: TrainingSettings;
  playerId?: string;
  playerName: string;
  events: TrainingEvent[];
  createdAt: number;
  finishedAt?: number;
}
