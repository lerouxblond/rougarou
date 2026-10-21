import { z } from 'zod';

import { PROTOCOL_VERSION } from './version.ts';

/**
 * Reponse de `GET /api/health`.
 *
 * `strictObject` refuse toute cle inconnue : le protocole est valide des deux
 * cotes et on ne laisse jamais passer de JSON non decrit (`CLAUDE.md` regle 4).
 */
export const healthResponseSchema = z.strictObject({
  status: z.literal('ok'),
  /** Version du protocole servie par ce Worker. */
  protocol: z.literal(PROTOCOL_VERSION),
  /** Horloge du serveur, en millisecondes. Elle fait autorite (`docs/12` §5). */
  now: z.int(),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;
