import { useEffect, useState } from 'react';

/** Paliers annonces aux lecteurs d'ecran (`docs/06`). */
const MILESTONES = [30, 10, 0] as const;

export interface TimerProps {
  /** Echeance en millisecondes (horloge du serveur), ou `null` sans minuteur. */
  readonly deadline: number | null;
  /** Duree restante d'un minuteur en pause, en millisecondes (`R-16`). */
  readonly pausedRemaining: number | null;
  /** Nom du minuteur (« Temps restant »). */
  readonly label: string;
  /** Mention ecrite pendant la pause (« En pause »). */
  readonly pausedLabel: string;
  /** Le texte annonce a 30 s, 10 s et 0 s (« Plus que 10 secondes »). */
  readonly announce: (seconds: number) => string;
  /** Horloge injectee, pour les tests ; sinon celle du navigateur. */
  readonly now?: number;
}

/** L'heure du navigateur, rafraichie quatre fois par seconde. */
function useClock(enabled: boolean): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const id = setInterval(() => {
      setNow(Date.now());
    }, 250);

    return () => {
      clearInterval(id);
    };
  }, [enabled]);

  return now;
}

function format(seconds: number): string {
  const minutes = Math.floor(seconds / 60);

  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

/**
 * Le minuteur de l'action en cours. Il n'affiche que ce que le serveur a
 * envoye (`R-14`) ; il ne s'annonce qu'aux paliers, pas a chaque seconde.
 */
export function Timer({
  deadline,
  pausedRemaining,
  label,
  pausedLabel,
  announce,
  now,
}: TimerProps) {
  const clock = useClock(now === undefined && deadline !== null);
  const current = now ?? clock;
  const remaining = pausedRemaining ?? (deadline === null ? null : Math.max(0, deadline - current));

  if (remaining === null) {
    return null;
  }

  const seconds = Math.ceil(remaining / 1000);
  const milestone = [...MILESTONES].reverse().find((step) => seconds <= step);

  return (
    <span className="inline-flex items-center gap-2 font-pixel text-text">
      <span role="timer" aria-label={label} className={seconds <= 10 ? 'text-danger' : ''}>
        {format(seconds)}
      </span>
      {pausedRemaining === null ? null : (
        <span className="text-xs text-text-muted uppercase">{pausedLabel}</span>
      )}
      <span aria-live="polite" className="sr-only">
        {milestone === undefined || pausedRemaining !== null ? '' : announce(milestone)}
      </span>
    </span>
  );
}
