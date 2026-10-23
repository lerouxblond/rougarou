import { useTranslation } from 'react-i18next';
import { encode } from 'uqr';

/**
 * Le code de la partie, son lien et son QR (US-10, US-11) : les joueurs le
 * scannent pour arriver sur `/join/:code`. Le QR est dessine a partir de la
 * matrice d'`uqr`, sans HTML injecte, toujours sombre sur clair : certains
 * lecteurs de QR ne lisent pas un code inverse.
 */
export function JoinCard({ code }: { readonly code: string }) {
  const { t } = useTranslation();
  const link = `${window.location.origin}/join/${code}`;
  const { data, size } = encode(link, { ecc: 'M', border: 2 });

  return (
    <section className="flex flex-wrap items-center gap-6 rounded-card border border-border bg-surface p-4">
      <svg
        role="img"
        aria-label={t('lobby.qr', { code })}
        viewBox={`0 0 ${String(size)} ${String(size)}`}
        className="size-36 shrink-0 rounded-md bg-text text-[var(--color-bg)] in-data-[phase=day]:bg-surface-raised in-data-[phase=day]:text-text"
        shapeRendering="crispEdges"
      >
        {data.flatMap((row, y) =>
          row.map((dark, x) =>
            dark ? (
              <rect
                key={`${String(x)}-${String(y)}`}
                x={x}
                y={y}
                width="1"
                height="1"
                fill="currentColor"
              />
            ) : null,
          ),
        )}
      </svg>
      <div className="flex flex-col gap-2">
        <p className="text-text-muted">{t('lobby.invite')}</p>
        <p data-testid="game-code" className="font-pixel text-3xl tracking-[0.3em] text-accent">
          {code}
        </p>
        <a className="break-all text-sm text-text underline" href={link}>
          {link}
        </a>
      </div>
    </section>
  );
}
