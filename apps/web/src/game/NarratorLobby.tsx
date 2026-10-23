import { move as moveItems } from '@dnd-kit/helpers';
import { DragDropProvider } from '@dnd-kit/react';
import { useSortable } from '@dnd-kit/react/sortable';
import type { NarratorView } from '@rougarou/protocol';
import { Button } from '@rougarou/ui';
import { useTranslation } from 'react-i18next';

import { FormError } from '../components/Field.tsx';
import { useSendCommand } from './hooks.ts';
import { useGameStore } from './store.ts';

/*
 * Charge a la demande (ADR 0011) : le glisser-deposer ne sert qu'au salon du
 * meneur, il ne pese pas sur le premier rendu des joueurs.
 */

type Seat = NarratorView['players'][number];

/**
 * Une place du salon : on la deplace en la glissant par sa poignee (souris,
 * toucher ou clavier, US-12), ou avec les fleches haut et bas.
 */
function SeatRow({
  player,
  index,
  last,
  online,
  onMove,
  onKick,
}: {
  readonly player: Seat;
  readonly index: number;
  readonly last: boolean;
  readonly online: boolean;
  readonly onMove: (by: -1 | 1) => void;
  readonly onKick: () => void;
}) {
  const { t } = useTranslation();
  const { ref, handleRef, isDragging } = useSortable({ id: player.id, index });

  return (
    <li
      ref={ref}
      className={`flex flex-wrap items-center gap-2 rounded-card bg-surface p-3 ${isDragging ? 'opacity-60' : ''}`}
    >
      <button
        ref={handleRef}
        type="button"
        aria-label={t('lobby.drag', { name: player.name })}
        className="tap-target cursor-grab rounded-md text-text-muted focus-visible:outline-2 focus-visible:outline-focus"
      >
        <span aria-hidden="true">⠿</span>
      </button>
      <span className="grow text-text">{player.name}</span>
      <span className="text-sm text-text-muted">{t(online ? 'game.online' : 'game.offline')}</span>
      <Button
        size="md"
        variant="ghost"
        disabled={index === 0}
        aria-label={t('game.move_up', { name: player.name })}
        onClick={() => {
          onMove(-1);
        }}
      >
        ↑
      </Button>
      <Button
        size="md"
        variant="ghost"
        disabled={last}
        aria-label={t('game.move_down', { name: player.name })}
        onClick={() => {
          onMove(1);
        }}
      >
        ↓
      </Button>
      <Button
        size="md"
        variant="danger"
        aria-label={t('game.kick', { name: player.name })}
        onClick={onKick}
      >
        ✕
      </Button>
    </li>
  );
}

/** Le salon cote meneur : places, connexions, expulsion (US-12). */
export function NarratorLobby({ view }: { readonly view: NarratorView }) {
  const { t } = useTranslation();
  const connected = useGameStore((store) => store.connected);
  const { send, error } = useSendCommand();
  const order = view.players.map((player) => player.id);

  function reorder(next: readonly string[]): void {
    if (next.join() !== order.join()) {
      void send({ type: 'ReorderSeats', order: [...next] });
    }
  }

  function move(index: number, by: -1 | 1): void {
    const next = [...order];
    const [moved] = next.splice(index, 1);

    if (moved !== undefined) {
      next.splice(index + by, 0, moved);
      reorder(next);
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-display text-xl text-text">
        {t('game.players', { count: view.players.length })}
      </h2>
      {view.players.length === 0 ? <p className="text-text-muted">{t('game.no_players')}</p> : null}
      <DragDropProvider
        onDragEnd={(event) => {
          if (!event.canceled) {
            reorder(moveItems(order, event));
          }
        }}
      >
        <ol className="flex flex-col gap-2">
          {view.players.map((player, index) => (
            <SeatRow
              key={player.id}
              player={player}
              index={index}
              last={index === view.players.length - 1}
              online={connected.includes(player.id)}
              onMove={(by) => {
                move(index, by);
              }}
              onKick={() => {
                void send({ type: 'KickPlayer', playerId: player.id });
              }}
            />
          ))}
        </ol>
      </DragDropProvider>
      <FormError message={error === null ? null : t(error)} />
    </section>
  );
}
