import type {
  ActionDescriptor,
  Actor,
  CommandInput,
  GameOptionsInput,
  PlayerId,
  RoleId,
} from '@rougarou/protocol';

import { availableActions, createRng, type Rng, type Viewer } from '../src/index.ts';
import { NARRATOR, player, setup, SYSTEM, type GameDriver } from './dsl.ts';

/** Un coup joue par le robot. */
export interface Move {
  readonly actor: Actor;
  readonly cmd: CommandInput;
}

/** La valeur la plus frequente d'une liste, s'il y en a une. */
function mostCommon(values: readonly string[]): string | undefined {
  const counts = new Map<string, number>();

  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return [...counts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0];
}

/**
 * Traduit une action proposee en commande, avec un peu de strategie pour que
 * les parties avancent : les loups suivent souvent la meute, et les
 * villageois suivent souvent le vote en tete.
 */
function toCommand(game: GameDriver, rng: Rng, descriptor: ActionDescriptor): CommandInput | null {
  switch (descriptor.type) {
    case 'ConfirmRoleSeen':
    case 'DeclareCandidacy':
    case 'WithdrawCandidacy':
      return { type: descriptor.type };
    case 'SubmitNightAction': {
      const pack = mostCommon(Object.values(game.state.night?.wolfVotes ?? {}));
      const target = pack !== undefined && rng.next() < 0.8 ? pack : rng.pick(descriptor.targets);

      return { type: 'SubmitNightAction', action: { kind: 'wolfVote', target } };
    }
    case 'CastVote': {
      const ballots = Object.values(game.state.vote?.ballots ?? {}).flatMap((ballot) =>
        ballot.kind === 'player' ? [ballot.playerId] : [],
      );
      const leader = mostCommon([...ballots, ...Object.values(game.state.election?.ballots ?? {})]);
      const roll = rng.next();

      if (descriptor.spare && roll < 0.05) {
        return { type: 'CastVote', ballot: { kind: 'spare' } };
      }

      if (descriptor.abstain && roll < 0.1) {
        return { type: 'CastVote', ballot: { kind: 'abstain' } };
      }

      const target =
        leader !== undefined && descriptor.targets.includes(leader) && roll < 0.6
          ? leader
          : rng.pick(descriptor.targets);

      return { type: 'CastVote', ballot: { kind: 'player', playerId: target } };
    }
    case 'BreakTie':
    case 'DesignateSuccessor':
      return { type: descriptor.type, playerId: rng.pick(descriptor.targets) };
    case 'ResolveWolfTie':
      return { type: 'ResolveWolfTie', target: rng.pick(descriptor.targets) };
    case 'AdvancePhase':
      return { type: 'AdvancePhase', force: descriptor.blocked };
    default:
      // Salon et configuration : le robot part d'une partie deja distribuee.
      return null;
  }
}

/** Les coups possibles d'un acteur, d'apres `availableActions`. */
function movesOf(game: GameDriver, rng: Rng, actor: Actor): Move[] {
  const viewer: Viewer = actor.kind === 'player' ? actor : { kind: 'narrator' };

  return availableActions(game.state, viewer).flatMap((descriptor) => {
    const cmd = toCommand(game, rng, descriptor);

    return cmd === null ? [] : [{ actor, cmd }];
  });
}

/** Choisit un coup au hasard : surtout des joueurs, parfois le meneur, rarement un minuteur. */
export function randomMove(game: GameDriver, rng: Rng): Move | null {
  if (game.state.deadline !== null && rng.next() < 0.03) {
    game.now = Math.max(game.now, game.state.deadline);
    return { actor: SYSTEM, cmd: { type: 'Timeout' } };
  }

  const playerMoves = game.state.seats.flatMap((id) => movesOf(game, rng, player(id)));
  const narratorMoves = movesOf(game, rng, NARRATOR);

  if (playerMoves.length > 0 && (narratorMoves.length === 0 || rng.next() < 0.85)) {
    return rng.pick(playerMoves);
  }

  return narratorMoves.length > 0 ? rng.pick(narratorMoves) : null;
}

export interface RandomGameOptions {
  readonly roles: Readonly<Record<PlayerId, RoleId>>;
  readonly options?: GameOptionsInput;
  readonly seed: number;
  readonly maxMoves?: number;
  /** Appele apres chaque coup accepte, et une fois au depart. */
  readonly onStep?: (game: GameDriver) => void;
}

/**
 * Joue une partie au hasard jusqu'a la fin (ou `maxMoves` coups). Tout coup
 * propose par `availableActions` doit etre accepte par `apply` : sinon c'est
 * une incoherence entre les deux, et le test echoue.
 */
export function playRandomGame({
  roles,
  options = {},
  seed,
  maxMoves = 5000,
  onStep,
}: RandomGameOptions): GameDriver {
  const game = setup({ roles, options, seed });
  const rng = createRng(seed * 7919 + 1);

  onStep?.(game);

  for (let moves = 0; moves < maxMoves && game.state.phase !== 'ENDED'; moves += 1) {
    const move = randomMove(game, rng);

    if (move === null) {
      throw new Error(`Aucun coup possible en ${game.state.phase}`);
    }

    const result = game.send(move.actor, move.cmd);

    if (!result.ok) {
      throw new Error(
        `Coup propose mais refuse : ${JSON.stringify(move)} -> ${result.error.code} (${result.error.messageKey}) en ${game.state.phase}`,
      );
    }

    onStep?.(game);
  }

  return game;
}

/** Une distribution de `count` joueurs avec `wolves` loups, melangee par `seed`. */
export function randomRoles(count: number, wolves: number, seed: number): Record<PlayerId, RoleId> {
  const deck: RoleId[] = [
    ...Array.from({ length: wolves }, () => 'werewolf' as const),
    ...Array.from({ length: count - wolves }, () => 'villager' as const),
  ];
  const shuffled = createRng(seed).shuffle(deck);

  return Object.fromEntries(
    shuffled.map((role, index) => [`p${String(index).padStart(2, '0')}`, role]),
  );
}
