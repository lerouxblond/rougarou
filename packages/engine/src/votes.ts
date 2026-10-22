import type { PlayerId } from '@rougarou/protocol';

import type { GameState } from './state.ts';

/** Cle du choix « Epargner » dans un decompte (`R-36`). Le `@` evite toute collision avec un identifiant de joueur. */
export const SPARE = '@spare';

/** Un decompte : voix par candidat (un joueur, ou `SPARE`). */
export type Tally = Readonly<Record<string, number>>;

/** Poids d'un votant : le Maire vivant compte double (`R-32`). */
function weight(state: GameState, voter: PlayerId): number {
  return voter === state.mayor && state.players[voter]?.alive === true ? 2 : 1;
}

/** Decompte du vote du village. Les abstentions ne comptent pas. */
export function tallyVillage(state: GameState): Tally {
  const tally: Record<string, number> = {};

  for (const [voter, ballot] of Object.entries(state.vote?.ballots ?? {})) {
    const key = ballot.kind === 'player' ? ballot.playerId : ballot.kind === 'spare' ? SPARE : null;

    if (key !== null) {
      tally[key] = (tally[key] ?? 0) + weight(state, voter);
    }
  }

  return tally;
}

/** Decompte de l'election du Maire : une voix par votant (`R-35`). */
export function tallyElection(state: GameState): Tally {
  const tally: Record<string, number> = {};

  for (const target of Object.values(state.election?.ballots ?? {})) {
    tally[target] = (tally[target] ?? 0) + 1;
  }

  return tally;
}

/**
 * Les candidats en tete, dans l'ordre des places, puis « Epargner ». Vide
 * quand personne n'a de voix.
 */
export function leaders(state: GameState, tally: Tally): string[] {
  const best = Math.max(0, ...Object.values(tally));

  if (best === 0) {
    return [];
  }

  return [...state.seats, SPARE].filter((key) => tally[key] === best);
}
