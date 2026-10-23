import type { JournalEntry, JournalFact, NarratorView, PlayerView } from '@rougarou/protocol';
import { Badge } from '@rougarou/ui';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';

import { roleKey } from './roles.ts';
import { outcomeText } from './VotePanel.tsx';

type Name = (id: string) => string;

/** Les faits qui viennent du mode correction (`R-18`) : ils portent un badge. */
function isCorrection(fact: JournalFact): boolean {
  return (
    (fact.kind === 'playerKilled' && fact.cause === 'correction') ||
    fact.kind === 'playerRevived' ||
    fact.kind === 'roleCorrected'
  );
}

function witchChoice(fact: Extract<JournalFact, { kind: 'witchActed' }>, name: Name, t: TFunction) {
  const parts = [
    ...(fact.save ? [t('journal.witch_save')] : []),
    ...(fact.kill === null ? [] : [t('journal.witch_kill', { name: name(fact.kill) })]),
  ];

  return parts.length === 0 ? t('journal.witch_nothing') : parts.join(', ');
}

/** Un fait du journal, en toutes lettres (`R-19`). */
export function factText(fact: JournalFact, name: Name, t: TFunction): string {
  switch (fact.kind) {
    case 'nightStarted':
      return t('journal.night_started');
    case 'wolvesChose':
      return fact.victim === null
        ? t('journal.wolves_none')
        : t('journal.wolves_chose', { name: name(fact.victim) });
    case 'seerProbed':
      return t('journal.seer_probed', { seer: name(fact.seer), target: name(fact.target) });
    case 'witchActed':
      return t('journal.witch_acted', {
        witch: name(fact.witch),
        choice: witchChoice(fact, name, t),
      });
    case 'loversLinked':
      return t('journal.lovers_linked', {
        cupid: name(fact.cupid),
        first: name(fact.lovers[0]),
        second: name(fact.lovers[1]),
      });
    case 'littleGirlSpied':
      return t(fact.caught ? 'journal.spied_caught' : 'journal.spied', {
        name: name(fact.playerId),
      });
    case 'playerKilled':
      return t('journal.player_killed', {
        name: name(fact.playerId),
        cause: t(`death_cause.${fact.cause}`),
      });
    case 'hunterShot':
      return t('journal.hunter_shot', { hunter: name(fact.hunter), target: name(fact.target) });
    case 'mayorElected':
      return t(fact.drawn ? 'journal.mayor_drawn' : 'journal.mayor_elected', {
        name: name(fact.playerId),
      });
    case 'mayorDesignated':
      return t(fact.drawn ? 'journal.successor_drawn' : 'journal.successor', {
        from: name(fact.from),
        to: name(fact.to),
      });
    case 'voteClosed':
      return outcomeText(fact.outcome, name, t);
    case 'playerRevived':
      return t('journal.player_revived', { name: name(fact.playerId) });
    case 'roleCorrected':
      return t('journal.role_corrected', {
        name: name(fact.playerId),
        role: t(`roles.${roleKey(fact.to)}.name`),
      });
    case 'phaseForced':
      return t('journal.phase_forced', { phase: t(`phase.${fact.phase.toLowerCase()}.title`) });
    case 'timerExpired':
      return t('journal.timer_expired', { phase: t(`phase.${fact.phase.toLowerCase()}.title`) });
    case 'gameEnded':
      return t(`winner.${fact.winner}`);
  }
}

/** L'heure d'une entree, a la seconde, dans la langue de l'interface. */
function clock(at: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, { timeStyle: 'medium' }).format(at);
}

/**
 * Le journal horodate (US-80, `R-19`) : en direct pour le meneur, et pour les
 * joueurs une fois la partie finie. Chaque correction porte un badge.
 */
export function JournalPanel({
  view,
  entries,
  label,
}: {
  readonly view: PlayerView | NarratorView;
  readonly entries: readonly JournalEntry[];
  /** Nom de la liste, quand plusieurs se suivent (chronologie de fin). */
  readonly label?: string;
}) {
  const { t, i18n } = useTranslation();
  const name = (id: string) => view.players.find((player) => player.id === id)?.name ?? id;

  return (
    <ol aria-label={label ?? t('journal.title')} className="flex flex-col gap-2 text-sm">
      {entries.map((entry, index) => (
        <li key={index} className="flex flex-wrap items-baseline gap-2">
          <time
            className="font-pixel text-xs text-text-muted"
            dateTime={new Date(entry.at).toISOString()}
          >
            {clock(entry.at, i18n.language)}
          </time>
          <span className="text-text">{factText(entry.fact, name, t)}</span>
          {isCorrection(entry.fact) ? <Badge tone="accent">{t('journal.correction')}</Badge> : null}
        </li>
      ))}
    </ol>
  );
}
