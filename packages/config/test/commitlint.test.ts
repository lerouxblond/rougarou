import lint from '@commitlint/lint';
import load from '@commitlint/load';
import type { LintOutcome } from '@commitlint/types';
import { describe, expect, it } from 'vitest';

import config, { SCOPES } from '../commitlint/index.js';

/**
 * On passe par `@commitlint/load`, qui resout `extends` exactement comme le
 * fait commitlint : le test porte donc sur la configuration reellement
 * appliquee par le hook `commit-msg`, preset compris.
 */
async function check(message: string): Promise<LintOutcome> {
  const { rules } = await load(config);

  return lint(message, rules);
}

describe('Conventional Commits (docs/09)', () => {
  it('accepte un commit bien forme avec un scope autorise', async () => {
    const report = await check('feat(engine): add guardian role');

    expect(report.valid).toBe(true);
  });

  it('accepte un commit sans scope', async () => {
    const report = await check('docs: plan milestone M0');

    expect(report.valid).toBe(true);
  });

  it('refuse un message qui ne suit pas la convention', async () => {
    const report = await check('broken message');

    expect(report.valid).toBe(false);
  });

  it('refuse un scope hors liste', async () => {
    const report = await check('feat(unknown): add something');

    expect(report.valid).toBe(false);
    expect(report.errors.map((error) => error.name)).toContain('scope-enum');
  });

  it('refuse un type hors liste', async () => {
    const report = await check('improve(web): tweak the home page');

    expect(report.valid).toBe(false);
    expect(report.errors.map((error) => error.name)).toContain('type-enum');
  });

  it('autorise tous les scopes documentes dans docs/09', async () => {
    const reports = await Promise.all(SCOPES.map((scope) => check(`fix(${scope}): something`)));

    expect(reports.every((report) => report.valid)).toBe(true);
  });
});
