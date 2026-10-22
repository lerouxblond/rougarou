import type { MeResponse } from '@rougarou/protocol';
import { Button } from '@rougarou/ui';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { api, ApiFailure } from '../api.ts';
import { AuthGate } from '../components/AuthGate.tsx';
import { Field, FormError } from '../components/Field.tsx';
import { submitted, type SubmitLike } from '../form.ts';
import { useRefreshMe } from '../session.ts';

/** Accueil : creer une partie ou rejoindre par code (US-10, US-11). */
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

      <AuthGate>{(me) => <HomeActions me={me} />}</AuthGate>

      <p className="text-sm text-text-muted">{t('app.tagline')}</p>
    </main>
  );
}

function HomeActions({ me }: { readonly me: MeResponse }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const refresh = useRefreshMe();
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<string>): Promise<void> {
    setError(null);

    try {
      const gameId = await action();

      await navigate({ to: '/game/$gameId', params: { gameId } });
    } catch (failure) {
      setError(t(failure instanceof ApiFailure ? failure.messageKey : 'errors.network'));
    }
  }

  function join(event: SubmitLike): void {
    const code = submitted(event)('code');

    void run(async () => (await api.joinGame(code)).gameId);
  }

  return (
    <section className="flex flex-col gap-6">
      <p className="text-sm text-text-muted">{t('auth.signed_in_as', { name: me.displayName })}</p>

      <Button
        size="lg"
        onClick={() => {
          void run(async () => (await api.createGame()).gameId);
        }}
      >
        {t('home.create_game')}
      </Button>

      <form className="flex flex-col gap-3" onSubmit={join}>
        <Field
          label={t('home.code_label')}
          name="code"
          required
          minLength={6}
          maxLength={6}
          autoCapitalize="characters"
          autoComplete="off"
          placeholder={t('home.code_placeholder')}
        />
        <Button size="lg" variant="secondary" type="submit">
          {t('home.join_game')}
        </Button>
      </form>

      <FormError message={error} />

      <Button
        variant="ghost"
        onClick={() => {
          void api.signOut().then(refresh);
        }}
      >
        {t('auth.sign_out')}
      </Button>
    </section>
  );
}
