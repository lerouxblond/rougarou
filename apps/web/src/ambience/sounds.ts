import type { Sound } from './feedback.ts';

/** Une note : frequence (Hz), debut et duree (s), forme d'onde. */
interface Note {
  readonly frequency: number;
  readonly start: number;
  readonly duration: number;
  readonly wave?: OscillatorType;
}

/**
 * Les sons publics de M4, synthetises (P31) : de courtes suites de notes,
 * creation originale du projet, sans fichier. M4b les remplacera par des
 * enregistrements (`docs/07` §Sons) sans changer leurs declencheurs.
 */
const SCORES: Readonly<Record<Sound, readonly Note[]>> = {
  nightfall: [
    { frequency: 330, start: 0, duration: 0.9, wave: 'sine' },
    { frequency: 247, start: 0.6, duration: 1.4, wave: 'sine' },
  ],
  daybreak: [
    { frequency: 523, start: 0, duration: 0.35 },
    { frequency: 659, start: 0.25, duration: 0.35 },
    { frequency: 784, start: 0.5, duration: 0.8 },
  ],
  knell: [
    { frequency: 196, start: 0, duration: 1.2, wave: 'triangle' },
    { frequency: 98, start: 0, duration: 1.2, wave: 'sine' },
  ],
  fanfare: [
    { frequency: 392, start: 0, duration: 0.2, wave: 'square' },
    { frequency: 523, start: 0.2, duration: 0.2, wave: 'square' },
    { frequency: 659, start: 0.4, duration: 0.6, wave: 'square' },
  ],
  bell: [{ frequency: 880, start: 0, duration: 0.7, wave: 'triangle' }],
  gong: [
    { frequency: 110, start: 0, duration: 1.0, wave: 'sine' },
    { frequency: 165, start: 0, duration: 0.8, wave: 'triangle' },
  ],
  victory: [
    { frequency: 523, start: 0, duration: 0.3 },
    { frequency: 659, start: 0.3, duration: 0.3 },
    { frequency: 784, start: 0.6, duration: 0.3 },
    { frequency: 1047, start: 0.9, duration: 1.0 },
  ],
};

let context: AudioContext | null = null;

/**
 * Joue un son. Le navigateur n'autorise le son qu'apres un geste de
 * l'utilisateur : le meneur clique sans cesse, donc le contexte est repris
 * a chaque appel. Sans Web Audio, on ne joue rien.
 */
export function playSound(sound: Sound): void {
  if (typeof window.AudioContext !== 'function') {
    return;
  }

  context ??= new window.AudioContext();
  void context.resume();

  const now = context.currentTime;

  for (const note of SCORES[sound]) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const start = now + note.start;

    oscillator.type = note.wave ?? 'sine';
    oscillator.frequency.value = note.frequency;
    // Attaque douce, puis extinction : pas de clic.
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.18, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + note.duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + note.duration + 0.05);
  }
}
