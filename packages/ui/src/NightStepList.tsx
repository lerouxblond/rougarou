export type StepState = 'upcoming' | 'current' | 'done' | 'skipped';

export interface NightStep {
  readonly id: string;
  readonly label: string;
  readonly state: StepState;
}

const MARKS: Record<StepState, string> = {
  upcoming: '○',
  current: '●',
  done: '✓',
  skipped: '–',
};

const CLASSES: Record<StepState, string> = {
  upcoming: 'text-text-muted',
  current: 'text-accent',
  done: 'text-text',
  skipped: 'text-text-muted line-through',
};

/**
 * L'ordre de la nuit et l'etat de chaque etape (`docs/06`, US-41). L'etat est
 * ecrit pour les lecteurs d'ecran, et l'etape en cours porte `aria-current`.
 */
export function NightStepList({
  label,
  steps,
  stateLabels,
}: {
  readonly label: string;
  readonly steps: readonly NightStep[];
  /** L'etat en toutes lettres (« en cours », « faite »…). */
  readonly stateLabels: Readonly<Record<StepState, string>>;
}) {
  return (
    <ol aria-label={label} className="flex flex-col gap-2">
      {steps.map((step) => (
        <li
          key={step.id}
          aria-current={step.state === 'current' ? 'step' : undefined}
          className={`flex items-center gap-3 ${CLASSES[step.state]}`}
        >
          <span aria-hidden="true" className="w-4 font-pixel">
            {MARKS[step.state]}
          </span>
          <span className="flex-1">{step.label}</span>
          <span className="sr-only">{stateLabels[step.state]}</span>
        </li>
      ))}
    </ol>
  );
}
