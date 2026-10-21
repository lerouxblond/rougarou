import { Button } from '@rougarou/ui';
import { useTranslation } from 'react-i18next';

/**
 * Accueil. Au jalon M0 elle est statique : les actions arrivent avec le REST
 * et le salon au jalon M2 (`docs/03`, US-10 et US-11).
 */
export function Home() {
  const { t } = useTranslation();

  return (
    <main
      id="contenu"
      className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-10 p-6"
    >
      <header className="flex flex-col gap-3">
        <p className="font-pixel text-xs tracking-[0.3em] text-text-muted uppercase">
          {t('app.name')}
        </p>
        <h1 className="font-display text-4xl leading-tight text-text">{t('home.title')}</h1>
        <p className="max-w-prose text-base text-text-muted">{t('home.intro')}</p>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button size="lg">{t('home.create_game')}</Button>
        <Button size="lg" variant="secondary">
          {t('home.join_game')}
        </Button>
      </div>

      <p className="text-sm text-text-muted">{t('app.tagline')}</p>
    </main>
  );
}
