import { useEffect, useRef, useState, type ReactNode } from 'react';

import { Button } from './Button.tsx';

export interface RoleCardProps {
  /** La face visible : la carte du role, deja traduite. */
  readonly face: ReactNode;
  /** Ce que dit la carte face cachee (« Votre role est cache »). */
  readonly hiddenLabel: string;
  /** Le geste a faire (« Maintenez pour reveler »). */
  readonly holdHint: string;
  /** Le bouton pour l'ordinateur (« Reveler 5 s », US-30). */
  readonly timedRevealLabel: string;
  readonly timedRevealMs?: number;
}

/**
 * La carte de role, face cachee par defaut (US-30). Elle se retourne tant
 * qu'on la maintient (doigt, souris, Espace ou Entree) et se recache des qu'on
 * relache ou que le focus part. Sur ordinateur, « Reveler 5 s » la montre un
 * court instant, puis elle se recache seule.
 */
export function RoleCard({
  face,
  hiddenLabel,
  holdHint,
  timedRevealLabel,
  timedRevealMs = 5000,
}: RoleCardProps) {
  const [holding, setHolding] = useState(false);
  const [timed, setTimed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revealed = holding || timed;

  useEffect(
    () => () => {
      if (timer.current !== null) {
        clearTimeout(timer.current);
      }
    },
    [],
  );

  const show = () => {
    setHolding(true);
  };
  const hide = () => {
    setHolding(false);
  };

  return (
    <div className="flex w-full max-w-60 flex-col items-center gap-3">
      <button
        type="button"
        aria-pressed={revealed}
        className="tap-target flex aspect-[3/4] w-full items-center justify-center rounded-card border border-border bg-surface-raised p-4 text-text select-none focus-visible:outline-2 focus-visible:outline-focus"
        onPointerDown={show}
        onPointerUp={hide}
        onPointerLeave={hide}
        onPointerCancel={hide}
        onBlur={hide}
        onKeyDown={(event) => {
          if (event.key === ' ' || event.key === 'Enter') {
            event.preventDefault();
            show();
          }
        }}
        onKeyUp={hide}
      >
        {revealed ? (
          face
        ) : (
          <span className="flex flex-col items-center gap-2 text-center">
            <span className="font-display text-xl">{hiddenLabel}</span>
            <span className="text-sm text-text-muted">{holdHint}</span>
          </span>
        )}
      </button>
      <Button
        variant="ghost"
        size="md"
        disabled={timed}
        onClick={() => {
          setTimed(true);
          timer.current = setTimeout(() => {
            setTimed(false);
            timer.current = null;
          }, timedRevealMs);
        }}
      >
        {timedRevealLabel}
      </Button>
    </div>
  );
}
