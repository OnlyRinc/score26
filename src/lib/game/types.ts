// Grundlegende Typen der Spiellogik. Diese Datei hat keine Abhängigkeit zu React,
// damit die Logik später unverändert in einer App-Store-Version laufen kann.

export type InRule = "straight" | "double";
export type OutRule = "single" | "double" | "master";

export interface PlayerRules {
  startScore: number;
  inRule: InRule;
  outRule: OutRule;
}

/** Vorsprung zu Beginn des Matches (Handicap). */
export interface HeadStart {
  legs: number;
  sets: number;
}

/** "Best of"-Werte. sets = 1 bedeutet: reines Leg-Format. */
export interface MatchFormat {
  sets: number;
  legs: number;
}

export interface MatchPlayer {
  playerId?: string;
  name: string;
  nickname: string;
  rules: PlayerRules;
  headStart: HeadStart;
}

export interface MatchSetup {
  players: MatchPlayer[];
  format: MatchFormat;
  /** Index des Spielers, der das erste Leg beginnt (z. B. nach dem Ausbullen). */
  firstPlayer: number;
}

/** segment: 0 = daneben, 1–20, 25 = Bull. multiplier beim Bull: 1 = 25, 2 = 50. */
export interface Dart {
  segment: number;
  multiplier: 1 | 2 | 3;
}

/**
 * Eine Aufnahme, so wie sie eingegeben wurde. Ob sie ein Bust ist, wird immer neu berechnet,
 * dadurch funktioniert Rückgängig einfach durch Entfernen der letzten Aufnahme.
 */
export interface Visit {
  /** Summe der Aufnahme (bei Dart-für-Dart-Eingabe die Summe der Darts). */
  total: number;
  /** Optional: einzelne Darts, wenn Dart für Dart eingegeben wurde. */
  darts?: Dart[];
  /** Geworfene Darts (3, beim Checkout ggf. 1 oder 2). */
  dartsThrown: number;
  /** Darts, die auf ein Doppel (Finish) geworfen wurden, für die Checkout-Quote. */
  dartsAtDouble: number;
  /** Zeitpunkt der Eingabe (ms). */
  at?: number;
}
