import type { ActionDescriptor, PlayerId } from '@rougarou/protocol';

import { CLASSIC_MAX_PLAYERS } from './modes/classic.ts';
import { currentStep } from './night/flow.ts';
import { compositionIssues } from './phases/config.ts';
import { alivePlayers, seatedPlayers, type GameState } from './state.ts';

/** Qui regarde la partie : le meneur, ou un joueur (membre ou non). */
export type Viewer =
  { readonly kind: 'narrator' } | { readonly kind: 'player'; readonly playerId: PlayerId };

/**
 * Les actions que `viewer` peut faire maintenant. Le client en tire ses
 * boutons ; chacune serait acceptee par `apply`. Ce n'est pas une
 * autorisation : `apply` reverifie tout.
 */
export function availableActions(state: GameState, viewer: Viewer): ActionDescriptor[] {
  if (state.phase === 'ENDED') {
    return [];
  }

  return viewer.kind === 'narrator'
    ? [...narratorActions(state), ...timerActions(state)]
    : playerActions(state, viewer.playerId);
}

/** Pause, reprise et +30 s, tant qu'un minuteur court ou attend (`R-16`). */
function timerActions(state: GameState): ActionDescriptor[] {
  if (state.pausedRemaining !== null) {
    return [{ type: 'ResumeTimer' }, { type: 'ExtendTimer' }];
  }

  return state.deadline === null ? [] : [{ type: 'PauseTimer' }, { type: 'ExtendTimer' }];
}

function narratorActions(state: GameState): ActionDescriptor[] {
  const seats = [...state.seats];

  switch (state.phase) {
    case 'LOBBY':
      return [
        { type: 'KickPlayer', targets: seats },
        { type: 'ReorderSeats' },
        { type: 'AdvancePhase', blocked: false },
      ];
    case 'CONFIG':
      return [
        { type: 'KickPlayer', targets: seats },
        { type: 'ReorderSeats' },
        { type: 'SetOptions' },
        { type: 'SetComposition' },
        { type: 'Deal', issues: compositionIssues(state) },
      ];
    case 'DEAL':
      return [
        { type: 'AdvancePhase', blocked: !seatedPlayers(state).every((player) => player.roleSeen) },
      ];
    case 'NIGHT': {
      const tie = state.night?.wolfTie ?? null;
      const advance: ActionDescriptor = {
        type: 'AdvancePhase',
        blocked: state.night?.stepResolved !== true,
      };

      return tie === null ? [advance] : [advance, { type: 'ResolveWolfTie', targets: [...tie] }];
    }
    case 'DAWN':
      return [
        {
          type: 'AdvancePhase',
          blocked: state.dawn?.announced === true && state.pending.length > 0,
        },
      ];
    case 'DAY_VOTE':
      return [{ type: 'AdvancePhase', blocked: state.vote?.tie !== null }];
    case 'EXECUTION':
      return [{ type: 'AdvancePhase', blocked: state.pending.length > 0 }];
    default:
      return [{ type: 'AdvancePhase', blocked: false }];
  }
}

function playerActions(state: GameState, playerId: PlayerId): ActionDescriptor[] {
  const player = state.players[playerId];
  const seatingOpen = state.phase === 'LOBBY' || state.phase === 'CONFIG';

  if (player === undefined) {
    return seatingOpen && state.seats.length < CLASSIC_MAX_PLAYERS ? [{ type: 'JoinGame' }] : [];
  }

  if (seatingOpen) {
    return [{ type: 'LeaveGame' }];
  }

  const [effect] = state.pending;

  // Le Maire mort designe son successeur : la seule action d'un mort (`R-52`).
  if (effect?.from === playerId) {
    return [{ type: 'DesignateSuccessor', targets: alivePlayers(state).map((alive) => alive.id) }];
  }

  if (state.phase === 'DEAL') {
    return player.roleSeen ? [] : [{ type: 'ConfirmRoleSeen' }];
  }

  return player.alive ? livingPlayerActions(state, playerId) : [];
}

function livingPlayerActions(state: GameState, playerId: PlayerId): ActionDescriptor[] {
  const { night, election, vote } = state;

  if (state.phase === 'NIGHT' && night !== null && !night.stepResolved) {
    const step = currentStep(state);

    return step.actors(state).includes(playerId) ? step.actionsFor(state, playerId) : [];
  }

  if (state.phase === 'MAYOR_ELECTION' && election !== null) {
    if (election.stage === 'candidacy') {
      return [
        { type: election.candidates.includes(playerId) ? 'WithdrawCandidacy' : 'DeclareCandidacy' },
      ];
    }

    return [{ type: 'CastVote', targets: [...election.eligible], spare: false, abstain: false }];
  }

  if (state.phase === 'DAY_VOTE' && vote !== null && !vote.closed) {
    if (vote.tie !== null) {
      return state.mayor === playerId ? [{ type: 'BreakTie', targets: [...vote.tie] }] : [];
    }

    return [
      {
        type: 'CastVote',
        targets: vote.candidates.filter((id) => id !== playerId),
        spare: vote.spare,
        abstain: state.options.allowAbstain,
      },
    ];
  }

  return [];
}
