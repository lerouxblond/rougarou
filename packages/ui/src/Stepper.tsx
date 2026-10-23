import { useId } from 'react';

export interface StepperProps {
  /** Ce que l'on compte (« Voyante »). */
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
  /** Noms des boutons pour les lecteurs d'ecran (« Retirer une Voyante »). */
  decrementLabel: string;
  incrementLabel: string;
}

const BUTTON_CLASSES = [
  'inline-flex items-center justify-center rounded-pill tap-target',
  'border border-border bg-surface-raised text-lg text-text hover:bg-surface',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
  'disabled:cursor-not-allowed disabled:opacity-40',
].join(' ');

/** Un compteur + et −, utilisable au clavier et annonce a chaque changement. */
export function Stepper({
  label,
  value,
  min = 0,
  max = Number.POSITIVE_INFINITY,
  onChange,
  decrementLabel,
  incrementLabel,
}: StepperProps) {
  const id = useId();

  return (
    <div role="group" aria-labelledby={id} className="flex items-center justify-between gap-3">
      <span id={id} className="text-text">
        {label}
      </span>
      <span className="flex items-center gap-2">
        <button
          type="button"
          aria-label={decrementLabel}
          className={BUTTON_CLASSES}
          disabled={value <= min}
          onClick={() => {
            onChange(value - 1);
          }}
        >
          <span aria-hidden="true">−</span>
        </button>
        <output aria-live="polite" className="w-8 text-center font-pixel text-text">
          {value}
        </output>
        <button
          type="button"
          aria-label={incrementLabel}
          className={BUTTON_CLASSES}
          disabled={value >= max}
          onClick={() => {
            onChange(value + 1);
          }}
        >
          <span aria-hidden="true">+</span>
        </button>
      </span>
    </div>
  );
}
