import type { MeResponse, NarratorView, Phase, PlayerView } from '@rougarou/protocol';
import { Button, PhaseBanner, Timer } from '@rougarou/ui';
import { useQuery } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { api } from '../api.ts';
import { AuthGate } from '../components/AuthGate.tsx';
import { ConnectionIndicator } from '../components/ConnectionIndicator.tsx';
import { FormError } from '../components/Field.tsx';
import { ActionPanel } from '../game/ActionPanel.tsx';
import { useGameConnection, useGameView, useSendCommand } from '../game/hooks.ts';
import { Config } from '../game/Config.tsx';
import { NarratorLobby } from '../game/Lobby.tsx';
import { PlayerScreen } from '../game/PlayerScreen.tsx';
import { useGameStore } from '../game/store.ts';

/** `/game/:gameId` : un seul composant routeur selon (phase × lecteur) (`docs/03`, `docs/04`). */
export function Game() {
  const { gameId } = useParams({ from: '/game/$gameId' });

  return (
    <main id="contenu" className="mx-auto flex min-h-dvh max-w-6xl flex-col gap-6 p-4 sm:p-6">
      <AuthGate>{(me) => <Table gameId={gameId} me={me} />}</AuthGate>
    </main>
  );
}

/**
 * Les ecrans du meneur par phase, sans cascade de `if` (`docs/04` §Client
 * web). Ceux du joueur sont dans `PlayerScreen`. Les phases absentes n'ont
 * encore que les actions brutes (M4, T9).
 */
const NARRATOR_SCREENS: Partial<Record<Phase, (view: NarratorView) => ReactNode>> = {
  LOBBY: (view) => <NarratorLobby view={view} />,
  CONFIG: (view) => (
    <>
      <NarratorLobby view={view} />
      <Config view={view} />
    </>
  ),
};

/** Le numero sous le titre : la nuit en cours, ou le jour qui la suit. */
function counterOf(view: PlayerView | NarratorView): { key: string; count: number } | null {
  if (view.nightNumber === 0 || view.phase === 'ENDED') {
    return null;
  }

  return {
    key: view.phase === 'NIGHT' ? 'game.night_number' : 'game.day_number',
    count: view.nightNumber,
  };
}

function Table({ gameId, me }: { readonly gameId: string; readonly me: MeResponse }) {
  const { t } = useTranslation();
  const view = useGameView();
  const status = useGameStore((store) => store.status);
  const storeError = useGameStore((store) => store.error);
  const summary = useQuery({ queryKey: ['game', gameId], queryFn: () => api.game(gameId) });

  useGameConnection(gameId);

  const counter = view === null ? null : counterOf(view);

  if (summary.isError) {
    return <FormError message={t('game.unknown_game')} />;
  }

  return (
    <>
      <header className="flex flex-col gap-2">
        <PhaseBanner
          title={view === null ? t('common.loading') : t(`phase.${view.phase.toLowerCase()}.title`)}
          {...(counter === null ? {} : { subtitle: t(counter.key, { count: counter.count }) })}
          timer={
            view === null ? null : (
              <Timer
                deadline={view.deadline}
                pausedRemaining={view.pausedRemaining}
                label={t('timer.label')}
                pausedLabel={t('timer.paused')}
                announce={(seconds) => t('timer.announce', { count: seconds })}
              />
            )
          }
        />
        <ConnectionIndicator status={status} />
        {summary.data?.narrator === true ? (
          <p className="font-pixel text-lg tracking-widest text-accent">
            {t('game.code', { code: summary.data.code })}
          </p>
        ) : null}
        <FormError message={storeError === null ? null : t(storeError.messageKey)} />
      </header>

      {view === null ? null : view.kind === 'narrator' ? (
        <NarratorTable view={view} />
      ) : (
        <PlayerScreen view={view} me={me} />
      )}

      {view === null ? null : <DebugView view={view} />}
    </>
  );
}

function namesOf(view: PlayerView | NarratorView): Map<string, string> {
  return new Map(view.players.map((player) => [player.id, player.name]));
}

function NarratorTable({ view }: { readonly view: NarratorView }) {
  const { t } = useTranslation();
  const { send, busy, error } = useSendCommand();
  const confirmed = view.players.filter((player) => player.roleSeen).length;

  return (
    <>
      {NARRATOR_SCREENS[view.phase]?.(view)}
      {view.phase === 'DEAL' ? (
        <p className="text-text-muted">
          {t('game.confirmations', { count: confirmed, total: view.players.length })}
        </p>
      ) : null}
      <ActionPanel actions={view.actions} names={namesOf(view)} skip={['KickPlayer']} />
      <Button
        variant="ghost"
        disabled={busy}
        onClick={() => {
          void send({ type: 'Undo' });
        }}
      >
        {t('actions.undo')}
      </Button>
      <FormError message={error === null ? null : t(error)} />
    </>
  );
}

/** Vue de debogage (M2) : la vue projetee telle qu'elle est arrivee du serveur. */
function DebugView({ view }: { readonly view: PlayerView | NarratorView }) {
  const { t } = useTranslation();

  return (
    <details className="rounded-card border border-border p-3 text-text">
      <summary>{t('game.debug_title')}</summary>
      <p className="text-sm text-text-muted">{t('game.debug_hint')}</p>
      <h2 className="mt-2 text-sm text-text">{t('game.view_json')}</h2>
      <pre data-testid="view-json" className="overflow-x-auto text-xs text-text-muted">
        {JSON.stringify(view, null, 2)}
      </pre>
    </details>
  );
}
