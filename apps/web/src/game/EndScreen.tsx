import type { JournalEntry, NarratorView, PlayerView } from '@rougarou/protocol';
import { Badge } from '@rougarou/ui';
import { useTranslation } from 'react-i18next';

import { JournalPanel } from './JournalPanel.tsx';
import { roleKey } from './roles.ts';

/** Ecart entre deux cartes de la revelation en cascade (`docs/06`, moment 6). */
const CASCADE_MS = 80;

interface Chapter {
  readonly id: string;
  readonly key: string;
  readonly count: number;
  readonly entries: JournalEntry[];
}

/** Le journal decoupe nuit par nuit : la nuit N et son aube, puis le jour N. */
function chapters(journal: readonly JournalEntry[]): Chapter[] {
  const result: Chapter[] = [];

  for (const entry of journal) {
    const night = entry.phase === 'NIGHT' || entry.phase === 'DAWN';
    const id = `${night ? 'night' : 'day'}-${String(entry.night)}`;
    const last = result.at(-1);

    if (last?.id === id) {
      last.entries.push(entry);
    } else {
      result.push({
        id,
        key: night ? 'game.night_number' : 'game.day_number',
        count: entry.night,
        entries: [entry],
      });
    }
  }

  return result;
}

/**
 * L'ecran de fin (US-60) : le camp vainqueur, tous les roles reveles en
 * cascade, et la chronologie nuit par nuit (le journal, `R-19`). Le meneur
 * et les joueurs voient la meme chose.
 */
export function EndScreen({ view }: { readonly view: PlayerView | NarratorView }) {
  const { t } = useTranslation();
  const journal = view.journal ?? [];

  return (
    <div className="flex flex-col gap-8">
      {view.winner === null ? null : (
        <p role="status" className="font-display text-4xl text-accent">
          {t(`winner.${view.winner}`)}
        </p>
      )}
      <section className="flex flex-col gap-3">
        <h2 className="font-display text-2xl text-text">{t('end.roles')}</h2>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {view.players.map((player, index) => (
            <li
              key={player.id}
              // Le delai est calcule : seul cas ou `style` est permis (`docs/09`).
              style={{ animationDelay: `${String(index * CASCADE_MS)}ms` }}
              className="flex flex-col gap-1 rounded-md border border-border bg-surface p-3 motion-safe:animate-[card-reveal_600ms_var(--ease-out)_both]"
            >
              <span className="text-text">{player.name}</span>
              <span className="text-sm text-text-muted">
                {player.role === null ? '—' : t(`roles.${roleKey(player.role)}.name`)}
              </span>
              {player.alive ? null : <Badge tone="danger">{t('players.dead')}</Badge>}
            </li>
          ))}
        </ul>
      </section>
      <section className="flex flex-col gap-4">
        <h2 className="font-display text-2xl text-text">{t('end.timeline')}</h2>
        {chapters(journal).map((chapter) => (
          <section key={chapter.id} className="flex flex-col gap-2">
            <h3 className="font-pixel text-xs tracking-[0.2em] text-text-muted uppercase">
              {t(chapter.key, { count: chapter.count })}
            </h3>
            <JournalPanel
              view={view}
              entries={chapter.entries}
              label={t(chapter.key, { count: chapter.count })}
            />
          </section>
        ))}
      </section>
      {/* On quitte la partie : un rechargement complet ferme proprement sa connexion. */}
      <a href="/" className="self-start text-accent underline">
        {t('end.new_game')}
      </a>
    </div>
  );
}
