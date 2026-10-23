export interface NarratorScriptProps {
  /** Nom de la zone (« Texte a lire »). */
  readonly label: string;
  /** Le texte a lire maintenant, en grand (US-41). */
  readonly current: string;
  readonly previous?: string;
  readonly next?: string;
  /** Intitules des textes voisins (« Avant », « Ensuite »). */
  readonly previousLabel: string;
  readonly nextLabel: string;
}

/**
 * Le texte que le meneur lit a voix haute (US-41), avec celui d'avant et
 * celui d'apres, plus discrets. Le meneur le lit lui-meme : pas de synthese
 * vocale en V1 (D-22).
 */
export function NarratorScript({
  label,
  current,
  previous,
  next,
  previousLabel,
  nextLabel,
}: NarratorScriptProps) {
  return (
    <section aria-label={label} className="flex flex-col gap-4">
      {previous === undefined ? null : (
        <p className="text-sm text-text-muted">
          <span className="font-pixel text-xs uppercase">{previousLabel} · </span>
          {previous}
        </p>
      )}
      <p aria-live="polite" className="font-display text-3xl leading-snug text-text sm:text-4xl">
        {current}
      </p>
      {next === undefined ? null : (
        <p className="text-sm text-text-muted">
          <span className="font-pixel text-xs uppercase">{nextLabel} · </span>
          {next}
        </p>
      )}
    </section>
  );
}
