import type { MeResponse } from '@rougarou/protocol';
import { Button } from '@rougarou/ui';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { api, ApiFailure } from '../api.ts';
import { submitted, type SubmitLike } from '../form.ts';
import { useMe, useRefreshMe } from '../session.ts';
import { Field, FormError } from './Field.tsx';

type Mode = 'login' | 'signup';

/**
 * Affiche son contenu a un utilisateur connecte (compte ou invite, D-04), et
 * sinon les formulaires de connexion. Apres connexion, on reste sur la meme
 * page : un lien `/join/:code` mene donc au salon (US-11).
 */
export function AuthGate({ children }: { readonly children: (me: MeResponse) => ReactNode }) {
  const { t } = useTranslation();
  const me = useMe();

  if (me.isPending) {
    return <p className="text-text-muted">{t('common.loading')}</p>;
  }

  return me.data === null || me.data === undefined ? <AuthForms /> : children(me.data);
}

function AuthForms() {
  const { t } = useTranslation();
  const refresh = useRefreshMe();
  const [mode, setMode] = useState<Mode>('login');
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<void>): Promise<void> {
    setError(null);

    try {
      await action();
      await refresh();
    } catch (failure) {
      setError(t(failure instanceof ApiFailure ? failure.messageKey : 'errors.network'));
    }
  }

  function submitAccount(event: SubmitLike): void {
    const field = submitted(event);

    void run(() =>
      mode === 'login'
        ? api.signIn(field('email'), field('password'))
        : api.signUp(field('name'), field('email'), field('password')),
    );
  }

  function submitGuest(event: SubmitLike): void {
    const field = submitted(event);

    void run(() => api.signInGuest(field('name')));
  }

  return (
    <div className="flex w-full max-w-md flex-col gap-10">
      <form className="flex flex-col gap-4" onSubmit={submitAccount}>
        <h2 className="font-display text-2xl text-text">
          {t(mode === 'login' ? 'auth.login_title' : 'auth.signup_title')}
        </h2>
        {mode === 'signup' ? (
          <Field label={t('auth.display_name')} name="name" required maxLength={30} />
        ) : null}
        <Field label={t('auth.email')} name="email" type="email" required autoComplete="email" />
        <Field
          label={t('auth.password')}
          name="password"
          type="password"
          required
          minLength={12}
          {...(mode === 'signup' ? { hint: t('auth.password_hint') } : {})}
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
        />
        <FormError message={error} />
        <Button type="submit">
          {t(mode === 'login' ? 'auth.login_submit' : 'auth.signup_submit')}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setMode(mode === 'login' ? 'signup' : 'login');
          }}
        >
          {t(mode === 'login' ? 'auth.to_signup' : 'auth.to_login')}
        </Button>
      </form>

      <form className="flex flex-col gap-4" onSubmit={submitGuest}>
        <h2 className="font-display text-xl text-text">{t('auth.guest_title')}</h2>
        <Field
          label={t('auth.display_name')}
          name="name"
          required
          maxLength={30}
          hint={t('auth.guest_hint')}
        />
        <Button type="submit" variant="secondary">
          {t('auth.guest_submit')}
        </Button>
      </form>
    </div>
  );
}
