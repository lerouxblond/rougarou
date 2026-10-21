/** @type {import('@ladle/react').UserConfig} */
export default {
  stories: 'src/**/*.stories.tsx',
  // Ladle ne lit pas `.ladle/vite.config.ts` tout seul : sans ce chemin, le
  // plugin Tailwind ne tourne pas et aucun utilitaire n'est genere.
  viteConfig: './.ladle/vite.config.ts',
  // Les deux themes se pilotent par `data-phase` (docs/06), pas par le mode
  // sombre du navigateur : on desactive l'inverseur de Ladle.
  addons: {
    theme: { enabled: false },
    mode: { enabled: false },
    rtl: { enabled: false },
    msw: { enabled: false },
    width: {
      enabled: true,
      // Mobile 375 px et desktop 1280 px sont les deux tailles de controle
      // de la definition de « terminé » (docs/09).
      options: { mobile: 375, tablet: 768, desktop: 1280 },
    },
  },
};
