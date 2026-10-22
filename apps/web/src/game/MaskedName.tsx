import { useTranslation } from 'react-i18next';

/**
 * Un pseudo partiellement devoile (`docs/02`, Petite fille) : une case par
 * caractere. Le lecteur d'ecran entend chaque case, lettre ou « cachee ».
 */
export function MaskedName({ mask }: { readonly mask: readonly (string | null)[] }) {
  const { t } = useTranslation();
  const label = mask
    .map((cell) =>
      cell === null ? t('night.spy.hidden') : cell.trim() === '' ? t('night.spy.space') : cell,
    )
    .join(', ');

  return (
    <span role="img" aria-label={label} className="font-pixel tracking-widest">
      {mask.map((cell) => cell ?? '_').join(' ')}
    </span>
  );
}
