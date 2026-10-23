import type { Composition, RoleId } from './ids.ts';

/**
 * Poids de chaque role pour l'indicateur d'equilibre (`docs/02`
 * §Compositions). Positif : il aide le village ; negatif : les loups. Chaque
 * role ajoute plus tard declare le sien ; un role sans poids compte pour 0.
 *
 * Ce sont des donnees de configuration, pas un resultat de jeu : l'ecran de
 * configuration les lit pour suivre les + et − du meneur sans aller-retour.
 */
export const ROLE_WEIGHTS: Readonly<Partial<Record<RoleId, number>>> = {
  villager: 1,
  werewolf: -6,
  seer: 7,
  witch: 4,
  hunter: 3,
  cupid: -2,
  'little-girl': 3,
};

/** Au-dela de cet ecart, un camp est avantage. */
const BALANCED_WITHIN = 3;

export interface Balance {
  readonly score: number;
  readonly verdict: 'village' | 'balanced' | 'wolves';
}

/** L'equilibre d'une composition : la somme des poids, et son verdict. */
export function balanceOf(composition: Composition): Balance {
  const score = (Object.entries(composition) as [RoleId, number][]).reduce(
    (sum, [role, count]) => sum + (ROLE_WEIGHTS[role] ?? 0) * count,
    0,
  );
  const verdict =
    score > BALANCED_WITHIN ? 'village' : score < -BALANCED_WITHIN ? 'wolves' : 'balanced';

  return { score, verdict };
}
