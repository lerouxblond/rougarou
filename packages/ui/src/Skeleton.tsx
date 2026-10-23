/**
 * Un bloc en attente de contenu. Il est cache aux lecteurs d'ecran (l'ecran
 * annonce le chargement autrement) et ne pulse pas en mouvement reduit.
 */
export function Skeleton({ className = 'h-4 w-full' }: { readonly className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`block rounded-md bg-surface-raised motion-safe:animate-pulse ${className}`}
    />
  );
}
