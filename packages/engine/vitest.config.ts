import { baseConfig, COVERAGE_EXCLUDE } from '@rougarou/config/vitest';

/**
 * Le moteur porte le seuil de couverture du projet : 90 % en lignes et en
 * branches (`docs/09`, definition de « termine » de M1). `pnpm test` le
 * mesure a chaque passage, donc `pnpm check` echoue s'il baisse.
 */
export default baseConfig({
  test: {
    coverage: {
      enabled: true,
      provider: 'v8',
      reporter: ['text-summary', 'json-summary'],
      include: ['src/**/*.ts'],
      exclude: COVERAGE_EXCLUDE,
      thresholds: {
        lines: 90,
        branches: 90,
        functions: 90,
        statements: 90,
      },
    },
  },
});
