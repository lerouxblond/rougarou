import type { NarratorView, PlayerView } from '@rougarou/protocol';
import { MayorBadge, PlayerChip, PlayerCircle, type CircleItem } from '@rougarou/ui';
import { useTranslation } from 'react-i18next';

import { roleKey } from './roles.ts';

type SeenPlayer = (PlayerView | NarratorView)['players'][number];

/**
 * Un joueur tel que le lecteur le voit : mort, Maire, et son role s'il le
 * connait. Le role du lecteur lui-meme n'est jamais ecrit : sa carte reste
 * cachee aux regards de la table (US-30).
 */
function useChips(players: readonly SeenPlayer[], self: string | null): CircleItem[] {
  const { t } = useTranslation();

  return players.map((player) => ({
    id: player.id,
    node: (
      <PlayerChip
        name={player.name}
        {...(player.alive ? {} : { deadLabel: t('players.dead') })}
        {...(player.role === null || player.id === self
          ? {}
          : { detail: t(`roles.${roleKey(player.role)}.name`) })}
        badges={player.mayor ? <MayorBadge label={t('players.mayor')} /> : undefined}
      />
    ),
  }));
}

/** Les joueurs en liste, dans l'ordre des places (panneau lateral, panneau bas). */
export function PlayersList({
  players,
  self = null,
}: {
  readonly players: readonly SeenPlayer[];
  readonly self?: string | null;
}) {
  const { t } = useTranslation();
  const chips = useChips(players, self);

  return (
    <ul aria-label={t('players.label')} className="flex flex-col gap-2">
      {chips.map((chip) => (
        <li key={chip.id}>{chip.node}</li>
      ))}
    </ul>
  );
}

/** Les joueurs en cercle, au centre de l'ecran sur ordinateur (`docs/06`). */
export function PlayersCircle({
  players,
  self = null,
}: {
  readonly players: readonly SeenPlayer[];
  readonly self?: string | null;
}) {
  const { t } = useTranslation();

  return <PlayerCircle label={t('players.label')} items={useChips(players, self)} />;
}
