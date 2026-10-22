import type { ReactNode } from 'react';

/**
 * Le cadre commun des icones maison (`docs/07`) : grille de 24 px, trait de
 * 1,75 px, couleur heritee du texte. Une icone est decorative : son sens est
 * toujours porte par un libelle a cote (`docs/06`).
 */
export function IconFrame({
  className,
  children,
}: {
  readonly className?: string | undefined;
  readonly children: ReactNode;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  );
}
