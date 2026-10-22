import { assertNever } from '@rougarou/protocol';

import type { GameEvent } from './events.ts';
import { getPlayer, omitKey, updatePlayer, type GameState, type NightState } from './state.ts';

/**
 * Applique un evenement a l'etat.
 *
 * C'est la seule fonction qui fabrique un nouvel etat : rejouer le journal
 * (`events.reduce(evolve, emptyState())`) redonne donc toujours le meme etat
 * (ADR 0002). Elle ne decide rien et ne valide rien : les decisions ont ete
 * prises avant d'emettre l'evenement.
 */
export function evolve(state: GameState, event: GameEvent): GameState {
  switch (event.type) {
    case 'GameCreated':
      return { ...state, gameId: event.gameId };

    case 'PlayerJoined':
      return {
        ...state,
        seats: [...state.seats, event.playerId],
        players: {
          ...state.players,
          [event.playerId]: {
            id: event.playerId,
            name: event.name,
            role: null,
            alive: true,
            roleSeen: false,
            roleRevealed: false,
          },
        },
      };

    case 'PlayerLeft':
      return {
        ...state,
        seats: state.seats.filter((id) => id !== event.playerId),
        players: omitKey(state.players, event.playerId),
      };

    case 'SeatsReordered':
      return { ...state, seats: [...event.order] };

    case 'OptionsSet':
      return { ...state, options: event.options };

    case 'CompositionSet':
      return { ...state, composition: event.composition };

    case 'RolesDealt':
      return Object.entries(event.assignments).reduce<GameState>(
        (next, [playerId, role]) => updatePlayer(next, playerId, { role }),
        { ...state, seed: event.seed },
      );

    case 'RoleSeen':
      return updatePlayer(state, event.playerId, { roleSeen: true });

    case 'PhaseChanged':
      return enterPhase(state, event.phase);

    case 'PhaseForced':
    case 'TimerExpired':
      // Simple trace dans le journal (`R-10`) : l'effet vient des evenements suivants.
      return state;

    case 'DeadlineSet':
      return { ...state, deadline: event.deadline };

    case 'NightStarted':
      return {
        ...state,
        nightNumber: event.number,
        night: {
          number: event.number,
          steps: [...event.steps],
          current: 0,
          stepResolved: false,
          wolfVotes: {},
          wolfTie: null,
          wolfVictim: null,
        },
      };

    case 'NightStepStarted':
      return withNight(state, (night) => ({ ...night, current: event.index, stepResolved: false }));

    case 'WolfVoteCast':
      return withNight(state, (night) => ({
        ...night,
        wolfVotes: { ...night.wolfVotes, [event.wolf]: event.target },
      }));

    case 'WolfTieDetected':
      // Une liste vide leve l'egalite : un loup a change d'avis.
      return withNight(state, (night) => ({
        ...night,
        wolfTie: event.tied.length === 0 ? null : [...event.tied],
      }));

    case 'WolvesResolved':
      return withNight(state, (night) => ({
        ...night,
        wolfVictim: event.victim,
        wolfTie: null,
        stepResolved: true,
      }));

    case 'NightEnded':
      return { ...state, dawn: { deaths: [...event.deaths], announced: false } };

    case 'DeathsAnnounced':
      if (state.dawn === null) {
        throw new Error("Annonce des morts hors de l'aube.");
      }

      return { ...state, dawn: { ...state.dawn, announced: true } };

    case 'PlayerKilled':
      return updatePlayer(state, event.playerId, {
        alive: false,
        roleRevealed: event.roleRevealed || getPlayer(state, event.playerId).roleRevealed,
      });

    case 'EffectQueued':
      return { ...state, pending: [...state.pending, event.effect] };

    case 'EffectResolved':
      return { ...state, pending: state.pending.slice(1) };

    case 'MayorDesignated':
      return { ...state, mayor: event.to };

    case 'MayorRemoved':
      return { ...state, mayor: null };

    case 'ElectionStarted':
      return {
        ...state,
        election: { stage: 'candidacy', candidates: [], eligible: [], ballots: {}, round: 1 },
      };

    case 'CandidacyDeclared':
      return withElection(state, (election) => ({
        ...election,
        candidates: [...election.candidates, event.playerId],
      }));

    case 'CandidacyWithdrawn':
      return withElection(state, (election) => ({
        ...election,
        candidates: election.candidates.filter((id) => id !== event.playerId),
      }));

    case 'ElectionVoteOpened':
      return withElection(state, (election) => ({
        ...election,
        stage: 'vote',
        eligible: [...event.eligible],
        ballots: {},
        round: event.round,
      }));

    case 'ElectionVoteCast':
      return withElection(state, (election) => ({
        ...election,
        ballots: { ...election.ballots, [event.voter]: event.target },
      }));

    case 'ElectionVoteClosed':
      return state;

    case 'MayorElected':
      return { ...state, mayor: event.playerId, electionHeld: true, election: null };

    case 'VoteOpened':
      return {
        ...state,
        vote: {
          candidates: [...event.candidates],
          spare: event.spare,
          ballots: {},
          round: event.round,
          tie: null,
          closed: false,
        },
      };

    case 'VoteCast':
      return withVote(state, (vote) => ({
        ...vote,
        ballots: { ...vote.ballots, [event.voter]: event.ballot },
      }));

    case 'VoteClosed':
      return withVote(state, (vote) => ({ ...vote, closed: true }));

    case 'TieBreakRequested':
      return withVote(state, (vote) => ({ ...vote, tie: [...event.tied] }));

    case 'TieBroken':
      return withVote(state, (vote) => ({ ...vote, tie: null }));

    case 'ExecutionStarted':
      return state;

    case 'GameEnded':
      return { ...state, winner: event.winner };

    default:
      return assertNever(event);
  }
}

/** Entree dans une phase : on range ce qui appartient a la phase precedente. */
function enterPhase(state: GameState, phase: GameState['phase']): GameState {
  switch (phase) {
    case 'NIGHT':
      return { ...state, phase, dawn: null, vote: null, election: null };
    case 'DAWN':
      return { ...state, phase, night: null };
    case 'DAY_DEBATE':
      return { ...state, phase, dawn: null, election: null };
    case 'MAYOR_ELECTION':
      return { ...state, phase, dawn: null };
    case 'ENDED':
      return { ...state, phase, deadline: null };
    default:
      return { ...state, phase };
  }
}

function withNight(state: GameState, update: (night: NightState) => NightState): GameState {
  if (state.night === null) {
    throw new Error('Evenement de nuit hors de la nuit.');
  }

  return { ...state, night: update(state.night) };
}

function withVote(
  state: GameState,
  update: (vote: NonNullable<GameState['vote']>) => NonNullable<GameState['vote']>,
): GameState {
  if (state.vote === null) {
    throw new Error('Evenement de vote hors du vote.');
  }

  return { ...state, vote: update(state.vote) };
}

function withElection(
  state: GameState,
  update: (election: NonNullable<GameState['election']>) => NonNullable<GameState['election']>,
): GameState {
  if (state.election === null) {
    throw new Error("Evenement d'election hors de l'election.");
  }

  return { ...state, election: update(state.election) };
}
