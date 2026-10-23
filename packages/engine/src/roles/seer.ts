import type { Knowledge } from '@rougarou/protocol';

import { requireAliveTarget } from '../auth.ts';
import type { NightStepSpec } from '../night/types.ts';
import { alivePlayers, getPlayer, livingWithRole } from '../state.ts';
import { engineError } from '../tx.ts';
import { teamOf } from './index.ts';
import type { RoleDefinition } from './types.ts';

/** Ce que la Voyante apprend en sondant `target`, selon `seerMode`. */
function probeResult(state: Parameters<NightStepSpec['actors']>[0], target: string): Knowledge {
  const night = state.nightNumber;

  if (state.options.seerMode === 'team') {
    // Le camp effectif : un infecte (M6) apparait comme loup (`docs/02`, cas limite 9).
    const team = teamOf(state, target);

    if (team === null) {
      throw new Error(`Joueur sans role sonde : ${target}`);
    }

    return { kind: 'seerTeam', night, playerId: target, team };
  }

  const { role } = getPlayer(state, target);

  if (role === null) {
    throw new Error(`Joueur sans role sonde : ${target}`);
  }

  return { kind: 'seerRole', night, playerId: target, role };
}

const seerStep: NightStepSpec = {
  id: 'seer',
  order: 30,
  wakes: 'everyNight',
  timer: 'nightAction',

  actors: (state) => livingWithRole(state, 'seer'),

  submit(tx, actor, action) {
    if (action.kind !== 'seerProbe') {
      return engineError('INVALID_COMMAND', 'errors.night.wrong_action');
    }

    if (tx.state.night?.stepResolved !== false) {
      return engineError('WRONG_PHASE', 'errors.seer.already_probed');
    }

    const targetError = requireAliveTarget(tx.state, action.target);

    if (targetError !== null) {
      return targetError;
    }

    if (action.target === actor) {
      return engineError('INVALID_TARGET', 'errors.seer.self');
    }

    // Resultat immediat (`R-21`) : il entre aussitot dans ses infos.
    tx.emit({
      type: 'KnowledgeGained',
      playerId: actor,
      knowledge: probeResult(tx.state, action.target),
    });
    tx.emit({ type: 'NightStepResolved' });
    return null;
  },

  resolveByDefault(tx) {
    // Minuteur ou forcage : elle ne sonde personne.
    tx.emit({ type: 'NightStepResolved' });
  },

  actionsFor(state, actor) {
    const targets = alivePlayers(state)
      .map((player) => player.id)
      .filter((id) => id !== actor);

    return [{ type: 'SubmitNightAction', kind: 'seerProbe', targets }];
  },

  viewFor(state) {
    return { step: 'seer', resolved: state.night?.stepResolved ?? false };
  },
};

/** Voyante (`docs/02`) : chaque nuit, elle sonde un joueur et apprend son role ou son camp. */
export const seer: RoleDefinition = {
  id: 'seer',
  team: 'village',
  tier: 'core',
  unique: true,
  wakes: 'everyNight',
  nightSteps: [seerStep],
  knowsTeammates: false,
};
