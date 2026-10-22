import { meResponseSchema, updateMeRequestSchema, type MeResponse } from '@rougarou/protocol';
import { eq } from 'drizzle-orm';
import { Hono } from 'hono';

import { apiError } from '../api-error.ts';
import type { AppEnv } from '../app-env.ts';
import { database } from '../auth.ts';
import * as schema from '../db/schema.ts';
import { requireUser } from '../session.ts';

/**
 * Profil de l'utilisateur connecte (US-01, D-21). Un invite (D-04) n'a pas
 * d'e-mail visible : celui que Better Auth lui attribue est technique.
 */
export const me = new Hono<AppEnv>()
  .use(requireUser)
  .get('/', async (context) => {
    const { user } = context.var;
    const profile = await database(context.env).query.profile.findFirst({
      where: eq(schema.profile.userId, user.id),
    });

    if (profile === undefined) {
      return context.json(apiError('NOT_FOUND'), 404);
    }

    const body: MeResponse = {
      id: user.id,
      displayName: profile.displayName,
      email: user.isAnonymous ? null : user.email,
      guest: user.isAnonymous,
    };

    return context.json(meResponseSchema.parse(body));
  })
  .patch('/', async (context) => {
    const parsed = updateMeRequestSchema.safeParse(await context.req.json().catch(() => null));

    if (!parsed.success) {
      return context.json(apiError('INVALID_MESSAGE'), 400);
    }

    await database(context.env)
      .update(schema.profile)
      .set({ displayName: parsed.data.displayName })
      .where(eq(schema.profile.userId, context.var.user.id));

    return context.body(null, 204);
  })
  /**
   * Suppression du compte en libre-service (D-21). Les sessions, comptes et
   * profil partent en cascade ; les lignes de parties restent, anonymisees
   * (`user_id` a `null`, le pseudo de la partie est garde).
   */
  .delete('/', async (context) => {
    const { auth, user } = context.var;
    const signOut = await auth.api.signOut({
      headers: context.req.raw.headers,
      asResponse: true,
    });

    await database(context.env).delete(schema.user).where(eq(schema.user.id, user.id));

    const response = context.body(null, 204);

    for (const cookie of signOut.headers.getSetCookie()) {
      response.headers.append('set-cookie', cookie);
    }

    return response;
  });
