import type { NarratorView, Phase } from '@rougarou/protocol';
import {
  Button,
  NarratorScript,
  NightStepList,
  Skeleton,
  Tabs,
  type StepState,
} from '@rougarou/ui';
import { lazy, Suspense, useSyncExternalStore, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { FormError } from '../components/Field.tsx';
import { ActionPanel } from './ActionPanel.tsx';
import { Config } from './Config.tsx';
import { CorrectionDialog } from './CorrectionDialog.tsx';
import { EndScreen } from './EndScreen.tsx';
import { useSendCommand } from './hooks.ts';
import { blockerOf, primaryLabel, scriptOf, stepTexts, type Line } from './narrator-script.ts';
import { JournalPanel } from './JournalPanel.tsx';
import { NightIntents } from './NightIntents.tsx';
import { PlayersList } from './PlayersPanel.tsx';
import { VotePanel } from './VotePanel.tsx';

/** Le salon du meneur et son glisser-deposer, charges a la demande (ADR 0011). */
export const loadNarratorLobby = () => import('./NarratorLobby.tsx');

const NarratorLobby = lazy(() =>
  loadNarratorLobby().then((module) => ({ default: module.NarratorLobby })),
);

/** Les actions que le bouton principal et la barre d'outils presentent deja. */
const HANDLED = [
  'AdvancePhase',
  'PauseTimer',
  'ResumeTimer',
  'ExtendTimer',
  'KickPlayer',
  'CorrectKill',
  'CorrectRevive',
  'CorrectRole',
] as const;

/** Ecran large (`docs/06` : trois colonnes a partir de 1024 px). */
const WIDE = '(min-width: 1024px)';

function subscribe(onChange: () => void): () => void {
  const query = typeof window.matchMedia === 'function' ? window.matchMedia(WIDE) : null;

  query?.addEventListener('change', onChange);
  return () => query?.removeEventListener('change', onChange);
}

/** Une seule mise en page a la fois : le bouton principal n'existe qu'une fois. */
function useWide(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => typeof window.matchMedia === 'function' && window.matchMedia(WIDE).matches,
    () => false,
  );
}

/** Ce que le meneur voit de la phase en cours, sous le texte a lire. */
const PHASE_PANELS: Partial<Record<Phase, (view: NarratorView) => ReactNode>> = {
  LOBBY: (view) => (
    <Suspense fallback={<Skeleton className="h-40 w-full" />}>
      <NarratorLobby view={view} />
    </Suspense>
  ),
  CONFIG: (view) => (
    <>
      <Suspense fallback={<Skeleton className="h-40 w-full" />}>
        <NarratorLobby view={view} />
      </Suspense>
      <Config view={view} />
    </>
  ),
  MAYOR_ELECTION: (view) => <VotePanel view={view} />,
  DAY_VOTE: (view) => <VotePanel view={view} />,
  ENDED: (view) => <EndScreen view={view} />,
};

function useLine(): (line: Line) => string {
  const { t } = useTranslation();

  return (line) => {
    // Le nom d'une etape de nuit est lui-meme une cle i18n.
    const step = line.params?.step;

    return t(line.key, {
      ...line.params,
      ...(typeof step === 'string' ? { step: t(stepTexts(step).title) } : {}),
    });
  };
}

/** Le bouton principal unique (`docs/12` §1), et ce qui le bloque juste au-dessus. */
function PrimaryAction({ view }: { readonly view: NarratorView }) {
  const { t } = useTranslation();
  const line = useLine();
  const { send, busy, error } = useSendCommand();
  const advance = view.actions.find((action) => action.type === 'AdvancePhase');

  if (advance?.type !== 'AdvancePhase') {
    return null;
  }

  const label = t(primaryLabel(view));

  return (
    <div className="flex flex-col gap-2">
      {advance.blocked ? (
        <p aria-live="polite" className="text-sm text-text-muted">
          {line(blockerOf(view))}
        </p>
      ) : null}
      <Button
        data-testid="primary-action"
        // En attente, forcer reste possible mais discret : on attend d'ordinaire (`R-10`).
        variant={advance.blocked ? 'secondary' : 'primary'}
        loading={busy}
        onClick={() => {
          void send({ type: 'AdvancePhase', force: advance.blocked });
        }}
      >
        {advance.blocked ? t('narrator.primary.force', { action: label }) : label}
      </Button>
      <FormError message={error === null ? null : t(error)} />
    </div>
  );
}

