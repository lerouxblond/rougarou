import { createMiddleware } from 'hono/factory';

import { apiError } from './api-error.ts';
import type { AppEnv } from './app-env.ts';
import { createAuth } from './auth.ts';

/** Construit Better Auth pour la requete et le range dans le contexte. */
export const withAuth = createMiddleware<AppEnv>(async (context, next) => {
  context.set('auth', createAuth(context.env, new URL(context.req.url).origin));
  await next();
});

/** Exige une session (compte ou invite) ; sinon 401. */
export const requireUser = createMiddleware<AppEnv>(async (context, next) => {
  const session = await context.var.auth.api.getSession({ headers: context.req.raw.headers });

  if (session === null) {
    return context.json(apiError('UNAUTHENTICATED'), 401);
  }

  context.set('user', {
    id: session.user.id,
    email: session.user.email,
    isAnonymous: session.user.isAnonymous === true,
  });
  return next();
});
