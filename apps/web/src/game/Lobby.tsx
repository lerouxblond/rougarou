import type { NarratorView, PlayerView } from '@rougarou/protocol';
import { Button } from '@rougarou/ui';
import { useTranslation } from 'react-i18next';

import { Field, FormError } from '../components/Field.tsx';
import { submitted } from '../form.ts';
import { useSendCommand } from './hooks.ts';
import { useGameStore } from './store.ts';

/** Le salon cote meneur : places, connexions, expulsion (US-12). */
export function NarratorLobby({ view }: { readonly view: NarratorView }) {
  const { t } = useTranslation();
  const connected = useGameStore((store) => store.connected);
  const { send, error } = useSendCommand();
  const order = view.players.map((player) => player.id);

  function move(index: number, by: -1 | 1): void {
    const next = [...order];
    const [moved] = next.splice(index, 1);

    if (moved !== undefined) {
      next.splice(index + by, 0, moved);
      void send({ type: 'ReorderSeats', order: next });
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-display text-xl text-text">
        {t('game.players', { count: view.players.length })}
      </h2>
      {view.players.length === 0 ? <p className="text-text-muted">{t('game.no_players')}</p> : null}
      <ol className="flex flex-col gap-2">
        {view.players.map((player, index) => (
          <li
            key={player.id}
            className="flex flex-wrap items-center gap-2 rounded-card bg-surface p-3"
          >
            <span className="grow text-text">{player.name}</span>
            <span className="text-sm text-text-muted">
              {t(connected.includes(player.id) ? 'game.online' : 'game.offline')}
            </span>
            <Button
              size="md"
              variant="ghost"
              disabled={index === 0}
              aria-label={t('game.move_up', { name: player.name })}
              onClick={() => {
                move(index, -1);
              }}
            >
              ↑
            </Button>
            <Button
              size="md"
              variant="ghost"
              disabled={index === view.players.length - 1}
              aria-label={t('game.move_down', { name: player.name })}
              onClick={() => {
                move(index, 1);
              }}
            >
              ↓
            </Button>
            <Button
              size="md"
              variant="danger"
              aria-label={t('game.kick', { name: player.name })}
              onClick={() => {
                void send({ type: 'KickPlayer', playerId: player.id });
              }}
            >
              ✕
            </Button>
          </li>
        ))}
      </ol>
      <FormError message={error === null ? null : t(error)} />
    </section>
  );
}

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
