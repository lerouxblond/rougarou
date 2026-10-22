import type { NarratorView, PlayerId, PlayerView } from '@rougarou/protocol';

import { availableActions, type Viewer } from './actions.ts';
import { currentStep } from './night/flow.ts';
import { everyoneVoted } from './phases/day.ts';
import { getRole, teamOf } from './roles/index.ts';
import { getPlayer, type GameState, type PlayerState } from './state.ts';

/**
 * La vue que `viewer` a le droit de recevoir (`CLAUDE.md` regle 2).
 *
 * C'est la seule fonction qui produit ce qui part vers un client. Elle
 * construit chaque vue champ par champ, a partir de rien : ce qui n'est pas
 * explicitement ajoute ici ne quitte jamais le serveur (liste blanche).
 */
export function projectView(state: GameState, viewer: Viewer): PlayerView | NarratorView {
  return viewer.kind === 'narrator' ? narratorView(state) : playerView(state, viewer.playerId);
}

/** Le lecteur peut-il connaitre le role de `target` ? */
function canSeeRole(
  state: GameState,
  viewer: PlayerState | undefined,
  target: PlayerState,
): boolean {
  if (state.phase === 'ENDED' || target.roleRevealed) {
    return true;
  }

  if (viewer === undefined || viewer.role === null) {
    return false;
  }

  if (viewer.id === target.id) {
    return true;
  }

  // `R-60` : un mort voit tous les roles avec `deadSeeRoles`.
  if (!viewer.alive && state.options.deadSeeRoles) {
    return true;
  }

  // Les loups se connaissent (`docs/02`).
  return (
    getRole(viewer.role).knowsTeammates && teamOf(state, viewer.id) === teamOf(state, target.id)
  );
}

function playerView(state: GameState, viewerId: PlayerId): PlayerView {
  const me = state.players[viewerId];
  // `R-12` : avant « Lever le jour », l'aube est encore la nuit pour les joueurs.
  const hiddenDawn = state.phase === 'DAWN' && state.dawn?.announced !== true;
  const acting = actsTonight(state, viewerId);
  const secret = state.options.voteVisibility === 'secret';

  return {
    kind: 'player',
    gameId: state.gameId,
    phase: hiddenDawn ? 'NIGHT' : state.phase,
    me:
      me === undefined
        ? null
        : { id: me.id, role: me.role, alive: me.alive, roleSeen: me.roleSeen },
    players: state.seats.map((id) => {
      const player = getPlayer(state, id);

      return {
        id,
        name: player.name,
        alive: player.alive,
        mayor: state.mayor === id,
        role: canSeeRole(state, me, player) ? player.role : null,
      };
    }),
    options: state.options,
    composition: state.composition,
    nightNumber: state.nightNumber,
    // La nuit, seul celui qui agit voit le minuteur (`docs/12` §4).
    deadline: state.phase === 'NIGHT' && !acting ? null : hiddenDawn ? null : state.deadline,
    night: acting ? currentStep(state).viewFor(state, viewerId) : null,
    deaths:
      state.dawn?.announced === true ? state.dawn.deaths.map((death) => death.playerId) : null,
    election:
      state.election === null
        ? null
        : {
            stage: state.election.stage,
            candidates: [...state.election.candidates],
            eligible: [...state.election.eligible],
            round: state.election.round,
            ballots: secret ? own(state.election.ballots, viewerId) : { ...state.election.ballots },
          },
    vote:
      state.vote === null
        ? null
        : {
            candidates: [...state.vote.candidates],
            spare: state.vote.spare,
            round: state.vote.round,
            tie: state.vote.tie === null ? null : [...state.vote.tie],
            closed: state.vote.closed,
            ballots: secret ? own(state.vote.ballots, viewerId) : { ...state.vote.ballots },
            tally: secret ? null : (state.vote.result?.tally ?? null),
            outcome: state.vote.result?.outcome ?? null,
          },
    pending: state.pending.map((effect) => ({ kind: effect.kind, from: effect.from })),
    winner: state.winner,
    actions: availableActions(state, { kind: 'player', playerId: viewerId }),
  };
}

/** Le lecteur agit-il dans l'etape de nuit en cours ? */
function actsTonight(state: GameState, viewerId: PlayerId): boolean {
  return state.phase === 'NIGHT' && currentStep(state).actors(state).includes(viewerId);
}

/** Seul le bulletin du lecteur, en vote secret (`R-30`). */
function own<T>(ballots: Readonly<Record<PlayerId, T>>, viewerId: PlayerId): Record<PlayerId, T> {
  const ballot = ballots[viewerId];

  return ballot === undefined ? {} : { [viewerId]: ballot };
}

function narratorView(state: GameState): NarratorView {
  const { night, dawn, election, vote } = state;

  return {
    kind: 'narrator',
    gameId: state.gameId,
    phase: state.phase,
    players: state.seats.map((id) => {
      const player = getPlayer(state, id);

      return {
        id,
        name: player.name,
        alive: player.alive,
        mayor: state.mayor === id,
        role: player.role,
        roleSeen: player.roleSeen,
        roleRevealed: player.roleRevealed,
      };
    }),
    options: state.options,
    composition: state.composition,
    nightNumber: state.nightNumber,
    deadline: state.deadline,
    night:
      night === null
        ? null
        : {
            number: night.number,
            steps: [...night.steps],
            current: night.current,
            stepResolved: night.stepResolved,
            wolfVotes: { ...night.wolfVotes },
            wolfTie: night.wolfTie === null ? null : [...night.wolfTie],
            wolfVictim: night.wolfVictim,
          },
    dawn:
      dawn === null
        ? null
        : { deaths: dawn.deaths.map((death) => ({ ...death })), announced: dawn.announced },
    election:
      election === null
        ? null
        : {
            stage: election.stage,
            candidates: [...election.candidates],
            eligible: [...election.eligible],
            round: election.round,
            ballots: { ...election.ballots },
          },
    vote:
      vote === null
        ? null
        : {
            candidates: [...vote.candidates],
            spare: vote.spare,
            round: vote.round,
            tie: vote.tie === null ? null : [...vote.tie],
            closed: vote.closed,
            ballots: { ...vote.ballots },
            tally: vote.result?.tally ?? null,
            outcome: vote.result?.outcome ?? null,
          },
    pending: state.pending.map((effect) => ({ kind: effect.kind, from: effect.from })),
    winner: state.winner,
    everyoneVoted: everyoneVoted(state),
    actions: availableActions(state, { kind: 'narrator' }),
  };
}
