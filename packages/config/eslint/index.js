// Configuration ESLint partagee du monorepo (flat config).
//
// Elle est lancee une seule fois depuis la racine (`pnpm lint`), parce que les
// regles de sens unique des dependances (docs/04) s'expriment par chemin de
// paquet. La racine se contente de reexporter ce fichier.

import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import prettierConfig from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

import { dependencyZones, enginePurity, NO_ENUM_RULE } from './zones.js';

export default defineConfig(
  globalIgnores([
    '**/dist/**',
    '**/build/**',
    '**/coverage/**',
    '**/.turbo/**',
    '**/.wrangler/**',
    '**/node_modules/**',
    '**/playwright-report/**',
    '**/test-results/**',
    'apps/native/src-tauri/**',
    // Ces fixtures servent a declencher des erreurs de lint dans un test :
    // elles ne sont pas analysees avec le reste du depot.
    'packages/config/test/fixtures/**',
  ]),

  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,

  {
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
  },

  // Regles permanentes du projet (docs/05 et docs/09).
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      // docs/05 : `any` et `@ts-ignore` sont interdits.
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-ignore': true,
          'ts-nocheck': true,
          'ts-expect-error': 'allow-with-description',
          minimumDescriptionLength: 10,
        },
      ],

      // docs/09 : unions de litteraux et objets `as const`, jamais d'`enum`.
      // `erasableSyntaxOnly` le refuse deja a la compilation ; ici le message
      // explique pourquoi.
      'no-restricted-syntax': NO_ENUM_RULE,

      // docs/09 : `switch` exhaustif sur une union, `assertNever` dans le defaut.
      '@typescript-eslint/switch-exhaustiveness-check': [
        'error',
        { considerDefaultExhaustiveForUnions: true },
      ],

      // Les erreurs metier du moteur sont renvoyees, pas levees (docs/09).
      '@typescript-eslint/only-throw-error': 'error',

      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },

  ...dependencyZones(),
  enginePurity(),

  // Composants React (packages/ui et apps/web).
  {
    files: ['packages/ui/**/*.tsx', 'apps/web/**/*.tsx'],
    extends: [reactHooks.configs['recommended-latest']],
    languageOptions: {
      globals: globals.browser,
    },
  },

  // Le serveur tourne dans le runtime Workers.
  {
    files: ['apps/server/**/*.ts'],
    languageOptions: {
      globals: globals.worker,
    },
  },

  // Les tests et l'outillage sont moins contraints.
  {
    files: [
      '**/*.test.{ts,tsx}',
      '**/test/**/*.{ts,tsx}',
      '**/*.stories.tsx',
      'e2e/**/*.ts',
      '**/*.config.{ts,mts,js,mjs}',
      'scripts/**/*.mjs',
    ],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
    rules: {
      'no-console': 'off',
      'no-restricted-imports': 'off',
      'no-restricted-globals': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
    },
  },

  // Les fichiers de configuration en JavaScript n'ont pas de projet TS.
  {
    files: ['**/*.{js,mjs}'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: {
      globals: globals.node,
    },
  },

  // Prettier en dernier : il desactive tout ce qui touche au formatage.
  prettierConfig,
);
