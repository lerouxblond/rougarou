import type { ReactNode } from 'react';

import { IconFrame } from './IconFrame.tsx';

/** Les roles qui ont une icone (`docs/07`) : ceux de M3 pour l'instant. */
export const ROLE_ICON_IDS = [
  'werewolf',
  'villager',
  'seer',
  'witch',
  'hunter',
  'cupid',
  'little-girl',
] as const;

export type RoleIconId = (typeof ROLE_ICON_IDS)[number];

/**
 * Les dessins, recopies de `packages/ui/icons/icon-role-<id>.svg`, qui restent
 * la source : un test verifie qu'ils sont identiques.
 */
const DRAWINGS: Record<RoleIconId, ReactNode> = {
  werewolf: (
    <>
      <path d="M5 3l3 5h8l3-5 1 9-3 5-5 4-5-4-3-5z" />
      <path d="M9 12.5l1.5.5M15 12.5l-1.5.5" />
      <path d="M10.5 17h3l-1.5 1.5z" />
    </>
  ),
  villager: (
    <>
      <path d="M12 2.5v2" />
      <path d="M8.5 7h7l-1-2.5h-5z" />
      <rect x="8" y="7" width="8" height="10" rx="1.5" />
      <path d="M12 10.5c1 1.2 1 2.5 0 3.5-1-1-1-2.3 0-3.5z" />
      <path d="M7 19.5h10" />
    </>
  ),
  seer: (
    <>
      <circle cx="12" cy="10" r="6.5" />
      <path d="M9 7.5a3.5 3.5 0 0 1 3-1.5" />
      <path d="M7.5 16.5 6 20h12l-1.5-3.5" />
      <path d="M4 20h16" />
      <path d="M19.5 2.5v2M18.5 3.5h2" />
      <path d="M3.5 5.5v1.5M2.75 6.25h1.5" />
    </>
  ),
  witch: (
    <>
      <path d="M10 3h4" />
      <path d="M10.5 3v4.2a6.5 6.5 0 1 0 3 0V3" />
      <path d="M6.5 15h11" />
      <circle cx="16.5" cy="4" r="1" />
      <circle cx="19" cy="7" r="0.75" />
    </>
  ),
  hunter: (
    <>
      <circle cx="12" cy="12" r="7" />
      <path d="M12 2.5v4M12 17.5v4M2.5 12h4M17.5 12h4" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
    </>
  ),
  cupid: (
    <>
      <path d="M12 19s-6.5-3.9-6.5-8.6A3.4 3.4 0 0 1 12 8.6a3.4 3.4 0 0 1 6.5 1.8C18.5 15.1 12 19 12 19z" />
      <path d="M3 21 21 3" />
      <path d="M17 3h4v4" />
      <path d="M3 17v4h4" />
    </>
  ),
  'little-girl': (
    <>
      <path d="M3 13c2.5-3 5.5-4.5 9-4.5s6.5 1.5 9 4.5" />
      <path d="M5.5 11.5c2 1.8 4.2 2.7 6.5 2.7s4.5-.9 6.5-2.7" />
      <circle cx="12" cy="12.2" r="1.6" />
      <path d="M7 8.5 6 6.5M12 7.5V5.5M17 8.5l1-2" />
      <path d="M9 21v-4.5M15 21v-4.5" />
    </>
  ),
};

/** L'icone d'un role, decorative : son nom est toujours ecrit a cote. */
export function RoleIcon({
  role,
  className,
}: {
  readonly role: RoleIconId;
  readonly className?: string;
}) {
  return <IconFrame className={className}>{DRAWINGS[role]}</IconFrame>;
}
