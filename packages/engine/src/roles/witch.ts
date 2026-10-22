import type { PlayerId } from '@rougarou/protocol';

import { requireAliveTarget } from '../auth.ts';
import type { NightStepSpec } from '../night/types.ts';
import type { EngineError } from '../result.ts';
import { alivePlayers, livingWithRole, type GameState, type Potions } from '../state.ts';
import { engineError } from '../tx.ts';
import type { RoleDefinition } from './types.ts';

/** Les potions qui restent a la Sorciere `witch`. */
export function potionsOf(state: GameState, witch: PlayerId): Potions {
  return state.potions[witch] ?? { life: true, death: true };
}

/** La victime des loups cette nuit, encore en vie. */
function wolfVictim(state: GameState): PlayerId | null {
  const victim = state.night?.wolfVictim ?? null;

  return victim !== null && state.players[victim]?.alive === true ? victim : null;
}

/** La potion de vie peut-elle sauver la victime des loups (`witchSelfSave`) ? */
function canSave(state: GameState, witch: PlayerId): boolean {
  const victim = wolfVictim(state);

  if (victim === null || !potionsOf(state, witch).life) {
    return false;
  }

  if (victim !== witch) {
    return true;
  }

  switch (state.options.witchSelfSave) {
    case 'never':
      return false;
    case 'firstNightOnly':
      return state.nightNumber === 1;
    case 'always':
      return true;
  }
}

function killTargets(state: GameState, witch: PlayerId): PlayerId[] {
  if (!potionsOf(state, witch).death) {
    return [];
  }

  return alivePlayers(state)
    .map((player) => player.id)
    .filter((id) => id !== witch);
}

function checkKill(state: GameState, witch: PlayerId, kill: PlayerId): EngineError | null {
  if (!potionsOf(state, witch).death) {
    return engineError('INVALID_COMMAND', 'errors.witch.no_death_potion');
  }

  const targetError = requireAliveTarget(state, kill);

  if (targetError !== null) {
    return targetError;
  }

  return kill === witch ? engineError('INVALID_TARGET', 'errors.witch.self_poison') : null;
}

const witchStep: NightStepSpec = {
  id: 'witch',
  order: 50,
  wakes: 'everyNight',
  timer: 'nightAction',

  // Elle se reveille meme sans potion : sinon, le meneur trahirait leur usage (`docs/02`).
  actors: (state) => livingWithRole(state, 'witch'),

  submit(tx, actor, action) {
    if (action.kind !== 'witchPotions') {
      return engineError('INVALID_COMMAND', 'errors.night.wrong_action');
    }

    if (tx.state.night?.stepResolved !== false) {
      return engineError('WRONG_PHASE', 'errors.witch.already_chosen');
    }

    if (action.save && !canSave(tx.state, actor)) {
      return engineError('INVALID_COMMAND', 'errors.witch.cannot_save');
    }

    const killError = action.kill === null ? null : checkKill(tx.state, actor, action.kill);

    if (killError !== null) {
      return killError;
    }

    tx.emit({ type: 'WitchActed', witch: actor, save: action.save, kill: action.kill });
    tx.emit({ type: 'NightStepResolved' });
    return null;
  },

  resolveByDefault(tx) {
    // Minuteur ou forcage : elle ne fait rien.
    tx.emit({ type: 'NightStepResolved' });
  },

  actionsFor(state, actor) {
    return [
      {
        type: 'SubmitNightAction',
        kind: 'witchPotions',
        canSave: canSave(state, actor),
        killTargets: killTargets(state, actor),
      },
    ];
  },

  viewFor(state, actor) {
    return {
      step: 'witch',
      resolved: state.night?.stepResolved ?? false,
      victim: wolfVictim(state),
      potions: potionsOf(state, actor),
    };
  },

  dawn(state, deaths) {
    const choice = state.night?.witch ?? null;

    if (choice === null) {
      return [...deaths];
    }

    // `R-40` : la potion de vie retire la victime des loups ; la potion de mort
    // ajoute sa cible, sauf si elle meurt deja.
    const victim = state.night?.wolfVictim ?? null;
    const saved = choice.save
      ? deaths.filter((death) => !(death.playerId === victim && death.cause === 'wolves'))
      : [...deaths];
    const { kill } = choice;

    return kill === null || saved.some((death) => death.playerId === kill)
      ? saved
      : [...saved, { playerId: kill, cause: 'witch' }];
  },
};

/**
 * Sorciere (`docs/02`) : une potion de vie et une potion de mort pour la
 * partie, en une seule reponse par nuit.
 */
export const witch: RoleDefinition = {
  id: 'witch',
  team: 'village',
  tier: 'core',
  unique: true,
  wakes: 'everyNight',
  nightSteps: [witchStep],
  knowsTeammates: false,
};
