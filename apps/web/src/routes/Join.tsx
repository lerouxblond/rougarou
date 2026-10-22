import { useNavigate, useParams } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { api, ApiFailure } from '../api.ts';
import { AuthGate } from '../components/AuthGate.tsx';
import { FormError } from '../components/Field.tsx';

/**
 * `/join/:code`, aussi la cible du QR (US-11). Sans session, on passe par la
 * connexion, puis on arrive au salon sans rien ressaisir.
 */
export function Join() {
  return (
    <main id="contenu" className="mx-auto flex min-h-dvh max-w-md flex-col justify-center p-6">
      <AuthGate>{() => <Resolve />}</AuthGate>
    </main>
  );
}

function Resolve() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { code } = useParams({ from: '/join/$code' });
  const [error, setError] = useState<string | null>(null);

  // Effet de navigation, pas d'etat derive : on quitte la page une fois le code resolu.
  useEffect(() => {
    api.joinGame(code).then(
      ({ gameId }) => navigate({ to: '/game/$gameId', params: { gameId }, replace: true }),
      (failure: unknown) => {
        setError(t(failure instanceof ApiFailure ? failure.messageKey : 'errors.network'));
      },
    );
  }, [code, navigate, t]);

  return error === null ? (
    <p className="text-text-muted">{t('common.loading')}</p>
  ) : (
    <FormError message={error} />
  );
}
