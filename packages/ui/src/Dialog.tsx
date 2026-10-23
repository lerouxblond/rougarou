import * as RadixDialog from '@radix-ui/react-dialog';
import type { ReactNode } from 'react';

export interface DialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly title: string;
  readonly description?: string;
  /** Nom du bouton de fermeture, pour les lecteurs d'ecran. */
  readonly closeLabel: string;
  readonly children: ReactNode;
  /** `sheet` : panneau qui monte du bas, sur telephone (`docs/06`). */
  readonly placement?: 'center' | 'sheet';
}

const PLACEMENT = {
  center:
    'left-1/2 top-1/2 w-[min(32rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-card',
  sheet: 'inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-card',
} as const;

/**
 * Une fenetre modale Radix : le focus y est pris et rendu, Echap la ferme,
 * le reste de la page est inerte pour les lecteurs d'ecran.
 */
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  closeLabel,
  children,
  placement = 'center',
}: DialogProps) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 bg-scrim" />
        <RadixDialog.Content
          // Sans description, Radix exige qu'on le dise explicitement.
          {...(description === undefined ? { 'aria-describedby': undefined } : {})}
          className={`fixed flex flex-col gap-4 border border-border bg-surface-raised p-6 text-text shadow-raised focus-visible:outline-2 focus-visible:outline-focus ${PLACEMENT[placement]}`}
        >
          <div className="flex items-start justify-between gap-4">
            <RadixDialog.Title className="font-display text-2xl">{title}</RadixDialog.Title>
            <RadixDialog.Close
              aria-label={closeLabel}
              className="inline-flex tap-target items-center justify-center rounded-pill text-text-muted hover:text-text focus-visible:outline-2 focus-visible:outline-focus"
            >
              <span aria-hidden="true">×</span>
            </RadixDialog.Close>
          </div>
          {description === undefined ? null : (
            <RadixDialog.Description className="text-text-muted">
              {description}
            </RadixDialog.Description>
          )}
          {children}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

/** Le meme dialogue, en panneau bas (`Sheet` de `docs/06`). */
export function Sheet(props: Omit<DialogProps, 'placement'>) {
  return <Dialog {...props} placement="sheet" />;
}
