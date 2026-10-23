import type { ButtonHTMLAttributes, ReactNode } from 'react';

export interface IconButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'type' | 'aria-label' | 'children'
> {
  /**
   * Nom du bouton pour les lecteurs d'ecran, obligatoire : l'icone seule ne
   * dit rien (`docs/06`). Il vient d'i18n (`CLAUDE.md` regle 6).
   */
  label: string;
  /** L'icone, decorative : elle est cachee aux lecteurs d'ecran. */
  children: ReactNode;
  variant?: 'ghost' | 'secondary';
}

const VARIANT_CLASSES = {
  ghost: 'bg-transparent text-text-muted hover:bg-surface hover:text-text',
  secondary: 'border border-border bg-surface-raised text-text hover:bg-surface',
} as const;

/** Un bouton fait d'une icone, avec une zone tactile de 44 px. */
export function IconButton({
  label,
  children,
  variant = 'ghost',
  className,
  ...rest
}: IconButtonProps) {
  const classes = [
    'inline-flex items-center justify-center rounded-pill tap-target',
    'transition-colors duration-fast ease-lantern',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
    'disabled:cursor-not-allowed disabled:opacity-50',
    VARIANT_CLASSES[variant],
    className,
  ]
    .filter((value) => value !== undefined && value !== '')
    .join(' ');

  return (
    <button type="button" aria-label={label} title={label} className={classes} {...rest}>
      <span aria-hidden="true" className="inline-flex">
        {children}
      </span>
    </button>
  );
}
