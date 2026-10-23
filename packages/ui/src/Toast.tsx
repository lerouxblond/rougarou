import * as RadixToast from '@radix-ui/react-toast';
import type { ReactNode } from 'react';

/**
 * La zone des toasts, a poser une fois a la racine. Radix l'annonce aux
 * lecteurs d'ecran ; `label` nomme la region (« Notifications »).
 */
export function ToastRegion({
  label,
  children,
}: {
  readonly label: string;
  readonly children: ReactNode;
}) {
  return (
    <RadixToast.Provider label={label} duration={5000}>
      {children}
      <RadixToast.Viewport className="fixed right-4 bottom-4 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2 outline-none" />
    </RadixToast.Provider>
  );
}

export interface ToastProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly title: string;
  readonly description?: string;
  readonly tone?: 'neutral' | 'danger';
}

/** Un message bref, qui disparait seul au bout de 5 s. */
export function Toast({ open, onOpenChange, title, description, tone = 'neutral' }: ToastProps) {
  return (
    <RadixToast.Root
      open={open}
      onOpenChange={onOpenChange}
      className={`flex flex-col gap-1 rounded-md border bg-surface-raised p-4 text-text shadow-raised ${tone === 'danger' ? 'border-danger' : 'border-border'}`}
    >
      <RadixToast.Title className="font-medium">{title}</RadixToast.Title>
      {description === undefined ? null : (
        <RadixToast.Description className="text-sm text-text-muted">
          {description}
        </RadixToast.Description>
      )}
    </RadixToast.Root>
  );
}
