import * as RadixSwitch from '@radix-ui/react-switch';
import { useId } from 'react';

export interface SwitchProps {
  label: string;
  /** Aide courte sous le libelle (`docs/03`, US-21). */
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}

/** Un interrupteur Radix, avec son libelle et son aide relies pour les lecteurs d'ecran. */
export function Switch({ label, description, checked, onCheckedChange, disabled }: SwitchProps) {
  const id = useId();
  const helpId = `${id}-help`;

  return (
    <div className="flex items-start justify-between gap-4">
      <span className="flex flex-col">
        <label htmlFor={id} className="text-text">
          {label}
        </label>
        {description === undefined ? null : (
          <span id={helpId} className="text-sm text-text-muted">
            {description}
          </span>
        )}
      </span>
      <RadixSwitch.Root
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        aria-describedby={description === undefined ? undefined : helpId}
        className="relative inline-flex h-7 w-12 shrink-0 items-center rounded-pill border border-border bg-surface-raised transition-colors duration-fast ease-lantern focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-50 data-[state=checked]:bg-accent"
      >
        <RadixSwitch.Thumb className="block size-5 translate-x-1 rounded-pill bg-text transition-transform duration-fast ease-lantern data-[state=checked]:translate-x-6 data-[state=checked]:bg-on-accent" />
      </RadixSwitch.Root>
    </div>
  );
}
