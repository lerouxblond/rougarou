import { describe, expect, it } from 'vitest';

import { catalogs, DEFAULT_LOCALE, LOCALES } from '../src/index.ts';

/** Aplatit un catalogue en chemins pointes, comme les cles i18next. */
function flatten(value: unknown, prefix = ''): Record<string, string> {
  if (typeof value === 'string') {
    return { [prefix]: value };
  }

  if (typeof value !== 'object' || value === null) {
    throw new Error(`Valeur de catalogue invalide a "${prefix}" : ${JSON.stringify(value)}`);
  }

  return Object.entries(value).reduce<Record<string, string>>(
    (accumulator, [key, nested]) =>
      Object.assign(accumulator, flatten(nested, prefix === '' ? key : `${prefix}.${key}`)),
    {},
  );
}

const flat = {
  fr: flatten(catalogs.fr),
  en: flatten(catalogs.en),
};

describe('catalogues', () => {
  it('declare le francais comme langue par defaut (D-16)', () => {
    expect(DEFAULT_LOCALE).toBe('fr');
    expect(LOCALES).toContain('fr');
    expect(LOCALES).toContain('en');
  });

  it('n est pas vide', () => {
    expect(Object.keys(flat.fr).length).toBeGreaterThan(0);
  });
});

describe('parite des cles (docs/09)', () => {
  it('en declare exactement les memes cles que fr', () => {
    expect(Object.keys(flat.en).sort()).toEqual(Object.keys(flat.fr).sort());
  });

  it('ne laisse aucune cle fr sans valeur', () => {
    const empty = Object.entries(flat.fr)
      .filter(([, value]) => value.trim() === '')
      .map(([key]) => key);

    expect(empty).toEqual([]);
  });

  it('ne laisse aucune cle en sans valeur, meme non traduite (docs/09)', () => {
    const empty = Object.entries(flat.en)
      .filter(([, value]) => value.trim() === '')
      .map(([key]) => key);

    expect(empty).toEqual([]);
  });
});

describe('nommage des cles (docs/09)', () => {
  it('suit `domaine.sous_domaine.cle` en minuscules', () => {
    const invalid = Object.keys(flat.fr).filter(
      (key) => !/^[a-z][a-z0-9_]*(\.[a-z0-9][a-z0-9_]*)+$/.test(key),
    );

    expect(invalid).toEqual([]);
  });
});
