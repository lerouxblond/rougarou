import type { CSSProperties } from 'react';

export interface VoteEntry {
  readonly id: string;
  readonly label: string;
  /** Voix ponderees (Maire, Corbeau). */
  readonly votes: number;
  /** Qui a vote pour lui, en vote public (`R-30`). */
  readonly voters?: readonly string[];
}

export interface VoteBoardProps {
  /** Nom du tableau (« Votes »). */
  readonly label: string;
  readonly entries: readonly VoteEntry[];
  /** En vote secret, seul le compteur s'affiche (US-52). */
  readonly visibility: 'public' | 'secret';
  /** Le compteur, deja ecrit (« 4 sur 7 ont vote »). */
  readonly progress: string;
  /** « 2 voix » : le nombre de voix en toutes lettres. */
  readonly votesLabel: (votes: number) => string;
}

/**
 * Les votes en direct (US-52, moment vivant 4 de `docs/06`) : une barre par
 * candidat, la plus chargee en tete, et en vote public le nom de ceux qui
 * ont vote. La largeur glisse avec `--motion-base`, nulle en mouvement reduit.
 */
export function VoteBoard({ label, entries, visibility, progress, votesLabel }: VoteBoardProps) {
  const max = Math.max(1, ...entries.map((entry) => entry.votes));
  const ranked = [...entries].sort((left, right) => right.votes - left.votes);

  return (
    <section aria-label={label} className="flex flex-col gap-3">
      <p aria-live="polite" className="font-pixel text-sm text-text-muted">
        {progress}
      </p>
      {visibility === 'secret' ? null : (
        <ul className="flex flex-col gap-2">
          {ranked.map((entry) => (
            <li key={entry.id} className="flex flex-col gap-1">
              <span className="flex justify-between gap-2 text-text">
                <span>{entry.label}</span>
                <span className="font-pixel">{votesLabel(entry.votes)}</span>
              </span>
              <span aria-hidden="true" className="h-2 rounded-pill bg-surface-raised">
                <span
                  // La largeur est calculee : seul cas ou `style` est permis (`docs/09`).
                  style={{ '--vote-share': `${(entry.votes / max) * 100}%` } as CSSProperties}
                  className="block h-full w-[var(--vote-share)] rounded-pill bg-accent transition-[width] duration-base ease-lantern"
                />
              </span>
              {entry.voters === undefined || entry.voters.length === 0 ? null : (
                <span className="text-sm text-text-muted">{entry.voters.join(', ')}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
