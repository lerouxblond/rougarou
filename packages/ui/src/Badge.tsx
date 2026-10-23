import type { ReactNode } from 'react';

export type BadgeTone = 'neutral' | 'accent' | 'danger' | 'village' | 'wolves' | 'solo';

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: 'border-border text-text-muted',
  accent: 'border-accent text-accent',
  danger: 'border-danger text-danger',
  village: 'border-team-village text-team-village',
  wolves: 'border-team-wolves text-team-wolves',
  solo: 'border-team-solo text-team-solo',
};

/**
 * Une petite etiquette en libelle pixel. Elle porte toujours un texte : une
 * couleur seule ne dit rien a qui ne la voit pas (`docs/06`).
 */
export function Badge({
  tone = 'neutral',
  children,
}: {
  readonly tone?: BadgeTone;
  readonly children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-pill border px-2 py-0.5 font-pixel text-xs tracking-wider uppercase ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  );
}
