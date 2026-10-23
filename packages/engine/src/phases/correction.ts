import type { ActionDescriptor, PlayerId, RoleId } from '@rougarou/protocol';

import { killPlayers } from '../deaths.ts';
import { getMode } from '../modes/index.ts';
import type { EngineError } from '../result.ts';
import { registeredRoles } from '../roles/index.ts';
import { alivePlayers, seatedPlayers, type GameState } from '../state.ts';
import { engineError, type Tx } from '../tx.ts';

/**
 * Mode correction du meneur (`R-18`).
 *
 * On corrige quand la table voit ce qui se passe : a l'aube une fois les
 * morts annoncees, pendant le debat ou a l'execution. La nuit, une mort ou un
 * role qui change trahirait l'etape en cours (nuit uniforme, `docs/04`). Un
 * role se corrige aussi pendant la distribution, avant que la partie parte.
 */
function correctionOpen(state: GameState, what: 'life' | 'role'): boolean {
  switch (state.phase) {
    case 'DAWN':
      return state.dawn?.announced === true;
    case 'DAY_DEBATE':
    case 'EXECUTION':
      return true;
    case 'DEAL':
      return what === 'role';
    default:
      return false;
  }
}

/** Les roles que le meneur peut donner : ceux du moteur que le mode autorise. */
function assignableRoles(state: GameState): RoleId[] {
  const { allowedRoles } = getMode(state.options.gameMode);

  return registeredRoles()
    .map((role) => role.id)
    .filter((id) => allowedRoles === 'all' || allowedRoles.includes(id));
}

function seatedTarget(state: GameState, playerId: PlayerId): EngineError | null {
  return state.players[playerId] === undefined ? engineError('UNKNOWN_PLAYER') : null;
}

/** Tuer : la chaine normale des effets a la mort et la victoire s'appliquent. */
export function correctKill(tx: Tx, playerId: PlayerId): EngineError | null {
  if (!correctionOpen(tx.state, 'life')) {
    return engineError('WRONG_PHASE');
  }

  const unknown = seatedTarget(tx.state, playerId);

  if (unknown !== null) {
    return unknown;
  }

  if (tx.state.players[playerId]?.alive !== true) {
    return engineError('INVALID_TARGET', 'errors.target_dead');
  }

  killPlayers(tx, [{ playerId, cause: 'correction' }]);
  return null;
}

/** Ressusciter : le joueur revient, sans rien rejouer de ce que sa mort a cause. */
export function correctRevive(tx: Tx, playerId: PlayerId): EngineError | null {
  if (!correctionOpen(tx.state, 'life')) {
    return engineError('WRONG_PHASE');
  }

  const unknown = seatedTarget(tx.state, playerId);

  if (unknown !== null) {
    return unknown;
  }

  if (tx.state.players[playerId]?.alive !== false) {
    return engineError('INVALID_TARGET', 'errors.target_alive');
  }

  tx.emit({ type: 'PlayerRevived', playerId });
  return null;
}

/** Changer le role : pouvoirs remis a neuf, et le joueur l'apprend en prive. */
export function correctRole(tx: Tx, playerId: PlayerId, role: RoleId): EngineError | null {
  if (!correctionOpen(tx.state, 'role')) {
    return engineError('WRONG_PHASE');
  }

  const unknown = seatedTarget(tx.state, playerId);

  if (unknown !== null) {
    return unknown;
  }

  if (!assignableRoles(tx.state).includes(role)) {
    return engineError('INVALID_COMMAND', 'errors.composition.role_unavailable');
  }

  tx.emit({
    type: 'RoleCorrected',
    playerId,
    from: tx.state.players[playerId]?.role ?? null,
    to: role,
  });
  return null;
}

/** Les corrections possibles maintenant, pour les boutons du meneur. */
export function correctionActions(state: GameState): ActionDescriptor[] {
  const actions: ActionDescriptor[] = [];

  if (correctionOpen(state, 'life')) {
    const alive = alivePlayers(state).map((player) => player.id);
    const dead = seatedPlayers(state)
      .filter((player) => !player.alive)
      .map((player) => player.id);

    actions.push({ type: 'CorrectKill', targets: alive }, { type: 'CorrectRevive', targets: dead });
  }

  if (correctionOpen(state, 'role')) {
    actions.push({ type: 'CorrectRole', targets: [...state.seats], roles: assignableRoles(state) });
  }

  return actions;
}
