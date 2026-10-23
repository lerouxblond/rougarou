import { Badge } from './Badge.tsx';

/**
 * L'echarpe du Maire, posee sur un `PlayerChip` (`docs/06`). A son
 * apparition, elle grandit doucement (investiture, US-49), sauf en mouvement
 * reduit.
 */
export function MayorBadge({ label }: { readonly label: string }) {
  return (
    <span className="inline-flex motion-safe:animate-[investiture_600ms_var(--ease-out)]">
      <Badge tone="accent">
        <svg viewBox="0 0 12 12" className="size-3" aria-hidden="true">
          <path d="M1 2h10L7 6l4 4H1l4-4z" fill="currentColor" />
        </svg>
        {label}
      </Badge>
    </span>
  );
}
