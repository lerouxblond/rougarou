import type { Linter } from 'eslint';

/** Carte repertoire de paquet → alias internes dont il a le droit de dependre. */
export declare const PACKAGE_DEPENDENCIES: Record<string, string[]>;

/** Tous les alias internes susceptibles d'etre importes, apps comprises. */
export declare const ALL_PACKAGES: string[];

/** Globaux interdits dans le moteur : le temps et l'alea sont injectes. */
export declare const IMPURE_GLOBALS: string[];

/** Pas d'`enum` : union de litteraux ou objet `as const` (`docs/09`). */
export declare const NO_ENUM_RULE: Linter.RuleEntry;

/** Un bloc de configuration par paquet, qui interdit les alias hors liste blanche. */
export declare function dependencyZones(
  dependencies?: Record<string, string[]>,
  toGlob?: (dir: string) => string,
): Linter.Config[];

/** Le bloc de purete du moteur : ni reseau, ni DOM, ni Cloudflare, ni horloge. */
export declare function enginePurity(files?: string[]): Linter.Config;
