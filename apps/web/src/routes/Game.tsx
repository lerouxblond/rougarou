import type { MeResponse, NarratorView, Phase, PlayerView } from '@rougarou/protocol';
import { Button } from '@rougarou/ui';
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
import { NarratorLobby, PlayerLobby } from '../game/Lobby.tsx';
import { MyInfo } from '../game/MyInfo.tsx';
import { NightPanel } from '../game/NightPanel.tsx';
import { RoleCard } from '../game/RoleCard.tsx';
import { useGameStore } from '../game/store.ts';

/** `/game/:gameId` : un seul composant routeur selon (phase × lecteur) (`docs/03`, `docs/04`). */
export function Game() {
  const { gameId } = useParams({ from: '/game/$gameId' });

  return (
    <main id="contenu" className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 p-6">
      <AuthGate>{(me) => <Table gameId={gameId} me={me} />}</AuthGate>
    </main>
  );
}

interface Screens {
  readonly narrator?: (view: NarratorView) => ReactNode;
  readonly player?: (view: PlayerView, me: MeResponse) => ReactNode;
}

/**
 * La table `(phase, lecteur) → ecran`, sans cascade de `if` (`docs/04`
 * §Client web). Les phases absentes n'ont, en M2, que la vue de debogage.
 */
const SCREENS: Partial<Record<Phase, Screens>> = {
  LOBBY: {
    narrator: (view) => <NarratorLobby view={view} />,
    player: (view, me) => <PlayerLobby view={view} displayName={me.displayName} />,
  },
  CONFIG: {
    narrator: (view) => (
      <>
        <NarratorLobby view={view} />
        <Config view={view} />
      </>
    ),
    player: (view, me) => <PlayerLobby view={view} displayName={me.displayName} />,
  },
};

function Table({ gameId, me }: { readonly gameId: string; readonly me: MeResponse }) {
  const { t } = useTranslation();
  const view = useGameView();
  const status = useGameStore((store) => store.status);
  const storeError = useGameStore((store) => store.error);
  const summary = useQuery({ queryKey: ['game', gameId], queryFn: () => api.game(gameId) });

  useGameConnection(gameId);

  if (summary.isError) {
    return <FormError message={t('game.unknown_game')} />;
  }

  return (
    <>
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-3xl text-text" aria-live="polite">
          {view === null ? t('common.loading') : t(`phase.${view.phase.toLowerCase()}.title`)}
        </h1>
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
        <PlayerTable view={view} me={me} />
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
      {SCREENS[view.phase]?.narrator?.(view)}
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

function PlayerTable({ view, me }: { readonly view: PlayerView; readonly me: MeResponse }) {
  const { t } = useTranslation();
  const role = view.me?.role ?? null;

  return (
    <>
      {SCREENS[view.phase]?.player?.(view, me)}
      {role === null ? null : <RoleCard role={role} />}
      {view.night === null ? null : <NightPanel night={view.night} names={namesOf(view)} />}
      <MyInfo knowledge={view.me?.knowledge ?? []} names={namesOf(view)} />
      {view.me?.alive === false ? <p className="text-danger">{t('game.you_are_dead')}</p> : null}
      {view.winner === null ? null : (
        <p className="font-display text-2xl text-accent">{t(`winner.${view.winner}`)}</p>
      )}
      <ActionPanel actions={view.actions} names={namesOf(view)} />
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
