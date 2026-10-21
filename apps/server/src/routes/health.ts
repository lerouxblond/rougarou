import { healthResponseSchema, PROTOCOL_VERSION, type HealthResponse } from '@rougarou/protocol';
import { Hono } from 'hono';

/**
 * `GET /api/health`.
 *
 * La reponse est construite puis **validee par le schema partage** avant
 * d'etre envoyee : le protocole est verifie des deux cotes, et un Worker qui
 * derive de `packages/protocol` echoue ici plutot que chez le client
 * (`CLAUDE.md` regle 4).
 */
export const health = new Hono().get('/health', (context) => {
  const body: HealthResponse = {
    status: 'ok',
    protocol: PROTOCOL_VERSION,
    now: Date.now(),
  };

  return context.json(healthResponseSchema.parse(body));
});
