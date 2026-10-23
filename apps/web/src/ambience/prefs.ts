import { useSyncExternalStore } from 'react';

/**
 * Preferences de cet appareil (sons, vibrations) : une commodite locale,
 * rangee dans `localStorage`. Sans stockage (navigation privee), on garde la
 * valeur par defaut. Ce n'est pas un etat de jeu.
 */
export type Pref = 'sounds' | 'vibrations';

const DEFAULTS: Readonly<Record<Pref, boolean>> = { sounds: true, vibrations: true };
const listeners = new Set<() => void>();

function storageKey(pref: Pref): string {
  return `rougarou.prefs.${pref}`;
}

export function readPref(pref: Pref): boolean {
  try {
    const stored = window.localStorage.getItem(storageKey(pref));

    return stored === null ? DEFAULTS[pref] : stored === 'true';
  } catch {
    return DEFAULTS[pref];
  }
}

export function writePref(pref: Pref, value: boolean): void {
  try {
    window.localStorage.setItem(storageKey(pref), String(value));
  } catch {
    // Stockage indisponible : la preference vaut pour cette page seulement.
  }

  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function usePref(pref: Pref): boolean {
  return useSyncExternalStore(
    subscribe,
    () => readPref(pref),
    () => DEFAULTS[pref],
  );
}
