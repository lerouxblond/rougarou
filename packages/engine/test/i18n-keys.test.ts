import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { catalogs } from '@rougarou/i18n';
import { MODE_IDS, PHASES, TEAM_IDS } from '@rougarou/protocol';
import { describe, expect, it } from 'vitest';

import { findMode, registeredRoles, type EngineErrorCode } from '../src/index.ts';

/**
 * Aucun texte en dur ne sort du moteur (`CLAUDE.md` regle 6) : il renvoie des
 * cles, et chacune doit exister dans le catalogue francais (`docs/09`).
 */

const SRC = fileURLToPath(new URL('../src', import.meta.url));

/** Chaque code d'erreur a une cle par defaut `errors.<code>`. Le `satisfies` force la liste complete. */
const ERROR_CODES = {
  FORBIDDEN: true,
  GAME_FULL: true,
  INVALID_COMMAND: true,
  INVALID_COMPOSITION: true,
  INVALID_TARGET: true,
  NAME_TAKEN: true,
  NOT_YOUR_TURN: true,
  NOTHING_TO_UNDO: true,
  PENDING_ACTIONS: true,
  TOO_EARLY: true,
  UNDO_BLOCKED: true,
  UNKNOWN_PLAYER: true,
  UNSUPPORTED_OPTION: true,
  WRONG_PHASE: true,
} satisfies Record<EngineErrorCode, true>;

function flatten(value: unknown, prefix = ''): string[] {
  if (typeof value === 'string') {
    return [prefix];
  }

  return Object.entries(value as Record<string, unknown>).flatMap(([key, nested]) =>
    flatten(nested, prefix === '' ? key : `${prefix}.${key}`),
  );
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? sourceFiles(join(dir, entry.name)) : [join(dir, entry.name)],
  );
}

/** Les cles `errors.*` ecrites en dur dans le code du moteur. */
function literalErrorKeys(): string[] {
  const keys = sourceFiles(SRC).flatMap((file) =>
    [...readFileSync(file, 'utf8').matchAll(/'(errors\.[a-z_.]+)'/g)].map(
      (match) => match[1] ?? '',
    ),
  );

  return [...new Set(keys)];
}

const french = new Set(flatten(catalogs.fr));

function missing(keys: readonly string[]): string[] {
  return keys.filter((key) => !french.has(key));
}

describe('Cles i18n du moteur (CLAUDE.md regle 6)', () => {
  it('trouve bien des cles dans le code : le test n est pas vide', () => {
    expect(literalErrorKeys().length).toBeGreaterThan(20);
  });

  it('chaque cle d erreur ecrite dans le moteur existe en francais', () => {
    expect(missing(literalErrorKeys())).toEqual([]);
  });

  it('chaque code d erreur a sa cle par defaut', () => {
    expect(missing(Object.keys(ERROR_CODES).map((code) => `errors.${code.toLowerCase()}`))).toEqual(
      [],
    );
  });

  it('chaque role implemente a un nom et une description', () => {
    const keys = registeredRoles().flatMap((role) => {
      const id = role.id.replaceAll('-', '_');

      return [`roles.${id}.name`, `roles.${id}.description`];
    });

    expect(missing(keys)).toEqual([]);
  });

  it('chaque phase a un titre', () => {
    expect(missing(PHASES.map((phase) => `phase.${phase.toLowerCase()}.title`))).toEqual([]);
  });

  it('chaque mode implemente a un nom et une description', () => {
    const keys = MODE_IDS.filter((id) => findMode(id) !== undefined).flatMap((id) => [
      `modes.${id}.name`,
      `modes.${id}.description`,
    ]);

    expect(missing(keys)).toEqual([]);
  });

  it('chaque issue de partie a son annonce', () => {
    expect(missing([...TEAM_IDS, 'lovers', 'nobody'].map((winner) => `winner.${winner}`))).toEqual(
      [],
    );
  });
});
