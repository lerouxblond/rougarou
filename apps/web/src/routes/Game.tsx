import type { MeResponse, NarratorView, PlayerView } from '@rougarou/protocol';
import { PhaseBanner, Skeleton, Switch, Timer } from '@rougarou/ui';
import { useQuery } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';

import { usePref, writePref } from '../ambience/prefs.ts';
import { useAmbience } from '../ambience/useAmbience.ts';
import { api } from '../api.ts';
import { AuthGate } from '../components/AuthGate.tsx';
import { ConnectionIndicator } from '../components/ConnectionIndicator.tsx';
import { FormError } from '../components/Field.tsx';
import { useGameConnection, useGameView } from '../game/hooks.ts';
import { NarratorScreen } from '../game/NarratorScreen.tsx';
import { PlayerScreen } from '../game/PlayerScreen.tsx';
import { useGameStore } from '../game/store.ts';

/** Le code et son QR ne servent qu'au meneur, au salon : charges a la demande (ADR 0011). */
const JoinCard = lazy(() =>
  import('../game/JoinCard.tsx').then((module) => ({ default: module.JoinCard })),
);

/** `/game/:gameId` : un seul composant routeur selon (phase × lecteur) (`docs/03`, `docs/04`). */
export function Game() {
  const { gameId } = useParams({ from: '/game/$gameId' });

  return (
    <main id="contenu" className="mx-auto flex min-h-dvh max-w-6xl flex-col gap-6 p-4 sm:p-6">
      <AuthGate>{(me) => <Table gameId={gameId} me={me} />}</AuthGate>
    </main>
  );
}

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
  useAmbience(view);

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
        <div className="flex flex-wrap items-center justify-between gap-4">
          <ConnectionIndicator status={status} />
          {view === null ? null : <FeedbackToggle narrator={view.kind === 'narrator'} />}
        </div>
        {summary.data?.narrator !== true ? null : view?.phase === 'LOBBY' ||
          view?.phase === 'CONFIG' ? (
          <Suspense fallback={<Skeleton className="h-36 w-full" />}>
            <JoinCard code={summary.data.code} />
          </Suspense>
        ) : (
          <p data-testid="game-code" className="font-pixel text-lg tracking-widest text-accent">
            {t('game.code', { code: summary.data.code })}
          </p>
        )}
        <FormError message={storeError === null ? null : t(storeError.messageKey)} />
      </header>

      {view === null ? null : view.kind === 'narrator' ? (
        <NarratorScreen view={view} />
      ) : (
        <PlayerScreen view={view} me={me} />
      )}

      {view === null ? null : <DebugView view={view} />}
    </>
  );
}

/**
 * Sons chez le meneur, vibrations chez le joueur (`docs/12` §5) : chacun les
 * coupe sur son appareil.
 */
function FeedbackToggle({ narrator }: { readonly narrator: boolean }) {
  const { t } = useTranslation();
  const pref = narrator ? 'sounds' : 'vibrations';
  const on = usePref(pref);

  return (
    <div className="w-56">
      <Switch
        label={t(`ambience.${pref}`)}
        checked={on}
        onCheckedChange={(checked) => {
          writePref(pref, checked);
        }}
      />
    </div>
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
