import { describe, expect, it } from 'vitest';

import { fail, succeed } from '../src/index.ts';

describe('Result (docs/09)', () => {
  it('construit un succes qui porte l etat et les evenements', () => {
    const result = succeed({ day: 1 }, [{ type: 'PhaseChanged' }]);

    expect(result.ok).toBe(true);
    expect(result.state).toEqual({ day: 1 });
    expect(result.events).toHaveLength(1);
  });

  it('construit un echec qui porte un code et une cle i18n', () => {
    const result = fail('WRONG_PHASE', 'errors.wrong_phase');

    expect(result.ok).toBe(false);
    expect(result.error).toEqual({ code: 'WRONG_PHASE', messageKey: 'errors.wrong_phase' });
  });

  it('ne renvoie aucun texte en dur : seulement une cle (CLAUDE.md regle 6)', () => {
    const { error } = fail('FORBIDDEN', 'errors.forbidden');

    expect(error.messageKey).toMatch(/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/);
  });
});
