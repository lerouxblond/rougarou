/** Ce dont on a besoin d'un evenement d'envoi de formulaire. */
export interface SubmitLike {
  preventDefault(): void;
  readonly currentTarget: HTMLFormElement;
}

/**
 * Empeche l'envoi natif et renvoie un lecteur des champs texte du
 * formulaire. Un champ absent vaut `''`.
 */
export function submitted(event: SubmitLike): (name: string) => string {
  event.preventDefault();
  const data = new FormData(event.currentTarget);

  return (name) => {
    const value = data.get(name);

    return typeof value === 'string' ? value : '';
  };
}
