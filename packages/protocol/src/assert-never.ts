/**
 * Marque une branche inatteignable dans un `switch` sur une union.
 *
 * `docs/09` impose un `switch` exhaustif avec `assertNever(x)` dans le
 * `default` : si l'union gagne un membre, la compilation echoue ici.
 *
 * Ce n'est pas une erreur metier mais un invariant viole, donc on leve
 * (`docs/09` : les erreurs metier du moteur sont renvoyees, jamais levees).
 */
export function assertNever(value: never): never {
  throw new Error(`Cas non gere : ${JSON.stringify(value)}`);
}