/** Libelle des commandes du minuteur (`R-16`). */
const TIMER_LABELS = {
  PauseTimer: 'actions.pause_timer',
  ResumeTimer: 'actions.resume_timer',
  ExtendTimer: 'actions.extend_timer',
} as const;

/** Annuler, pause, reprise et +30 s (`R-11`, `R-16`). */
function Toolbar({ view }: { readonly view: NarratorView }) {
  const { t } = useTranslation();
  const { send, busy, error } = useSendCommand();
  const timers = view.actions.flatMap((action) =>
    action.type === 'PauseTimer' || action.type === 'ResumeTimer' || action.type === 'ExtendTimer'
      ? [action.type]
      : [],
  );

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap gap-2">
        {timers.map((type) => (
          <Button
            key={type}
            variant="secondary"
            size="md"
            disabled={busy}
            onClick={() => {
              void send({ type });
            }}
          >
            {t(TIMER_LABELS[type])}
          </Button>
        ))}
        <Button
          variant="ghost"
          size="md"
          disabled={busy}
          onClick={() => {
            void send({ type: 'Undo' });
          }}
        >
          {t('actions.undo')}
        </Button>
        <CorrectionDialog view={view} />
      </div>
      <FormError message={error === null ? null : t(error)} />
    </div>
  );
}

function steps(view: NarratorView) {
  const { night } = view;

  return (night?.steps ?? []).map((step, index) => {
    let state: StepState = 'upcoming';

    if (
      night !== null &&
      (index < night.current || (index === night.current && night.stepResolved))
    ) {
      state = 'done';
    } else if (night?.current === index) {
      state = 'current';
    }

    return { id: step, label: stepTexts(step).title, state };
  });
}

/**
 * Le tableau de bord du meneur (`docs/06` §Mises en page) : etapes, texte a
 * lire et actions, joueurs avec leurs roles. Trois colonnes sur ordinateur ;
 * sur telephone et tablette, le texte et les actions, puis des onglets.
 */
export function NarratorScreen({ view }: { readonly view: NarratorView }) {
  const { t } = useTranslation();
  const line = useLine();
  const wide = useWide();
  const names = new Map(view.players.map((player) => [player.id, player.name]));
  const script = scriptOf(view);
  const confirmed = view.players.filter((player) => player.roleSeen).length;

  const stepList = (
    <NightStepList
      label={t('narrator.steps')}
      steps={steps(view).map((step) => ({ ...step, label: t(step.label) }))}
      stateLabels={{
        upcoming: t('narrator.step_state.upcoming'),
        current: t('narrator.step_state.current'),
        done: t('narrator.step_state.done'),
        skipped: t('narrator.step_state.skipped'),
      }}
    />
  );
  const journal = <JournalPanel view={view} entries={view.journal} />;
  const main = (
    <div className="flex flex-col gap-6">
      <NarratorScript
        label={t('narrator.script')}
        current={line(script.current)}
        {...(script.previous === undefined ? {} : { previous: line(script.previous) })}
        {...(script.next === undefined ? {} : { next: line(script.next) })}
        previousLabel={t('narrator.previous')}
        nextLabel={t('narrator.next')}
      />
      {view.phase === 'DEAL' ? (
        <p className="text-text-muted">
          {t('game.confirmations', { count: confirmed, total: view.players.length })}
        </p>
      ) : null}
      <NightIntents view={view} />
      {PHASE_PANELS[view.phase]?.(view)}
      <ActionPanel actions={view.actions} names={names} skip={[...HANDLED]} />
      <PrimaryAction view={view} />
      <Toolbar view={view} />
    </div>
  );

  // La colonne principale garde la meme place dans l'arbre quelle que soit la
  // largeur : un brouillon (composition, options) survit a la rotation d'une tablette.
  return (
    <div className={wide ? 'grid grid-cols-[14rem_1fr_18rem] gap-6' : 'flex flex-col gap-8'}>
      {wide ? <aside>{stepList}</aside> : null}
      {main}
      {wide ? (
        <aside className="flex flex-col gap-6">
          <PlayersList players={view.players} />
          <section className="flex flex-col gap-2">
            <h2 className="font-display text-xl text-text">{t('journal.title')}</h2>
            {journal}
          </section>
        </aside>
      ) : (
        <Tabs
          label={t('narrator.tabs')}
          items={[
            { value: 'steps', label: t('narrator.steps'), content: stepList },
            {
              value: 'players',
              label: t('players.label'),
              content: <PlayersList players={view.players} />,
            },
            { value: 'journal', label: t('journal.title'), content: journal },
          ]}
        />
      )}
    </div>
  );
}
