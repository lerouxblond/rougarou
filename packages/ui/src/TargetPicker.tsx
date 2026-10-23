import { useId, useState } from 'react';

import { Button } from './Button.tsx';

export interface TargetOption {
  readonly id: string;
  readonly label: string;
}

export interface TargetPickerProps {
  /** La question (« Qui voulez-vous sonder ? »). */
  readonly legend: string;
  /** Les seules cibles que le serveur autorise (regle 1 : le client ne filtre rien). */
  readonly options: readonly TargetOption[];
  /** Nombre de cibles a choisir : 1, ou 2 pour Cupidon. */
  readonly count?: number;
  readonly confirmLabel: string;
  readonly onConfirm: (ids: string[]) => void;
  readonly busy?: boolean;
}

/**
 * Choisir une ou plusieurs cibles, puis confirmer (`docs/06`). Ce sont de
 * vrais boutons radio (ou cases, pour plusieurs cibles), dans un `fieldset` :
 * le clavier et les lecteurs d'ecran les connaissent deja.
 */
export function TargetPicker({
  legend,
  options,
  count = 1,
  confirmLabel,
  onConfirm,
  busy = false,
}: TargetPickerProps) {
  const name = useId();
  const [chosen, setChosen] = useState<string[]>([]);
  const single = count === 1;

  const toggle = (id: string) => {
    setChosen((current) => {
      if (single) {
        return [id];
      }

      return current.includes(id)
        ? current.filter((other) => other !== id)
        : [...current, id].slice(-count);
    });
  };

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        onConfirm(chosen);
      }}
    >
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-display text-xl text-text">{legend}</legend>
        <div className="grid grid-cols-2 gap-2">
          {options.map((option) => (
            <label key={option.id} className="relative">
              <input
                type={single ? 'radio' : 'checkbox'}
                name={name}
                value={option.id}
                checked={chosen.includes(option.id)}
                onChange={() => {
                  toggle(option.id);
                }}
                className="peer sr-only"
              />
              <span className="flex tap-target cursor-pointer items-center rounded-md border border-border bg-surface px-3 text-text peer-checked:border-accent peer-checked:text-accent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus">
                {option.label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <Button type="submit" loading={busy} disabled={chosen.length !== count}>
        {confirmLabel}
      </Button>
    </form>
  );
}
