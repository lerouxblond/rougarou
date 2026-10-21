import { describe, expect, it } from 'vitest';

import { healthResponseSchema, PROTOCOL_VERSION } from '../src/index.ts';

describe('PROTOCOL_VERSION', () => {
  it('est un entier positif', () => {
    expect(Number.isInteger(PROTOCOL_VERSION)).toBe(true);
    expect(PROTOCOL_VERSION).toBeGreaterThan(0);
  });
});

describe('healthResponseSchema', () => {
  it('accepte une reponse valide', () => {
    const result = healthResponseSchema.safeParse({
      status: 'ok',
      protocol: PROTOCOL_VERSION,
      now: 1_761_000_000_000,
    });

    expect(result.success).toBe(true);
  });

  it('refuse un statut inconnu', () => {
    const result = healthResponseSchema.safeParse({
      status: 'degraded',
      protocol: PROTOCOL_VERSION,
      now: 1_761_000_000_000,
    });

    expect(result.success).toBe(false);
  });

  it('refuse un champ manquant', () => {
    const result = healthResponseSchema.safeParse({ status: 'ok' });

    expect(result.success).toBe(false);
  });

  it('refuse une cle inconnue : le protocole est strict (CLAUDE.md regle 4)', () => {
    const result = healthResponseSchema.safeParse({
      status: 'ok',
      protocol: PROTOCOL_VERSION,
      now: 1_761_000_000_000,
      secret: 'werewolf',
    });

    expect(result.success).toBe(false);
  });

  it('refuse un horodatage non entier', () => {
    const result = healthResponseSchema.safeParse({
      status: 'ok',
      protocol: PROTOCOL_VERSION,
      now: 1.5,
    });

    expect(result.success).toBe(false);
  });
});
