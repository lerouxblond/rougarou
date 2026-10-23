import type { CSSProperties, ReactNode } from 'react';

export interface CircleItem {
  readonly id: string;
  readonly node: ReactNode;
}

/**
 * Les joueurs dans l'ordre des places (`docs/06`) : en cercle a partir de
 * 640 px, en grille en dessous. Le premier siege est en haut, puis on tourne
 * dans le sens des aiguilles d'une montre. Le lecteur d'ecran lit une simple
 * liste, dans l'ordre des places.
 */
export function PlayerCircle({
  label,
  items,
}: {
  /** Nom de la liste (« Joueurs »). */
  readonly label: string;
  readonly items: readonly CircleItem[];
}) {
  return (
    <ul
      aria-label={label}
      className="grid grid-cols-2 gap-2 sm:relative sm:block sm:aspect-square sm:w-full sm:max-w-xl"
    >
      {items.map((item, index) => (
        <li
          key={item.id}
          // La position dans le cercle est calculee : seul cas ou `style` est permis (`docs/09`).
          style={seatPosition(index, items.length)}
          className="rounded-md border border-border bg-surface p-2 sm:absolute sm:top-[var(--seat-y)] sm:left-[var(--seat-x)] sm:w-40 sm:-translate-x-1/2 sm:-translate-y-1/2"
        >
          {item.node}
        </li>
      ))}
    </ul>
  );
}

/** Coordonnees d'un siege, en pourcentage du cercle (rayon de 40 %). */
function seatPosition(index: number, count: number): CSSProperties {
  const angle = (2 * Math.PI * index) / Math.max(count, 1) - Math.PI / 2;

  return {
    '--seat-x': `${(50 + 40 * Math.cos(angle)).toFixed(2)}%`,
    '--seat-y': `${(50 + 40 * Math.sin(angle)).toFixed(2)}%`,
  } as CSSProperties;
}
