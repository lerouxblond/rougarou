import { defineConfig, devices } from '@playwright/test';

/**
 * Tests de bout en bout (`docs/09`).
 *
 * Ils tournent contre `wrangler dev`, donc contre le Worker reel qui sert a la
 * fois l'API et les assets : c'est la seule facon de verifier le routage, le
 * repli SPA et les en-tetes, que les tests unitaires ne couvrent pas.
 *
 * A partir du jalon M2, les parties a plusieurs joueurs utiliseront plusieurs
 * contextes de navigateur (1 meneur et N joueurs).
 */
const PORT = 8787;
const BASE_URL = `http://127.0.0.1:${PORT}`;

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

  webServer: {
    // Le Worker sert les assets de `apps/web/dist` : le build doit avoir eu
    // lieu avant.
    command: `pnpm --filter @rougarou/server exec wrangler dev --port ${PORT} --local`,
    url: `${BASE_URL}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
