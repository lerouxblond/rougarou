import type { PlayerId } from '@rougarou/protocol';

import { requireAliveTarget } from '../auth.ts';
import type { NightStepSpec } from '../night/types.ts';
import { alivePlayers, type GameState } from '../state.ts';
import { engineError, type Tx } from '../tx.ts';
import type { RoleDefinition } from './types.ts';

/** Les loups vivants : ceux dont le role est du camp des loups. */
export function livingWolves(state: GameState): PlayerId[] {
  return alivePlayers(state)
    .filter((player) => player.role !== null && WOLF_ROLES.has(player.role))
    .map((player) => player.id);
}

/** Roles qui votent avec la meute. Les loups d'extension s'ajoutent en M6. */
const WOLF_ROLES: ReadonlySet<string> = new Set(['werewolf']);

/** Les cibles qui ont le plus de voix, dans l'ordre des places. */
function leaders(state: GameState, votes: Readonly<Record<PlayerId, PlayerId>>): PlayerId[] {
  const counts = new Map<PlayerId, number>();

  for (const target of Object.values(votes)) {
    counts.set(target, (counts.get(target) ?? 0) + 1);
  }

  const best = Math.max(...counts.values());

  return state.seats.filter((id) => counts.get(id) === best);
}

/**
 * Le vote des loups (`R-34`). L'etape est resolue :
 * - `unanimous` : des que tous les loups vivants designent la meme cible ;
 * - `majority` : des que tous ont vote ; une egalite attend le meneur.
 */
function resolveIfComplete(tx: Tx): void {
  const { night, options } = tx.state;

  if (night === null || night.stepResolved) {
    return;
  }

  const wolves = livingWolves(tx.state);
  const votes = night.wolfVotes;

  if (!wolves.every((wolf) => votes[wolf] !== undefined)) {
    return;
  }

  const targets = leaders(tx.state, votes);
  const [first] = targets;

  if (options.wolfVoteMode === 'unanimous') {
    if (targets.length === 1 && wolves.every((wolf) => votes[wolf] === first)) {
      tx.emit({ type: 'WolvesResolved', victim: first ?? null });
    }

    return;
  }

  if (targets.length === 1) {
    tx.emit({ type: 'WolvesResolved', victim: first ?? null });
  } else if (night.wolfTie === null) {
    tx.emit({ type: 'WolfTieDetected', tied: targets });
  }
}

const wolvesStep: NightStepSpec = {
  id: 'wolves',
  order: 40,
  wakes: 'everyNight',
  timer: 'wolfVote',

  actors: livingWolves,

  submit(tx, actor, action) {
    const { night } = tx.state;

    if (night === null) {
      throw new Error('Vote des loups hors de la nuit.');
    }

    if (action.kind !== 'wolfVote') {
      return engineError('INVALID_COMMAND', 'errors.night.wrong_action');
    }

    if (!livingWolves(tx.state).includes(actor)) {
      return engineError('NOT_YOUR_TURN');
    }

    const targetError = requireAliveTarget(tx.state, action.target);

    if (targetError !== null) {
      return targetError;
    }

    // Un loup ne peut pas cibler un autre loup (`docs/02`).
    if (livingWolves(tx.state).includes(action.target)) {
      return engineError('INVALID_TARGET', 'errors.wolves.target_is_wolf');
    }

    if (night.stepResolved) {
      return engineError('WRONG_PHASE', 'errors.wolves.already_resolved');
    }

    tx.emit({ type: 'WolfVoteCast', wolf: actor, target: action.target });

    // Un loup qui change d'avis leve l'egalite que le meneur devait trancher.
    if (night.wolfTie !== null) {
      tx.emit({ type: 'WolfTieDetected', tied: [] });
    }

    resolveIfComplete(tx);
    return null;
  },

  resolveByDefault(tx) {
    // Pas d'accord avant la fin : pas de victime (`R-34`, `R-13`).
    tx.emit({ type: 'WolvesResolved', victim: null });
  },

  dawn(state, deaths) {
    // `R-40` : la cible des loups en premier, si elle est encore en vie.
    const victim = state.night?.wolfVictim ?? null;

    return victim !== null && state.players[victim]?.alive === true
      ? [...deaths, { playerId: victim, cause: 'wolves' }]
      : [...deaths];
  },

  actionsFor(state) {
    const wolves = livingWolves(state);
    const targets = alivePlayers(state)
      .map((player) => player.id)
      .filter((id) => !wolves.includes(id));

    return [{ type: 'SubmitNightAction', kind: 'wolfVote', targets }];
  },

  viewFor(state) {
    return {
      step: 'wolves',
      resolved: state.night?.stepResolved ?? false,
      wolfVotes: { ...state.night?.wolfVotes },
    };
  },
};

/**
 * Le meneur departage une egalite du vote des loups, en mode `majority`
 * (`R-34`).
 */
export function resolveWolfTie(tx: Tx, target: PlayerId): ReturnType<NightStepSpec['submit']> {
  const tie = tx.state.night?.wolfTie ?? null;

  if (tie === null) {
    return engineError('WRONG_PHASE', 'errors.wolves.no_tie');
  }

  if (!tie.includes(target)) {
    return engineError('INVALID_TARGET', 'errors.wolves.not_tied');
  }

  tx.emit({ type: 'WolvesResolved', victim: target });
  return null;
}

/**
 * Loup-garou (`docs/02`) : les loups se reconnaissent et votent ensemble pour
 * une victime chaque nuit (`R-34`).
 */
export const werewolf: RoleDefinition = {
  id: 'werewolf',
  team: 'wolves',
  tier: 'core',
  unique: false,
  wakes: 'everyNight',
  nightSteps: [wolvesStep],
  knowsTeammates: true,
};
