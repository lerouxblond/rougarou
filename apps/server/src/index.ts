import { Hono } from 'hono';
import { cors } from 'hono/cors';

import { apiError } from './api-error.ts';
import type { AppEnv } from './app-env.ts';
import { DEV_ORIGINS, NATIVE_ORIGINS } from './auth.ts';
import { health } from './routes/health.ts';
import { me } from './routes/me.ts';
import { withAuth } from './session.ts';

const app = new Hono<AppEnv>();

/**
 * Origines autorisees a appeler l'API (`docs/04` §Securite).
 *
 * Le web est servi par ce meme Worker, donc sur la meme origine : il n'a pas
 * besoin de CORS. Seules les apps Tauri, qui ont leur propre origine, en ont
 * besoin, plus le serveur Vite en developpement.
 */
app.use(
  '/api/*',
  cors({
    origin: (origin) => {
      if (NATIVE_ORIGINS.includes(origin)) {
        return origin;
      }

      return DEV_ORIGINS.includes(origin) ? origin : null;
    },
    credentials: true,
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  }),
);

app.route('/api', health);

app.use('/api/auth/*', withAuth);
app.on(['GET', 'POST'], '/api/auth/*', (context) => context.var.auth.handler(context.req.raw));

app.use('/api/me', withAuth);
app.route('/api/me', me);

/**
 * Une route d'API inconnue renvoie du JSON, jamais le `index.html` de la SPA :
 * un client qui recoit du HTML sur `/api/*` est beaucoup plus dur a diagnostiquer.
 */
app.notFound((context) => context.json(apiError('NOT_FOUND'), 404));

app.onError((error, context) => {
  // Logs structures, sans aucune donnee personnelle ni role cache (docs/04).
  console.error(JSON.stringify({ message: 'unhandled_error', error: String(error) }));

  return context.json(apiError('INTERNAL'), 500);
});

export default app;
