import type { NarratorView } from '@rougarou/protocol';
import { useTranslation } from 'react-i18next';

/**
 * Ce que le meneur voit en direct la nuit (US-41) : les votes des loups, le
 * choix de la Sorciere, la Petite fille ; puis, a l'aube, les morts et leur
 * cause, qu'il est seul a connaitre (`docs/04` §Projection).
 */
export function NightIntents({ view }: { readonly view: NarratorView }) {
  const { t } = useTranslation();
  const name = (id: string) => view.players.find((player) => player.id === id)?.name ?? id;
  const { night, dawn } = view;
  const lines: string[] = [];

  if (night !== null) {
    for (const [wolf, target] of Object.entries(night.wolfVotes)) {
      lines.push(t('night.wolves.vote', { wolf: name(wolf), target: name(target) }));
    }

    if (night.wolfVictim !== null) {
      lines.push(t('journal.wolves_chose', { name: name(night.wolfVictim) }));
    }

    if (night.witch !== null) {
      lines.push(
        night.witch.save || night.witch.kill !== null
          ? [
              ...(night.witch.save ? [t('journal.witch_save')] : []),
              ...(night.witch.kill === null
                ? []
                : [t('journal.witch_kill', { name: name(night.witch.kill) })]),
            ].join(', ')
          : t('journal.witch_nothing'),
      );
    }

    if (night.spy !== null) {
      lines.push(
        t(night.spy.caught ? 'journal.spied_caught' : 'journal.spied', {
          name: name(night.spy.playerId),
        }),
      );
    }
  }

  for (const death of dawn?.deaths ?? []) {
    lines.push(
      t('journal.player_killed', {
        name: name(death.playerId),
        cause: t(`death_cause.${death.cause}`),
      }),
    );
  }

  if (dawn !== null && dawn.deaths.length === 0) {
    lines.push(t('dawn.nobody'));
  }

  return lines.length === 0 ? null : (
    <ul
      aria-live="polite"
      className="flex flex-col gap-1 rounded-md border border-border bg-surface p-3 text-text"
    >
      {lines.map((text, index) => (
        <li key={index}>{text}</li>
      ))}
    </ul>
  );
}
