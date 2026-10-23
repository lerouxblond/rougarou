import type { ReactNode } from 'react';

/** Un ecran ou une liste sans contenu : une phrase, et l'action qui en sort. */
export function EmptyState({
  title,
  children,
  action,
}: {
  readonly title: string;
  readonly children?: ReactNode;
  readonly action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-border p-8 text-center">
      <p className="font-display text-xl text-text">{title}</p>
      {children === undefined ? null : <div className="text-text-muted">{children}</div>}
      {action}
    </div>
  );
}
