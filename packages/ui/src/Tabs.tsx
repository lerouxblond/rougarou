import * as RadixTabs from '@radix-ui/react-tabs';
import type { ReactNode } from 'react';

export interface TabItem {
  readonly value: string;
  readonly label: string;
  readonly content: ReactNode;
}

/**
 * Des onglets Radix (fleches du clavier, `aria-selected`). Le meneur sur
 * telephone y range ses colonnes : Script, Etapes, Joueurs, Journal (`docs/06`).
 */
export function Tabs({
  label,
  items,
  value,
  onValueChange,
}: {
  /** Nom de la liste d'onglets, pour les lecteurs d'ecran. */
  readonly label: string;
  readonly items: readonly TabItem[];
  readonly value?: string;
  readonly onValueChange?: (value: string) => void;
}) {
  const selection = value === undefined ? { defaultValue: items[0]?.value } : { value };

  return (
    <RadixTabs.Root {...selection} onValueChange={onValueChange} className="flex flex-col gap-4">
      <RadixTabs.List aria-label={label} className="flex gap-1 border-b border-border">
        {items.map((item) => (
          <RadixTabs.Trigger
            key={item.value}
            value={item.value}
            className="tap-target border-b-2 border-transparent px-3 font-pixel text-xs tracking-wider text-text-muted uppercase focus-visible:outline-2 focus-visible:outline-focus data-[state=active]:border-accent data-[state=active]:text-text"
          >
            {item.label}
          </RadixTabs.Trigger>
        ))}
      </RadixTabs.List>
      {items.map((item) => (
        <RadixTabs.Content
          key={item.value}
          value={item.value}
          className="focus-visible:outline-2 focus-visible:outline-focus"
        >
          {item.content}
        </RadixTabs.Content>
      ))}
    </RadixTabs.Root>
  );
}
