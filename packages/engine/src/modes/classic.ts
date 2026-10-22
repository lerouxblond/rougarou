import type { Composition, RoleId } from '@rougarou/protocol';

import { mixedLoversWin } from '../lovers.ts';
import { findRole, teamOf } from '../roles/index.ts';
import { alivePlayers, type GameState } from '../state.ts';
import type { GameModeDefinition, ValidationIssue, WinCondition } from './types.ts';

/** Bornes du nombre de joueurs en Classique (D-07). */
export const CLASSIC_MIN_PLAYERS = 5;
export const CLASSIC_MAX_PLAYERS = 24;

/**
 * Compositions suggerees (`docs/02` §Compositions suggerees) : nombre de loups
 * et roles speciaux du village, cumules d'une tranche a la suivante.
 */
const SUGGESTIONS: readonly {
  readonly from: number;
  readonly wolves: number;
  readonly add: readonly RoleId[];
}[] = [
  { from: 5, wolves: 1, add: ['seer', 'witch'] },
  { from: 7, wolves: 2, add: ['hunter'] },
  { from: 9, wolves: 2, add: ['cupid', 'little-girl'] },
  { from: 12, wolves: 3, add: ['guardian', 'elder'] },
  { from: 16, wolves: 4, add: ['village-idiot', 'fox'] },
  { from: 20, wolves: 5, add: ['raven', 'bear-tamer'] },
];

function countWolves(composition: Composition): number {
  return Object.entries(composition).reduce(
    (sum, [role, count]) => (findRole(role as RoleId)?.team === 'wolves' ? sum + count : sum),
    0,
  );
}

function countRoles(composition: Composition): number {
  return Object.values(composition).reduce((sum, count) => sum + count, 0);
}

/** Tout le monde est mort : personne ne gagne (`R-06`). */
const nobodyAlive: WinCondition = {
  id: 'nobody',
  priority: 100,
  check: (state) => (alivePlayers(state).length === 0 ? 'nobody' : null),
};

/** `R-03` : le couple mixte, seul en vie. Au-dessus des loups et du village (`R-06`). */
const loversWin: WinCondition = {
  id: 'lovers',
  priority: 30,
  check: mixedLoversWin,
};

/** `R-02` : tous les non-loups sont morts, ou parite avec `wolvesWinOnParity`. */
const wolvesWin: WinCondition = {
  id: 'wolves',
  priority: 20,
  check(state: GameState) {
    const alive = alivePlayers(state);
    const wolves = alive.filter((player) => teamOf(state, player.id) === 'wolves').length;
    const others = alive.length - wolves;

    if (wolves === 0) {
      return null;
    }

    return others === 0 || (state.options.wolvesWinOnParity && wolves >= others) ? 'wolves' : null;
  },
};

/** `R-01` : tous les loups sont morts. */
const villageWins: WinCondition = {
  id: 'village',
  priority: 10,
  check(state: GameState) {
    const alive = alivePlayers(state);
    const wolves = alive.filter((player) => teamOf(state, player.id) === 'wolves').length;

    return alive.length > 0 && wolves === 0 ? 'village' : null;
  },
};

/** Le mode Classique (`docs/11` §1) : le jeu de base de `docs/01` et `docs/02`. */
export const classic: GameModeDefinition = {
  id: 'classic',
  disclosure: 'public',
  teams: ['village', 'wolves', 'solo'],
  allowedRoles: 'all',
  minPlayers: CLASSIC_MIN_PLAYERS,
  maxPlayers: CLASSIC_MAX_PLAYERS,

  suggestComposition(playerCount) {
    const tiers = SUGGESTIONS.filter((tier) => playerCount >= tier.from);
    const wolves = tiers.at(-1)?.wolves ?? 1;
    // Seuls les roles deja implementes sont proposes : les autres arrivent avec leur jalon.
    const specials = tiers
      .flatMap((tier) => tier.add)
      .filter((role) => findRole(role) !== undefined);
    const villagers = playerCount - wolves - specials.length;
    const composition: Composition = { werewolf: wolves };

    for (const role of specials) {
      composition[role] = 1;
    }

    return villagers > 0 ? { ...composition, villager: villagers } : composition;
  },

  validateComposition(composition, playerCount) {
    const issues: ValidationIssue[] = [];
    const wolves = countWolves(composition);

    if (playerCount < CLASSIC_MIN_PLAYERS || playerCount > CLASSIC_MAX_PLAYERS) {
      issues.push({ messageKey: 'errors.composition.player_count' });
    }

    if (wolves === 0) {
      issues.push({ messageKey: 'errors.composition.no_wolf' });
    } else if (wolves >= countRoles(composition) - wolves) {
      issues.push({ messageKey: 'errors.composition.too_many_wolves' });
    }

    return issues;
  },

  nightSteps: [],
  winConditions: [nobodyAlive, loversWin, wolvesWin, villageWins],
};
