import { useId, type InputHTMLAttributes } from 'react';

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  readonly label: string;
  readonly hint?: string;
}

/** Un champ libelle ; l'aide eventuelle est reliee par `aria-describedby`. */
export function Field({ label, hint, ...input }: FieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm text-text">
        {label}
      </label>
      <input
        id={id}
        aria-describedby={hint === undefined ? undefined : hintId}
        className="min-h-11 rounded-card border border-border bg-surface px-3 text-text"
        {...input}
      />
      {hint === undefined ? null : (
        <p id={hintId} className="text-xs text-text-muted">
          {hint}
        </p>
      )}
    </div>
  );
}

/** Message d'erreur annonce aux lecteurs d'ecran. */
export function FormError({ message }: { readonly message: string | null }) {
  return message === null ? null : (
    <p role="alert" className="text-sm text-danger">
      {message}
    </p>
  );
}
