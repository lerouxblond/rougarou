/** Commandes autorisees par seconde et par socket (`docs/04` §Securite). */
export const COMMANDS_PER_SECOND = 10;

const WINDOW_MS = 1000;

/**
 * Limiteur a fenetre glissante, une file d'horodatages par socket. Il vit en
 * memoire : un Durable Object qui hiberne l'oublie, ce qui ne laisse passer
 * qu'une rafale de plus apres un long silence.
 */
export class RateLimiter<K extends object> {
  private readonly hits = new WeakMap<K, number[]>();

  private readonly limit: number;

  constructor(limit = COMMANDS_PER_SECOND) {
    this.limit = limit;
  }

  /** Enregistre un coup ; `false` si la limite est atteinte. */
  allow(key: K, now: number): boolean {
    const recent = (this.hits.get(key) ?? []).filter((at) => now - at < WINDOW_MS);

    if (recent.length >= this.limit) {
      this.hits.set(key, recent);
      return false;
    }

    recent.push(now);
    this.hits.set(key, recent);
    return true;
  }
}
