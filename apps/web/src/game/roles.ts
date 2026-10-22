import type { RoleId } from '@rougarou/protocol';
import { ROLE_ICON_IDS, type RoleIconId, type TeamIconId } from '@rougarou/ui';

/** Le segment i18n d'un role : `little-girl` devient `little_girl` (`docs/09`). */
export function roleKey(role: RoleId): string {
  return role.replaceAll('-', '_');
}

/** Le role a-t-il une carte de repli (`docs/07`) ? */
export function hasCardArt(role: RoleId): role is RoleId & RoleIconId {
  return (ROLE_ICON_IDS as readonly string[]).includes(role);
}

/**
 * Le camp affiche sur la carte : c'est une donnee du catalogue (`docs/02`),
 * pas un resultat de jeu. Le camp effectif d'un joueur, lui, ne vient que du
 * serveur.
 */
export const CARD_TEAMS: Record<RoleIconId, TeamIconId> = {
  werewolf: 'wolves',
  villager: 'village',
  seer: 'village',
  witch: 'village',
  hunter: 'village',
  cupid: 'village',
  'little-girl': 'village',
};
