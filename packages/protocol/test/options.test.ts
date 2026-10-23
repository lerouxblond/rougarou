import { describe, expect, it } from 'vitest';

import { gameOptionsSchema, resolveFakeWake } from '../src/index.ts';

describe('gameOptionsSchema (docs/01 §8)', () => {
  it('complete un objet vide avec toutes les valeurs par defaut', () => {
    const options = gameOptionsSchema.parse({});

    expect(options).toMatchObject({
      playMode: 'inPerson',
      gameMode: 'classic',
      mayor: true,
      dealMode: 'simultaneous',
      pilotMode: 'assisted',
      roleplay: false,
      mayorSuccession: 'designate',
      revealRoleOnDeath: true,
      deadSeeRoles: true,
      voteVisibility: 'public',
      allowAbstain: false,
      allowSpare: true,
      tieBreak: 'mayor',
      wolfVoteMode: 'unanimous',
      wolvesWinOnParity: false,
      seerMode: 'role',
      witchSelfSave: 'firstNightOnly',
      parallelNight: false,
    });
  });

  it('applique les minuteurs de D-02 : seulement sur les actions', () => {
    const { timers } = gameOptionsSchema.parse({});

    expect(timers).toEqual({
      roleReveal: null,
      ceremonyCard: 8,
      characterSheet: null,
      presentation: null,
      nightAction: 45,
      wolfVote: 90,
      hunterShot: 30,
      mayorSuccessor: 30,
      tieBreak: 30,
      mayorCandidacy: 60,
      mayorVote: 90,
      debate: null,
      dayVote: 60,
    });
  });

  it('garde les minuteurs par defaut quand un seul est modifie', () => {
    const { timers } = gameOptionsSchema.parse({ timers: { dayVote: 120 } });

    expect(timers.dayVote).toBe(120);
    expect(timers.wolfVote).toBe(90);
  });

  it('accepte de desactiver un minuteur avec null', () => {
    expect(gameOptionsSchema.parse({ timers: { wolfVote: null } }).timers.wolfVote).toBeNull();
  });

  it('refuse une cle inconnue (CLAUDE.md regle 4)', () => {
    expect(gameOptionsSchema.safeParse({ cheat: true }).success).toBe(false);
    expect(gameOptionsSchema.safeParse({ timers: { cheat: 5 } }).success).toBe(false);
  });

  it('refuse une valeur hors de l enumeration', () => {
    expect(gameOptionsSchema.safeParse({ tieBreak: 'coinFlip' }).success).toBe(false);
  });

  it('refuse un minuteur non entier ou trop court', () => {
    expect(gameOptionsSchema.safeParse({ timers: { dayVote: 1.5 } }).success).toBe(false);
    expect(gameOptionsSchema.safeParse({ timers: { dayVote: 1 } }).success).toBe(false);
  });
});

describe('resolveFakeWake (R-20)', () => {
  it('vaut true en presentiel et false a distance quand elle est absente', () => {
    expect(resolveFakeWake(gameOptionsSchema.parse({ playMode: 'inPerson' }))).toBe(true);
    expect(resolveFakeWake(gameOptionsSchema.parse({ playMode: 'remote' }))).toBe(false);
  });

  it('respecte une valeur explicite', () => {
    const options = gameOptionsSchema.parse({ playMode: 'inPerson', fakeWakeForDeadRoles: false });

    expect(resolveFakeWake(options)).toBe(false);
  });
});

describe('littleGirlRisk (docs/02, Petite fille)', () => {
  it('vaut 10 % de base et +10 points par nuit espionnee par defaut', () => {
    expect(gameOptionsSchema.parse({}).littleGirlRisk).toEqual({ base: 10, increase: 10 });
  });

  it('garde la hausse par defaut quand seule la base change', () => {
    expect(gameOptionsSchema.parse({ littleGirlRisk: { base: 0 } }).littleGirlRisk).toEqual({
      base: 0,
      increase: 10,
    });
  });

  it('borne la base a 50 et la hausse a 25 points', () => {
    expect(gameOptionsSchema.safeParse({ littleGirlRisk: { base: 51 } }).success).toBe(false);
    expect(gameOptionsSchema.safeParse({ littleGirlRisk: { increase: 26 } }).success).toBe(false);
    expect(gameOptionsSchema.safeParse({ littleGirlRisk: { base: -1 } }).success).toBe(false);
    expect(
      gameOptionsSchema.safeParse({ littleGirlRisk: { base: 50, increase: 25 } }).success,
    ).toBe(true);
  });
});
