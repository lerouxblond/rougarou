/**
 * Generateur pseudo-aleatoire a graine.
 *
 * Le moteur est deterministe : rejouer les memes evenements doit donner le
 * meme etat (ADR 0002). L'alea ne vient donc jamais de `Math.random` mais
 * d'ici, et la graine est conservee dans l'evenement `RolesDealt` pour que la
 * partie soit rejouable.
 */
export interface Rng {
  /** Un flottant dans `[0, 1)`. */
  next(): number;
  /** Un entier dans `[0, maxExclusive)`. */
  int(maxExclusive: number): number;
  /** Un element de `items`. */
  pick<T>(items: readonly T[]): T;
  /** Une copie melangee de `items`. L'entree n'est pas modifiee. */
  shuffle<T>(items: readonly T[]): T[];
}

/** 2^32, pour ramener un entier non signe de 32 bits dans `[0, 1)`. */
const UINT32_RANGE = 0x1_0000_0000;

/**
 * Cree un generateur a partir d'une graine.
 *
 * L'algorithme est `mulberry32` : une seule variable d'etat de 32 bits, une
 * suite bien repartie, et un comportement identique sur toutes les
 * plateformes, ce qui est ce qu'on attend d'un moteur rejouable. Ce n'est pas
 * un generateur cryptographique, et il n'a pas a l'etre : il ne sert qu'a
 * distribuer des roles et a melanger des places.
 */
export function createRng(seed: number): Rng {
  if (!Number.isInteger(seed)) {
    throw new Error(`La graine doit etre un entier, recu ${String(seed)}.`);
  }

  // `>>> 0` ramene la graine dans les entiers non signes de 32 bits.
  let state = seed >>> 0;

  const next = (): number => {
    state = (state + 0x6d_2b_79_f5) >>> 0;

    let drawn = state;
    drawn = Math.imul(drawn ^ (drawn >>> 15), drawn | 1);
    drawn ^= drawn + Math.imul(drawn ^ (drawn >>> 7), drawn | 61);

    return ((drawn ^ (drawn >>> 14)) >>> 0) / UINT32_RANGE;
  };

  const int = (maxExclusive: number): number => {
    if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) {
      throw new Error(`La borne doit etre un entier positif, recu ${String(maxExclusive)}.`);
    }

    return Math.floor(next() * maxExclusive);
  };

  const pick = <T>(items: readonly T[]): T => {
    if (items.length === 0) {
      throw new Error('Impossible de tirer un element dans une liste vide.');
    }

    // `int` reste dans les bornes, donc l'index existe.
    return items[int(items.length)] as T;
  };

  const shuffle = <T>(items: readonly T[]): T[] => {
    // Melange de Fisher-Yates sur une copie : le moteur ne mute pas ses
    // entrees (`docs/09`).
    const copy = [...items];

    for (let index = copy.length - 1; index > 0; index -= 1) {
      const target = int(index + 1);
      const held = copy[index] as T;

      copy[index] = copy[target] as T;
      copy[target] = held;
    }

    return copy;
  };

  return { next, int, pick, shuffle };
}
