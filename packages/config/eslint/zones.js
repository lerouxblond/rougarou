// Sens unique des dependances entre paquets et purete du moteur.
//
// Ces regles sont les garde-fous de `docs/04-architecture.md` et de la regle 3
// de `CLAUDE.md`. Elles sont isolees ici pour que `test/import-boundaries.test.ts`
// puisse les appliquer a des fixtures et verifier qu'elles declenchent vraiment.

/**
 * Pour chaque repertoire de paquet, la liste des paquets internes dont il a le
 * droit de dependre (`docs/04`).
 *
 * Les imports entre paquets se font par alias (`@rougarou/engine`), jamais en
 * chemin relatif (`docs/09`), donc interdire les alias suffit : aucune
 * resolution de chemin n'est necessaire.
 */
export const PACKAGE_DEPENDENCIES = {
  // Le moteur est pur : il ne connait que les types du protocole.
  'packages/engine': ['protocol'],
  // Le protocole, l'i18n et la config sont des feuilles.
  'packages/protocol': [],
  'packages/i18n': [],
  'packages/config': [],
  // Le design system ne connait que les tokens de `design/`.
  'packages/ui': [],
  // Le client affiche : composants, protocole, traductions.
  'apps/web': ['ui', 'protocol', 'i18n'],
  // Le serveur arbitre : moteur et protocole.
  'apps/server': ['engine', 'protocol'],
};

/**
 * Tous les alias internes susceptibles d'etre importes, apps comprises : un
 * alias absent de cette liste ne serait jamais interdit nulle part.
 */
export const ALL_PACKAGES = ['config', 'engine', 'i18n', 'protocol', 'server', 'ui', 'web'];

/** Globaux interdits dans le moteur : le temps et l'alea sont injectes. */
export const IMPURE_GLOBALS = [
  'Date',
  'WebSocket',
  'caches',
  'crypto',
  'document',
  'fetch',
  'localStorage',
  'navigator',
  'performance',
  'sessionStorage',
  'setInterval',
  'setTimeout',
  'window',
];

/**
 * Construit un bloc de configuration par paquet qui interdit tout alias
 * `@rougarou/*` absent de sa liste blanche.
 *
 * @param {Record<string, string[]>} [dependencies] Carte repertoire → paquets autorises.
 * @param {(dir: string) => string} [toGlob] Transforme un repertoire en glob de fichiers.
 */
export function dependencyZones(dependencies = PACKAGE_DEPENDENCIES, toGlob = defaultGlob) {
  return Object.entries(dependencies).map(([dir, allowed]) => ({
    files: [toGlob(dir)],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          // Ni son propre alias (un paquet s'importe en relatif), ni ceux de sa
          // liste blanche.
          paths: ALL_PACKAGES.filter(
            (name) => name !== ownAlias(dir) && !allowed.includes(name),
          ).map((name) => ({
            name: `@rougarou/${name}`,
            message: `${dir} ne doit pas dependre de @rougarou/${name} (sens unique des dependances, docs/04).`,
          })),
          patterns: [
            {
              // Deux niveaux au-dessus, on a quitte le paquet. En dessous, un
              // chemin relatif reste interne et legitime (`.ladle` vers `src`).
              group: ['../../*'],
              message:
                'Entre paquets, importe par alias `@rougarou/<paquet>`, jamais en chemin relatif (docs/09).',
            },
          ],
        },
      ],
    },
  }));
}

/**
 * Construit le bloc de purete du moteur : ni reseau, ni DOM, ni Cloudflare, ni
 * horloge, ni alea non injecte (`CLAUDE.md` regle 3, ADR 0002).
 *
 * @param {string[]} [files] Globs des fichiers du moteur.
 */
export function enginePurity(files = ['packages/engine/src/**/*.ts']) {
  return {
    files,
    rules: {
      'no-restricted-globals': [
        'error',
        ...IMPURE_GLOBALS.map((name) => ({
          name,
          message: `Le moteur est pur : ${name} est interdit. Le temps et l'alea sont injectes (now, rng).`,
        })),
      ],
      'no-restricted-properties': [
        'error',
        {
          object: 'Math',
          property: 'random',
          message: 'Le moteur est deterministe : utilise le `Rng` a graine, jamais Math.random.',
        },
      ],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['node:*', 'cloudflare:*', 'hono', 'hono/*', '../../*'],
              message:
                'Le moteur est pur : ni Node, ni Cloudflare, ni serveur HTTP (CLAUDE.md regle 3).',
            },
          ],
          paths: ALL_PACKAGES.filter((name) => name !== 'protocol' && name !== 'engine').map(
            (name) => ({
              name: `@rougarou/${name}`,
              message: `Le moteur ne doit pas dependre de @rougarou/${name} (docs/04).`,
            }),
          ),
        },
      ],
    },
  };
}

/** Pas d'`enum` : union de litteraux ou objet `as const` (`docs/09`). */
export const NO_ENUM_RULE = [
  'error',
  {
    selector: 'TSEnumDeclaration',
    message: "Pas d'`enum` : utilise une union de litteraux ou un objet `as const` (docs/09).",
  },
];

/** @param {string} dir */
function defaultGlob(dir) {
  return `${dir}/**/*.{ts,tsx,js,mjs}`;
}

/**
 * Alias d'un repertoire de paquet : `packages/engine` → `engine`.
 *
 * @param {string} dir
 */
function ownAlias(dir) {
  return dir.slice(dir.lastIndexOf('/') + 1);
}
