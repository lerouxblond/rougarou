import type { PlayerView } from '@rougarou/protocol';
import { Button, EmptyState, Sheet } from '@rougarou/ui';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { MyInfo } from './MyInfo.tsx';
import { PlayersList } from './PlayersPanel.tsx';
import { RoleCard } from './RoleCard.tsx';

type Panel = 'card' | 'info' | 'players';

/**
 * La barre basse du telephone (`docs/06`) : « Ma carte », « Infos » et
 * « Joueurs » ouvrent chacun un panneau bas. Les joueurs sont deja visibles
 * a cote du jeu a partir de 640 px.
 */
export function BottomBar({
  view,
  names,
}: {
  readonly view: PlayerView;
  readonly names: ReadonlyMap<string, string>;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState<Panel | null>(null);
  const role = view.me?.role ?? null;
  const knowledge = view.me?.knowledge ?? [];
  const close = () => {
    setOpen(null);
  };
  const button = (panel: Panel, label: string, className = '') => (
    <Button
      variant="secondary"
      size="md"
      className={`flex-1 ${className}`}
      onClick={() => {
        setOpen(panel);
      }}
    >
      {label}
    </Button>
  );

  return (
    <nav
      aria-label={t('bar.label')}
      className="sticky bottom-0 flex gap-2 border-t border-border bg-bg py-3 lg:hidden"
    >
      {role === null ? null : button('card', t('bar.card'))}
      {button('info', t('bar.info'))}
      {button('players', t('bar.players'), 'sm:hidden')}

      <Sheet
        open={open === 'card'}
        onOpenChange={close}
        title={t('bar.card')}
        closeLabel={t('common.close')}
      >
        {role === null ? null : <RoleCard role={role} />}
      </Sheet>
      <Sheet
        open={open === 'info'}
        onOpenChange={close}
        title={t('bar.info')}
        closeLabel={t('common.close')}
      >
        {knowledge.length === 0 ? (
          <EmptyState title={t('my_info.empty')} />
        ) : (
          <MyInfo knowledge={knowledge} names={names} />
        )}
      </Sheet>
      <Sheet
        open={open === 'players'}
        onOpenChange={close}
        title={t('bar.players')}
        closeLabel={t('common.close')}
      >
        <PlayersList players={view.players} self={view.me?.id ?? null} />
      </Sheet>
    </nav>
  );
}
