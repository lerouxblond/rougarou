/** Alphabet de Crockford, sans I, L, O ni U. */
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/**
 * Un ULID (`docs/04` §Durable Object) : 48 bits d'horodatage puis 80 bits
 * d'alea, encodes sur 26 caracteres. Les identifiants se trient dans l'ordre
 * de creation. Quelques lignes plutot qu'une dependance (`docs/05`).
 */
export function ulid(now = Date.now(), random: (bytes: Uint8Array) => void = fill): string {
  let time = '';
  let rest = now;

  for (let index = 0; index < 10; index += 1) {
    time = (ALPHABET[rest % 32] ?? '') + time;
    rest = Math.floor(rest / 32);
  }

  const bytes = new Uint8Array(16);

  random(bytes);

  return time + Array.from(bytes, (byte) => ALPHABET[byte % 32] ?? '').join('');
}

function fill(bytes: Uint8Array): void {
  crypto.getRandomValues(bytes);
}
