import type { ReactNode } from 'react';

import { IconFrame } from './IconFrame.tsx';

/** Les camps qui ont une icone (`docs/07`) : Village et Loups en M3. */
export const TEAM_ICON_IDS = ['village', 'wolves'] as const;

export type TeamIconId = (typeof TEAM_ICON_IDS)[number];

/** Recopies de `packages/ui/icons/icon-team-<id>.svg`, verifiees par un test. */
const DRAWINGS: Record<TeamIconId, ReactNode> = {
  village: (
    <>
      <path d="M4 11 12 4l8 7" />
      <path d="M6 9.5V20h12V9.5" />
      <path d="M10 20v-5h4v5" />
    </>
  ),
  wolves: (
    <>
      <path d="M12 12c2.8 0 5 2.4 5 4.6 0 1.8-1.6 2.9-3 2.4-1.2-.4-2.8-.4-4 0-1.4.5-3-.6-3-2.4C7 14.4 9.2 12 12 12z" />
      <ellipse cx="6" cy="9.5" rx="1.5" ry="2" />
      <ellipse cx="9.5" cy="5.5" rx="1.5" ry="2" />
      <ellipse cx="14.5" cy="5.5" rx="1.5" ry="2" />
      <ellipse cx="18" cy="9.5" rx="1.5" ry="2" />
    </>
  ),
};

/** L'icone d'un camp : jamais seule, toujours avec son libelle (`docs/06`). */
export function TeamIcon({
  team,
  className,
}: {
  readonly team: TeamIconId;
  readonly className?: string;
}) {
  return <IconFrame className={className}>{DRAWINGS[team]}</IconFrame>;
}
