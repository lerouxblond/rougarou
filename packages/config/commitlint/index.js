// Conventional Commits (`docs/09` §Git).
//
// Les messages de commit sont en anglais. Les scopes autorises sont ceux de
// `docs/09` : un commit qui touche un autre domaine doit soit choisir un scope
// existant, soit ajouter le nouveau scope dans la doc et ici, dans le meme
// commit.

/** Scopes autorises (`docs/09` §Git). */
export const SCOPES = [
  'engine',
  'protocol',
  'server',
  'web',
  'ui',
  'i18n',
  'native',
  'ci',
  'docs',
  'design',
  'deps',
];

export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Le scope reste optionnel (`docs: ...`), mais s'il est present il doit
    // faire partie de la liste.
    'scope-enum': [2, 'always', SCOPES],
    // Les corps de commit expliquent le pourquoi : on laisse de la place.
    'body-max-line-length': [2, 'always', 100],
    'footer-max-line-length': [0, 'always', Infinity],
  },
};
