import { DEFAULT_LOCALE, DEFAULT_NAMESPACE, LOCALES, resources } from '@rougarou/i18n';
import i18next, { type i18n } from 'i18next';
import { initReactI18next } from 'react-i18next';

/**
 * Initialise i18next sur les catalogues partages.
 *
 * Aucun texte n'est ecrit en dur dans un composant (`CLAUDE.md` regle 6) :
 * tout passe par ces catalogues, et le francais est la seule langue traduite
 * a la sortie (D-16).
 */
export function createI18n(locale: string = DEFAULT_LOCALE): i18n {
  const instance = i18next.createInstance();

  void instance.use(initReactI18next).init({
    resources,
    lng: locale,
    fallbackLng: DEFAULT_LOCALE,
    supportedLngs: [...LOCALES],
    defaultNS: DEFAULT_NAMESPACE,
    ns: [DEFAULT_NAMESPACE],
    interpolation: {
      // React echappe deja ce qu'il rend.
      escapeValue: false,
    },
  });

  return instance;
}
