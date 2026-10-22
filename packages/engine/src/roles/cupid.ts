import type { PlayerId } from '@rougarou/protocol';

import { requireAliveTarget } from '../auth.ts';
import { partnerOf } from '../lovers.ts';
import type { NightStepSpec } from '../night/types.ts';
import { alivePlayers, getPlayer, livingWithRole, type GameState } from '../state.ts';
import { engineError } from '../tx.ts';
import type { RoleDefinition } from './types.ts';

/** Les amoureux encore en vie. */
function livingLovers(state: GameState): PlayerId[] {
  return (state.lovers ?? []).filter((id) => state.players[id]?.alive === true);
}

/** Cupidon designe deux vivants distincts, lui compris (`docs/02`, P22). */
const cupidStep: NightStepSpec = {
  id: 'cupid',
  order: 10,
  wakes: 'firstNight',
  timer: 'nightAction',

  actors: (state) => livingWithRole(state, 'cupid'),

  submit(tx, actor, action) {
    if (action.kind !== 'cupidLink') {
      return engineError('INVALID_COMMAND', 'errors.night.wrong_action');
    }

    if (tx.state.night?.stepResolved !== false) {
      return engineError('WRONG_PHASE', 'errors.cupid.already_linked');
    }

    for (const target of action.lovers) {
      const targetError = requireAliveTarget(tx.state, target);

      if (targetError !== null) {
        return targetError;
      }
    }

    const [first, second] = action.lovers;

    if (first === second) {
      return engineError('INVALID_TARGET', 'errors.cupid.same_player');
    }

    tx.emit({ type: 'LoversLinked', cupid: actor, lovers: [first, second] });
    tx.emit({
      type: 'KnowledgeGained',
      playerId: actor,
      knowledge: { kind: 'couple', players: [first, second] },
    });
    tx.emit({ type: 'NightStepResolved' });
    return null;
  },

  resolveByDefault(tx) {
    // Minuteur ou forcage : pas d'amoureux.
    tx.emit({ type: 'NightStepResolved' });
  },

  actionsFor(state) {
    return [
      {
        type: 'SubmitNightAction',
        kind: 'cupidLink',
        targets: alivePlayers(state).map((player) => player.id),
      },
    ];
  },

  viewFor(state) {
    return { step: 'cupid', resolved: state.night?.stepResolved ?? false };
  },
};

/**
 * Les amoureux se decouvrent (`docs/02`, P22) : a l'entree de l'etape, chacun
 * apprend le pseudo et le role de l'autre, puis confirme. Avant, leur vue ne
 * bouge pas, pour ne pas trahir le moment ou Cupidon a choisi.
 */
const loversStep: NightStepSpec = {
  id: 'lovers',
  order: 12,
  wakes: 'firstNight',
  timer: 'nightAction',

  // L'etape existe des que Cupidon joue : le couple n'est connu qu'en cours de nuit.
  scheduled: (state) => livingWithRole(state, 'cupid').length > 0,

  actors: livingLovers,

  onEnter(tx) {
    for (const lover of livingLovers(tx.state)) {
      const partner = partnerOf(tx.state, lover);
      const role = partner === null ? null : getPlayer(tx.state, partner).role;

      if (partner !== null && role !== null) {
        tx.emit({
          type: 'KnowledgeGained',
          playerId: lover,
          knowledge: { kind: 'lover', playerId: partner, role },
        });
      }
    }
  },

  submit(tx, actor, action) {
    if (action.kind !== 'loversConfirm') {
      return engineError('INVALID_COMMAND', 'errors.night.wrong_action');
    }

    if (tx.state.night?.stepResolved !== false || tx.state.night.loversConfirmed.includes(actor)) {
      return engineError('WRONG_PHASE', 'errors.lovers.already_confirmed');
    }

    tx.emit({ type: 'LoverConfirmed', playerId: actor });

    const confirmed = tx.state.night.loversConfirmed;

    if (livingLovers(tx.state).every((lover) => confirmed.includes(lover))) {
      tx.emit({ type: 'NightStepResolved' });
    }

    return null;
  },

  resolveByDefault(tx) {
    // Minuteur ou forcage : confirme d'office.
    tx.emit({ type: 'NightStepResolved' });
  },

  actionsFor(state, actor) {
    return state.night?.loversConfirmed.includes(actor) === true
      ? []
      : [{ type: 'SubmitNightAction', kind: 'loversConfirm' }];
  },

  viewFor(state, actor) {
    const partner = partnerOf(state, actor);

    if (partner === null) {
      throw new Error(`Amoureux sans partenaire : ${actor}`);
    }

    return {
      step: 'lovers',
      resolved: state.night?.stepResolved ?? false,
      partner,
      confirmed: state.night?.loversConfirmed.includes(actor) ?? false,
    };
  },
};

/** Cupidon (`docs/02`) : la nuit 1, il forme un couple d'amoureux. */
export const cupid: RoleDefinition = {
  id: 'cupid',
  team: 'village',
  tier: 'core',
  unique: true,
  wakes: 'firstNight',
  nightSteps: [cupidStep, loversStep],
  knowsTeammates: false,
};
