import { useId } from 'react';

import { RoleIcon, type RoleIconId } from './RoleIcon.tsx';
import { TeamIcon, type TeamIconId } from './TeamIcon.tsx';

/** L'accent de chaque camp, par son token (`docs/06`). */
const TEAM_CLASSES: Record<TeamIconId, string> = {
  village: 'text-team-village',
  wolves: 'text-team-wolves',
};

export interface RoleCardArtProps {
  readonly role: RoleIconId;
  readonly team: TeamIconId;
  /** Nom du role, deja traduit : c'est le nom accessible de la carte. */
  readonly name: string;
  /** Nom du camp, deja traduit : un camp n'est jamais dit par la couleur seule. */
  readonly teamLabel: string;
  readonly className?: string;
}

/**
 * La carte de role de repli (`docs/07`), en attendant les sprites : format
 * 3:4, fond nocturne texture en SVG, accent du camp, icone du role au centre
 * et nom en police d'affichage. Les couleurs viennent des tokens, donc la
 * carte suit le theme de nuit comme celui de jour.
 */
export function RoleCardArt({ role, team, name, teamLabel, className }: RoleCardArtProps) {
  const pattern = useId();
  const title = useId();

  return (
    <figure
      aria-labelledby={title}
      className={[
        'relative flex aspect-[3/4] w-full max-w-60 flex-col items-center justify-between overflow-hidden',
        'rounded-card border border-border bg-surface-raised p-4',
        TEAM_CLASSES[team],
        className,
      ]
        .filter((value) => value !== undefined && value !== '')
        .join(' ')}
    >
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 120 160"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <pattern id={pattern} width="16" height="16" patternUnits="userSpaceOnUse">
            <circle cx="3" cy="4" r="0.6" fill="currentColor" opacity="0.35" />
            <circle cx="11" cy="12" r="0.4" fill="currentColor" opacity="0.25" />
          </pattern>
        </defs>
        <rect width="120" height="160" fill={`url(#${pattern})`} />
        <rect
          x="6"
          y="6"
          width="108"
          height="148"
          rx="10"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.6"
        />
        <rect
          x="10"
          y="10"
          width="100"
          height="140"
          rx="7"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.5"
          opacity="0.35"
        />
        <path d="M92 22a10 10 0 1 1-9-11 8 8 0 0 0 9 11z" fill="currentColor" opacity="0.5" />
      </svg>
      <span className="relative mt-8 flex flex-1 items-center">
        <RoleIcon role={role} className="h-20 w-20" />
      </span>
      <figcaption className="relative flex flex-col items-center gap-1 text-center">
        <span id={title} className="font-display text-2xl text-text">
          {name}
        </span>
        <span className="flex items-center gap-1 text-sm">
          <TeamIcon team={team} className="h-4 w-4" />
          {teamLabel}
        </span>
      </figcaption>
    </figure>
  );
}
