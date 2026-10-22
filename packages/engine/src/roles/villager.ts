import type { RoleDefinition } from './types.ts';

/** Simple villageois : aucun pouvoir, il debat et vote (`docs/02`). */
export const villager: RoleDefinition = {
  id: 'villager',
  team: 'village',
  tier: 'core',
  unique: false,
  wakes: 'never',
  knowsTeammates: false,
};
