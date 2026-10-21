import { defineConfig, type ViteUserConfig } from 'vitest/config';

/** Options de couverture communes (`docs/09` : 90 % minimum sur le moteur). */
export const COVERAGE_EXCLUDE = [
  '**/dist/**',
  '**/node_modules/**',
  '**/test/**',
  '**/*.config.{ts,mts,js,mjs}',
  '**/*.stories.tsx',
  '**/index.ts',
];

/**
 * Base Vitest partagee. Chaque paquet l'etend avec son environnement et, pour
 * le moteur, avec ses seuils de couverture.
 */
export function baseConfig(overrides: ViteUserConfig = {}): ViteUserConfig {
  return defineConfig({
    ...overrides,
    test: {
      environment: 'node',
      restoreMocks: true,
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json-summary'],
        exclude: COVERAGE_EXCLUDE,
      },
      ...overrides.test,
    },
  });
}
