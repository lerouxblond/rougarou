import { describe, expect, it } from 'vitest';

import { createRng } from '../src/index.ts';

/** Tire `count` nombres d'un generateur fraichement creee. */
function sequence(seed: number, count = 12): number[] {
  const rng = createRng(seed);

  return Array.from({ length: count }, () => rng.next());
}

describe('createRng — determinisme (ADR 0002)', () => {
  it('donne la meme suite pour la meme graine', () => {
    expect(sequence(1234)).toEqual(sequence(1234));
  });

  it('donne une suite differente pour une autre graine', () => {
    expect(sequence(1234)).not.toEqual(sequence(1235));
  });

  it('rejoue la meme suite apres recreation : aucun etat global', () => {
    const first = createRng(42);
    const drawn = [first.next(), first.next(), first.next()];

    const second = createRng(42);

    expect([second.next(), second.next(), second.next()]).toEqual(drawn);
  });

  it('refuse une graine non entiere : la partie ne serait plus rejouable', () => {
    expect(() => createRng(1.5)).toThrow();
    expect(() => createRng(Number.NaN)).toThrow();
  });
});

describe('createRng — next', () => {
  it('reste dans [0, 1)', () => {
    const rng = createRng(7);

    for (let index = 0; index < 1000; index += 1) {
      const value = rng.next();

      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('ne se bloque pas sur une valeur unique', () => {
    const rng = createRng(7);
    const values = new Set(Array.from({ length: 100 }, () => rng.next()));

    expect(values.size).toBeGreaterThan(90);
  });
});

describe('createRng — int', () => {
  it('reste dans [0, maxExclusive)', () => {
    const rng = createRng(99);

    for (let index = 0; index < 500; index += 1) {
      const value = rng.int(6);

      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(6);
    }
  });

  it('couvre toutes les valeurs d un petit intervalle', () => {
    const rng = createRng(5);
    const seen = new Set(Array.from({ length: 200 }, () => rng.int(4)));

    expect([...seen].sort()).toEqual([0, 1, 2, 3]);
  });

  it('refuse une borne non entiere ou nulle : c est un bug, pas un cas metier', () => {
    const rng = createRng(1);

    expect(() => rng.int(0)).toThrow();
    expect(() => rng.int(-3)).toThrow();
    expect(() => rng.int(2.5)).toThrow();
  });
});

describe('createRng — pick', () => {
  it('rend un element de la liste', () => {
    const rng = createRng(3);
    const roles = ['werewolf', 'villager', 'seer'] as const;

    for (let index = 0; index < 50; index += 1) {
      expect(roles).toContain(rng.pick(roles));
    }
  });

  it('refuse une liste vide', () => {
    expect(() => createRng(1).pick([])).toThrow();
  });
});

describe('createRng — shuffle', () => {
  it('garde exactement les memes elements', () => {
    const seats = [1, 2, 3, 4, 5, 6, 7, 8];
    const shuffled = createRng(2024).shuffle(seats);

    expect([...shuffled].sort((a, b) => a - b)).toEqual(seats);
  });

  it('ne modifie pas la liste d entree : le moteur est pur', () => {
    const seats = [1, 2, 3, 4, 5];
    const copy = [...seats];

    createRng(8).shuffle(seats);

    expect(seats).toEqual(copy);
  });

  it('donne le meme ordre pour la meme graine', () => {
    const seats = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    expect(createRng(77).shuffle(seats)).toEqual(createRng(77).shuffle(seats));
  });

  it('change l ordre pour une autre graine', () => {
    const seats = Array.from({ length: 20 }, (_, index) => index);

    expect(createRng(1).shuffle(seats)).not.toEqual(createRng(2).shuffle(seats));
  });

  it('gere les listes vides et a un seul element', () => {
    const rng = createRng(4);

    expect(rng.shuffle([])).toEqual([]);
    expect(rng.shuffle(['seule'])).toEqual(['seule']);
  });
});
