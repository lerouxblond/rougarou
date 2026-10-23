import { useTranslation } from 'react-i18next';

/**
 * L'ecran de nuit uniforme (US-40, `docs/04` §Projection) : le meme pour
 * tous ceux qui n'agissent pas, quel que soit leur role. Il ne depend
 * d'aucune donnee de la vue : rien n'y change de toute la nuit.
 */
export function UniformNight() {
  const { t } = useTranslation();

  return (
    <section className="flex flex-col items-center gap-4 py-12 text-center">
      <svg
        viewBox="0 0 64 64"
        aria-hidden="true"
        className="size-24 text-accent motion-safe:animate-pulse"
      >
        <path d="M44 8a26 26 0 1 0 12 34A22 22 0 0 1 44 8z" fill="currentColor" opacity="0.85" />
      </svg>
      <p className="font-display text-3xl text-text">{t('night.uniform.title')}</p>
      <p className="text-text-muted">{t('night.uniform.hint')}</p>
    </section>
  );
}
