import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'md' | 'lg';

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  /**
   * `button` par defaut, pour qu'un bouton pose dans un formulaire ne
   * l'envoie jamais par accident ; `submit` pour le bouton d'envoi.
   */
  type?: 'button' | 'submit';
  /** Variante visuelle (`docs/06`). */
  variant?: ButtonVariant;
  /** `lg` par defaut sur mobile pour les actions de jeu (`docs/06`). */
  size?: ButtonSize;
  /** Affiche l'etat occupe et desactive le bouton. */
  loading?: boolean;
  /** Le libelle vient toujours d'i18n (`CLAUDE.md` regle 6). */
  children: ReactNode;
}

/**
 * Les boutons principaux de la direction « Lanterne » sont des pilules dorees :
 * un ecran, une intention, une seule action principale (`docs/06`).
 */
const BASE_CLASSES = [
  'inline-flex items-center justify-center gap-2',
  'rounded-pill font-body font-medium',
  // Zone tactile de 44 px minimum, sur les deux axes (docs/06).
  'tap-target',
  'transition-[background-color,color,opacity,filter] duration-fast ease-lantern',
  // L'anneau de focus est toujours visible au clavier (CLAUDE.md regle 9).
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
  'disabled:cursor-not-allowed disabled:opacity-50',
].join(' ');

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-on-accent hover:brightness-110 active:brightness-95',
  secondary: 'border border-border bg-surface-raised text-text hover:bg-surface',
  ghost: 'bg-transparent text-text-muted hover:bg-surface hover:text-text',
  danger: 'bg-danger text-on-accent hover:brightness-110 active:brightness-95',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg',
};

export function Button({
  type = 'button',
  variant = 'primary',
  size = 'lg',
  loading = false,
  disabled = false,
  className,
  children,
  ...rest
}: ButtonProps) {
  const classes = [BASE_CLASSES, VARIANT_CLASSES[variant], SIZE_CLASSES[size], className]
    .filter((value) => value !== undefined && value !== '')
    .join(' ');

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading}
      {...rest}
    >
      {children}
    </button>
  );
}
