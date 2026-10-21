import en from './en.json';
import fr from './fr.json';

/**
 * Langues prevues. Le francais est la seule traduite a la sortie, l'anglais
 * arrive au jalon M9, mais toutes ses cles existent des maintenant (D-16,
 * `docs/09`).
 */
export const LOCALES = ['fr', 'en'] as const;

export type Locale = (typeof LOCALES)[number];

/** Langue par defaut (D-16). */
export const DEFAULT_LOCALE: Locale = 'fr';

/** Un seul espace de noms : les cles portent deja leur domaine (`docs/09`). */
export const DEFAULT_NAMESPACE = 'translation';

/** Catalogues bruts, par langue. */
export const catalogs = { fr, en } as const;

/** Catalogues dans la forme attendue par i18next. */
export const resources = {
  fr: { [DEFAULT_NAMESPACE]: fr },
  en: { [DEFAULT_NAMESPACE]: en },
} as const;

/**
 * Chemins pointes d'un catalogue : `{ home: { title: '…' } }` donne
 * `'home.title'`.
 */
type DottedKeys<T> = T extends string
  ? ''
  : {
      [K in keyof T & string]: DottedKeys<T[K]> extends '' ? K : `${K}.${DottedKeys<T[K]>}`;
    }[keyof T & string];

/**
 * Toutes les cles de traduction existantes, derivees du catalogue francais
 * qui fait reference. Une cle inventee ne compile pas.
 */
export type TranslationKey = DottedKeys<typeof fr>;

/** Le catalogue francais, qui sert de reference de structure. */
export const referenceCatalog = fr;
