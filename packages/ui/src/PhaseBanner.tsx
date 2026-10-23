import type { ReactNode } from 'react';

/**
 * Le haut de l'ecran de partie : la phase, le jour ou la nuit, le minuteur
 * (`docs/06`). Le titre est annonce a chaque changement de phase (`docs/09`).
 */
export function PhaseBanner({
  title,
  subtitle,
  timer,
}: {
  /** La phase (« La nuit tombe »). */
  readonly title: string;
  /** Le numero (« Nuit 2 »). */
  readonly subtitle?: string;
  readonly timer?: ReactNode;
}) {
  return (
    <header className="flex items-end justify-between gap-4 border-b border-border pb-3">
      <div aria-live="polite" className="flex flex-col">
        {subtitle === undefined ? null : (
          <span className="font-pixel text-xs tracking-[0.2em] text-text-muted uppercase">
            {subtitle}
          </span>
        )}
        <h1 className="font-display text-4xl text-text">{title}</h1>
      </div>
      {timer}
    </header>
  );
}
