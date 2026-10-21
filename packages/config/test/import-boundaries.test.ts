import { fileURLToPath } from 'node:url';

import { ESLint } from 'eslint';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import { describe, expect, it } from 'vitest';

import { dependencyZones, enginePurity, NO_ENUM_RULE } from '../eslint/zones.js';

const FIXTURES = fileURLToPath(new URL('./fixtures', import.meta.url));

/**
 * Les garde-fous de `docs/04` sont ecrits pour les vrais repertoires
 * (`packages/engine`, `apps/web`). On les reconstruit ici sur les fixtures, ce
 * qui laisse les regles elles-memes inchangees et les fait vraiment tourner
 * dans ESLint.
 */
function lintFixtures() {
  return new ESLint({
    cwd: FIXTURES,
    overrideConfigFile: true,
    overrideConfig: defineConfig(
      {
        files: ['**/*.ts'],
        languageOptions: { parser: tseslint.parser },
        rules: { 'no-restricted-syntax': NO_ENUM_RULE },
      },
      ...dependencyZones(
        { 'packages/engine': ['protocol'], 'apps/web': ['ui', 'protocol', 'i18n'] },
        (dir: string) => (dir === 'packages/engine' ? 'engine-src/**/*.ts' : 'web-src/**/*.ts'),
      ),
      enginePurity(['engine-src/**/*.ts']),
    ),
  });
}

async function messagesFor(fixture: string): Promise<string[]> {
  const results = await lintFixtures().lintFiles([`${FIXTURES}/${fixture}`]);
  return (results[0]?.messages ?? []).map(
    (message) => `${message.ruleId ?? '?'}: ${message.message}`,
  );
}

describe('sens unique des dependances (docs/04)', () => {
  it('refuse un import du serveur depuis le moteur', async () => {
    const messages = await messagesFor('engine-src/forbidden-server-import.ts');

    expect(messages).toHaveLength(1);
    expect(messages[0]).toContain('no-restricted-imports');
    expect(messages[0]).toContain('@rougarou/server');
  });

  it('refuse un import du moteur depuis le client', async () => {
    const messages = await messagesFor('web-src/forbidden-engine-import.ts');

    expect(messages).toHaveLength(1);
    expect(messages[0]).toContain('@rougarou/engine');
  });

  it('laisse passer un import du protocole depuis le moteur', async () => {
    expect(await messagesFor('engine-src/allowed-protocol-import.ts')).toEqual([]);
  });
});

describe('purete du moteur (CLAUDE.md regle 3)', () => {
  it('refuse l horloge et l alea non injectes', async () => {
    const messages = await messagesFor('engine-src/forbidden-impurity.ts');

    expect(messages).toHaveLength(2);
    expect(messages.join('\n')).toContain('Date');
    expect(messages.join('\n')).toContain('Math.random');
  });
});

describe('conventions TypeScript (docs/09)', () => {
  it("refuse une declaration d'enum", async () => {
    const messages = await messagesFor('engine-src/forbidden-enum.ts');

    expect(messages.join('\n')).toContain("Pas d'`enum`");
  });
});
