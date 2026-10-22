import { defineConfig, devices } from '@playwright/test';

/**
 * Tests de bout en bout (`docs/09`).
 *
 * Ils tournent contre `wrangler dev`, donc contre le Worker reel qui sert a la
 * fois l'API et les assets : c'est la seule facon de verifier le routage, le
 * repli SPA et les en-tetes, que les tests unitaires ne couvrent pas.
 *
 * Une partie a plusieurs joueurs ouvre un contexte de navigateur par personne
 * (1 meneur et 5 joueurs, `docs/09`). `E2E_BASE_URL` vise un deploiement
 * (preview ou production) au lieu du Worker local.
 */
const PORT = 8787;
const REMOTE_URL = process.env.E2E_BASE_URL;
const BASE_URL = REMOTE_URL ?? `http://127.0.0.1:${PORT}`;

/** Secret de session du Worker local : propre aux tests, jamais deploye. */
const LOCAL_AUTH_SECRET = 'e2e-local-secret-not-used-anywhere-else-0123456789';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // Safari mobile est la cible iPhone de la V1 (D-19 : pas d'app native iOS).
    { name: 'mobile-webkit', use: { ...devices['iPhone 14'] } },
  ],

  // Contre un deploiement, il n'y a pas de serveur local a lancer.
  ...(REMOTE_URL === undefined
    ? {
        webServer: {
          // Le Worker sert les assets de `apps/web/dist` : le build doit avoir
          // eu lieu avant. La D1 locale recoit d'abord les migrations.
          command: [
            'pnpm --filter @rougarou/server exec wrangler d1 migrations apply DB --local',
            `pnpm --filter @rougarou/server exec wrangler dev --port ${String(PORT)} --local --var BETTER_AUTH_SECRET:${LOCAL_AUTH_SECRET}`,
          ].join(' && '),
          url: `${BASE_URL}/api/health`,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
      }
    : {}),
});
