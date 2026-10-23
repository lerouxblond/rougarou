import type { NarratorView, PlayerId, PlayerView } from '@rougarou/protocol';

import { availableActions, type Viewer } from './actions.ts';
import { getMode } from './modes/index.ts';
import { currentStep, observerSpecOf } from './night/flow.ts';
import type { PlayerNightView } from './night/types.ts';
import { everyoneVoted } from './phases/day.ts';
import { cardReached } from './phases/deal.ts';
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
  if (viewer.kind === 'narrator') {
    return narratorView(state);
  }

  const view = playerView(state, viewer.playerId);
  const { project } = getMode(state.options.gameMode);

  return project === undefined ? view : project(view, state);
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
    // En ceremonie, sa carte n'arrive qu'avec sa main (`R-17`).
    return cardReached(state, viewer.id);
  }

  // `R-60` : un mort voit tous les roles avec `deadSeeRoles`.
  if (!viewer.alive && state.options.deadSeeRoles) {
    return true;
  }

  // Ses infos lui ont appris ce role : Voyante, amoureux (ADR 0010).
  if (learnedRole(viewer, target)) {
    return true;
  }

  // Les loups se connaissent (`docs/02`).
  return (
    getRole(viewer.role).knowsTeammates && teamOf(state, viewer.id) === teamOf(state, target.id)
  );
}

/**
 * Une info du lecteur donne-t-elle le role actuel de `target` ? Une info est
 * un instantane : si le role a change depuis (M6), elle ne le donne plus.
 */
function learnedRole(viewer: PlayerState, target: PlayerState): boolean {
  return viewer.knowledge.some(
    (info) =>
      (info.kind === 'seerRole' || info.kind === 'lover') &&
      info.playerId === target.id &&
      info.role === target.role,
  );
}

function playerView(state: GameState, viewerId: PlayerId): PlayerView {
  const me = state.players[viewerId];
  // `R-12` : avant « Lever le jour », l'aube est encore la nuit pour les joueurs.
  const hiddenDawn = state.phase === 'DAWN' && state.dawn?.announced !== true;
  const night = nightViewOf(state, viewerId);
  const acting = night !== null;
  const secret = state.options.voteVisibility === 'secret';
  // La nuit, seul celui qui agit voit le minuteur (`docs/12` §4), pause comprise (`R-16`).
  const seesTimer = !(state.phase === 'NIGHT' && !acting) && !hiddenDawn;

  return {
    kind: 'player',
    gameId: state.gameId,
    phase: hiddenDawn ? 'NIGHT' : state.phase,
    me:
      me === undefined
        ? null
        : {
            id: me.id,
            role: cardReached(state, me.id) ? me.role : null,
            alive: me.alive,
            roleSeen: me.roleSeen,
            knowledge: [...me.knowledge],
          },
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
    deadline: seesTimer ? state.deadline : null,
    pausedRemaining: seesTimer ? state.pausedRemaining : null,
    ceremony: ceremonyOf(state),
    night,
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
            tieBroken: state.vote.tieBroken === null ? null : { ...state.vote.tieBroken },
            closed: state.vote.closed,
            ballots: secret ? own(state.vote.ballots, viewerId) : { ...state.vote.ballots },
            tally: secret ? null : (state.vote.result?.tally ?? null),
            outcome: state.vote.result?.outcome ?? null,
          },
    pending: state.pending.map((effect) => ({ kind: effect.kind, from: effect.from })),
    winner: state.winner,
    // Le journal ne part vers un joueur qu'a la fin (`R-19`).
    journal: state.phase === 'ENDED' ? [...state.journal] : null,
    actions: availableActions(state, { kind: 'player', playerId: viewerId }),
  };
}

/**
 * Ce que le lecteur voit de l'etape de nuit en cours : rien, sauf s'il y agit
 * ou la regarde (`docs/04` §Projection, nuit uniforme).
 */
function nightViewOf(state: GameState, viewerId: PlayerId): PlayerNightView | null {
  if (state.phase !== 'NIGHT') {
    return null;
  }

  const step = currentStep(state);

  if (step.actors(state).includes(viewerId)) {
    return step.viewFor(state, viewerId);
  }

  return observerSpecOf(state, viewerId)?.viewFor(state, viewerId) ?? null;
}

/** Qui a la main pendant une distribution en ceremonie (`R-17`). Elle est publique. */
function ceremonyOf(state: GameState): { turn: PlayerId | null } | null {
  if (state.phase !== 'DEAL' || state.ceremonyTurn === null) {
    return null;
  }

  return { turn: state.seats[state.ceremonyTurn] ?? null };
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
        knowledge: [...player.knowledge],
      };
    }),
    options: state.options,
    composition: state.composition,
    nightNumber: state.nightNumber,
    deadline: state.deadline,
    pausedRemaining: state.pausedRemaining,
    ceremony: ceremonyOf(state),
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
            witch: night.witch === null ? null : { ...night.witch },
            spy:
              night.spy === null
                ? null
                : { playerId: night.spy.playerId, caught: night.spy.caught },
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
            tieBroken: vote.tieBroken === null ? null : { ...vote.tieBroken },
            closed: vote.closed,
            ballots: { ...vote.ballots },
            tally: vote.result?.tally ?? null,
            outcome: vote.result?.outcome ?? null,
          },
    lovers: state.lovers === null ? null : [state.lovers[0], state.lovers[1]],
    potions: Object.fromEntries(
      Object.entries(state.potions).map(([id, potions]) => [id, { ...potions }]),
    ),
    pending: state.pending.map((effect) => ({ kind: effect.kind, from: effect.from })),
    winner: state.winner,
    everyoneVoted: everyoneVoted(state),
    suggestion:
      state.phase === 'CONFIG'
        ? getMode(state.options.gameMode).suggestComposition(state.seats.length)
        : null,
    journal: [...state.journal],
    actions: availableActions(state, { kind: 'narrator' }),
  };
}
