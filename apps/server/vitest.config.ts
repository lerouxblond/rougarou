import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-plugin';
import { defineConfig } from 'vitest/config';

/**
 * Les tests tournent dans le vrai runtime Workers (`docs/05`).
 *
 * Le paquet s'installe comme un plugin Vite
 * (`cloudflareTest`). Il s'appelait `@cloudflare/vitest-pool-workers`.
 *
 * On configure Miniflare directement plutot que de pointer `wrangler.jsonc` :
 * cette configuration declare les assets statiques de `apps/web/dist`, et on
 * ne veut pas que les tests du serveur exigent que le client ait ete
 * construit. Le service des assets est verifie par le test e2e, qui tourne
 * contre `wrangler dev`.
 */
export default defineConfig(async () => {
  // Les migrations sont lues ici (Node) puis appliquees dans le runtime par
  // `test/setup.ts`, sur une D1 vierge a chaque fichier de test.
  const migrations = await readD1Migrations('./migrations');

  return {
    plugins: [
      cloudflareTest({
        main: './src/index.ts',
        miniflare: {
          // Doit rester identique a `compatibility_date` de wrangler.jsonc.
          compatibilityDate: '2026-10-19',
          compatibilityFlags: ['nodejs_compat'],
          d1Databases: ['DB'],
          bindings: { TEST_MIGRATIONS: migrations },
        },
      }),
    ],
    test: { setupFiles: ['./test/setup.ts'] },
  };
});
