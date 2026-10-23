const SIZES = { sm: 'size-8 text-xs', md: 'size-11 text-sm', lg: 'size-16 text-lg' } as const;

/**
 * Les initiales d'un joueur, en attendant les portraits (M4b). Le pseudo est
 * toujours ecrit a cote : l'avatar est decoratif.
 */
export function Avatar({
  name,
  size = 'md',
}: {
  readonly name: string;
  readonly size?: keyof typeof SIZES;
}) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');

  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-pill border border-border bg-surface-raised font-pixel text-text ${SIZES[size]}`}
    >
      {initials}
    </span>
  );
}
