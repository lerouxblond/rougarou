import type { NarratorView, PlayerView } from '@rougarou/protocol';
import { useEffect, useRef } from 'react';

import { cuesOf, phaseTheme } from './cues.ts';
import { soundFor, vibrationFor } from './feedback.ts';
import { readPref } from './prefs.ts';
import { playSound } from './sounds.ts';

type View = PlayerView | NarratorView;

/**
 * L'ambiance de la partie : le theme suit la phase (`data-phase` sur
 * `<html>`, `docs/06`), le meneur entend les sons publics (P31), le joueur
 * sent les vibrations permises (`docs/12` §5). Ce sont des effets de bord,
 * pas un etat : rien n'est derive pour l'affichage.
 */
export function useAmbience(view: View | null): void {
  const previous = useRef<View | null>(null);
  const phase = view?.phase ?? null;

  useEffect(() => {
    document.documentElement.dataset.phase = phaseTheme(phase);
  }, [phase]);

  // Hors de la partie, l'app revient au theme de nuit.
  useEffect(
    () => () => {
      document.documentElement.dataset.phase = 'night';
    },
    [],
  );

  useEffect(() => {
    if (view === null) {
      return;
    }

    const cues = cuesOf(previous.current, view);

    previous.current = view;

    for (const cue of cues) {
      if (view.kind === 'narrator') {
        const sound = soundFor(cue);

        if (sound !== null && readPref('sounds')) {
          playSound(sound);
        }
      } else {
        const pattern = vibrationFor(cue, {
          playMode: view.options.playMode,
          // La nuit du jeu, pas le theme : la distribution vibre aussi en presentiel.
          night: view.phase === 'NIGHT',
        });

        if (pattern !== null && readPref('vibrations') && typeof navigator.vibrate === 'function') {
          navigator.vibrate(pattern);
        }
      }
    }
  }, [view]);
}
