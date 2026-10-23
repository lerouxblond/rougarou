import type { CSSProperties } from 'react';

/** Au-dela, la jauge est en butee. */
const RANGE = 15;

export interface BalanceMeterProps {
  /** « Equilibre de la composition ». */
  readonly label: string;
  readonly score: number;
  readonly verdict: 'village' | 'balanced' | 'wolves';
  /** Le verdict en toutes lettres (« Avantage village ») : jamais la couleur seule. */
  readonly verdictLabel: string;
  /** Les deux bouts de la jauge (« Loups », « Village »). */
  readonly wolvesLabel: string;
  readonly villageLabel: string;
}

const VERDICT_CLASSES = {
  village: 'text-team-village',
  balanced: 'text-text',
  wolves: 'text-team-wolves',
} as const;

/**
 * L'indicateur d'equilibre de la configuration (US-20, `docs/02`) : une jauge
 * des loups au village, et son verdict ecrit. Le score vient du protocole
 * (`balanceOf`), l'indicateur ne calcule rien.
 */
export function BalanceMeter({
  label,
  score,
  verdict,
  verdictLabel,
  wolvesLabel,
  villageLabel,
}: BalanceMeterProps) {
  const clamped = Math.max(-RANGE, Math.min(RANGE, score));
  const position = ((clamped + RANGE) / (2 * RANGE)) * 100;

  return (
    <div className="flex flex-col gap-1">
      <div
        role="meter"
        aria-label={label}
        aria-valuemin={-RANGE}
        aria-valuemax={RANGE}
        aria-valuenow={clamped}
        aria-valuetext={verdictLabel}
        className="relative h-2 rounded-pill bg-surface-raised"
      >
        <span
          aria-hidden="true"
          // La position est calculee : seul cas ou `style` est permis (`docs/09`).
          style={{ '--balance': `${position}%` } as CSSProperties}
          className="absolute top-1/2 left-[var(--balance)] size-4 -translate-x-1/2 -translate-y-1/2 rounded-pill border-2 border-accent bg-bg"
        />
      </div>
      <div className="flex justify-between text-xs text-text-muted">
        <span>{wolvesLabel}</span>
        <span className={`font-medium ${VERDICT_CLASSES[verdict]}`}>{verdictLabel}</span>
        <span>{villageLabel}</span>
      </div>
    </div>
  );
}
