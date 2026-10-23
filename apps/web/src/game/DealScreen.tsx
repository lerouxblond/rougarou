import type { PlayerView } from '@rougarou/protocol';
import { Button } from '@rougarou/ui';
import { useTranslation } from 'react-i18next';

import { FormError } from '../components/Field.tsx';
import { useSendCommand } from './hooks.ts';
import { RoleCard } from './RoleCard.tsx';

/**
 * La distribution (US-30). En ceremonie (`R-17`), celui qui n'a pas la main
 * voit seulement qui decouvre son role ; sa carte arrive avec sa main.
 */
export function DealScreen({ view }: { readonly view: PlayerView }) {
  const { t } = useTranslation();
  const { send, busy, error } = useSendCommand();
  const role = view.me?.role ?? null;
  const turn = view.ceremony?.turn ?? null;
  const canConfirm = view.actions.some((action) => action.type === 'ConfirmRoleSeen');

  if (role === null) {
    const name = view.players.find((player) => player.id === turn)?.name;

    return (
      <p aria-live="polite" className="font-display text-2xl text-text">
        {name === undefined ? t('deal.waiting') : t('deal.discovering', { name })}
      </p>
    );
  }

  return (
    <section className="flex flex-col items-center gap-4">
      <p className="text-text-muted">{t('deal.prompt')}</p>
      <RoleCard role={role} />
      {canConfirm ? (
        <Button
          loading={busy}
          onClick={() => {
            void send({ type: 'ConfirmRoleSeen' });
          }}
        >
          {t('actions.confirm_role_seen')}
        </Button>
      ) : (
        <p aria-live="polite" className="text-text-muted">
          {t('deal.waiting')}
        </p>
      )}
      <FormError message={error === null ? null : t(error)} />
    </section>
  );
}
