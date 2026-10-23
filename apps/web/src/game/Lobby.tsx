import type { PlayerView } from '@rougarou/protocol';
import { Button } from '@rougarou/ui';
import { useTranslation } from 'react-i18next';

import { Field, FormError } from '../components/Field.tsx';
import { submitted } from '../form.ts';
import { useSendCommand } from './hooks.ts';

/** Le salon cote joueur : la liste, rejoindre avec son pseudo, partir. */
export function PlayerLobby({
  view,
  displayName,
}: {
  readonly view: PlayerView;
  readonly displayName: string;
}) {
  const { t } = useTranslation();
  const { send, busy, error } = useSendCommand();
  const canJoin = view.actions.some((action) => action.type === 'JoinGame');

  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-display text-xl text-text">
        {t('game.players', { count: view.players.length })}
      </h2>
      <ol className="flex flex-col gap-2">
        {view.players.map((player) => (
          <li key={player.id} className="rounded-card bg-surface p-3 text-text">
            {player.name}
          </li>
        ))}
      </ol>
      {canJoin ? (
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            const field = submitted(event);

            void send({ type: 'JoinGame', name: field('name') });
          }}
        >
          <h3 className="text-lg text-text">{t('game.join_title')}</h3>
          <Field
            label={t('auth.display_name')}
            name="name"
            defaultValue={displayName}
            required
            maxLength={30}
          />
          <Button type="submit" disabled={busy}>
            {t('game.join_submit')}
          </Button>
        </form>
      ) : null}
      {view.phase === 'CONFIG' && view.me !== null ? (
        <p className="text-text-muted">{t('game.waiting_config')}</p>
      ) : null}
      <FormError message={error === null ? null : t(error)} />
    </section>
  );
}
