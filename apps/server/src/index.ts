import { Hono } from 'hono';
import { cors } from 'hono/cors';

import { apiError } from './api-error.ts';
import { health } from './routes/health.ts';

/**
 * Origines autorisees a appeler l'API (`docs/04` §Securite).
 *
 * Le web est servi par ce meme Worker, donc sur la meme origine : il n'a pas
 * besoin de CORS. Seules les apps Tauri, qui ont leur propre origine, en ont
 * besoin.
 */
const ALLOWED_ORIGINS = ['tauri://localhost', 'http://tauri.localhost'];

/** En developpement, le serveur Vite tourne sur un autre port. */
const DEV_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173'];

const app = new Hono();

app.use(
  '/api/*',
  cors({
    origin: (origin) => {
      if (ALLOWED_ORIGINS.includes(origin)) {
        return origin;
      }

      return DEV_ORIGINS.includes(origin) ? origin : null;
    },
    credentials: true,
    allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  }),
);

app.route('/api', health);

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
