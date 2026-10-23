import type { ReactNode } from 'react';

import { Avatar } from './Avatar.tsx';
import { Badge } from './Badge.tsx';

export interface PlayerChipProps {
  readonly name: string;
  /** Mort : le libelle est ecrit, pas seulement suggere par la couleur (`docs/06`). */
  readonly deadLabel?: string;
  /** Deconnecte (vu du meneur, `R-61`). */
  readonly disconnectedLabel?: string;
  /** Badges : Maire, amoureux, role connu… */
  readonly badges?: ReactNode;
  /** Une ligne de detail sous le pseudo (le role, chez le meneur). */
  readonly detail?: ReactNode;
}

/** Un joueur : avatar, pseudo, etat et badges (`docs/06`). */
export function PlayerChip({
  name,
  deadLabel,
  disconnectedLabel,
  badges,
  detail,
}: PlayerChipProps) {
  const dead = deadLabel !== undefined;

  return (
    <span className={`flex items-center gap-2 ${dead ? 'opacity-70' : ''}`}>
      <Avatar name={name} size="sm" />
      <span className="flex min-w-0 flex-col">
        <span className={`truncate text-text ${dead ? 'line-through' : ''}`}>{name}</span>
        {detail === undefined ? null : (
          <span className="truncate text-sm text-text-muted">{detail}</span>
        )}
      </span>
      <span className="flex flex-wrap gap-1">
        {dead ? <Badge tone="danger">{deadLabel}</Badge> : null}
        {disconnectedLabel === undefined ? null : <Badge>{disconnectedLabel}</Badge>}
        {badges}
      </span>
    </span>
  );
}
