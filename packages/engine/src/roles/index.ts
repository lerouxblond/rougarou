import type { PlayerId, RoleId, TeamId } from '@rougarou/protocol';

import { getPlayer, type GameState } from '../state.ts';
import type { RoleDefinition } from './types.ts';
import { hunter } from './hunter.ts';
import { seer } from './seer.ts';
import { villager } from './villager.ts';
import { witch } from './witch.ts';
import { werewolf } from './werewolf.ts';

/** Registre des roles implementes. Un role absent d'ici est refuse a la distribution. */
const ROLES: ReadonlyMap<RoleId, RoleDefinition> = new Map(
  [werewolf, villager, seer, witch, hunter].map((role) => [role.id, role]),
);

/** La definition d'un role, ou `undefined` s'il n'est pas encore implemente. */
export function findRole(id: RoleId): RoleDefinition | undefined {
  return ROLES.get(id);
}

/** La definition d'un role distribue. Un role distribue absent du registre est un bug. */
export function getRole(id: RoleId): RoleDefinition {
  const role = ROLES.get(id);

  if (role === undefined) {
    throw new Error(`Role absent du registre : ${id}`);
  }

  return role;
}

/** Tous les roles implementes. */
export function registeredRoles(): RoleDefinition[] {
  return [...ROLES.values()];
}

/** Le camp actuel d'un joueur, ou `null` avant la distribution. */
export function teamOf(state: GameState, playerId: PlayerId): TeamId | null {
  const { role } = getPlayer(state, playerId);

  return role === null ? null : getRole(role).team;
}

export type { RoleDefinition } from './types.ts';
