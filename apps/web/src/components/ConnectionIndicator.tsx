import { useTranslation } from 'react-i18next';

import type { ConnectionStatus } from '../game/socket.ts';

/** La pastille ne fait qu'appuyer le texte : le sens ne repose jamais sur la couleur seule. */
const DOT: Record<ConnectionStatus, string> = {
  open: 'bg-accent',
  connecting: 'border border-border',
  reconnecting: 'border border-border',
  closed: 'bg-danger',
};

/**
 * Indicateur de connexion (US-90). Il s'annonce aux lecteurs d'ecran par une
 * region `status`, sans voler le focus.
 */
export function ConnectionIndicator({ status }: { status: ConnectionStatus }) {
  const { t } = useTranslation();

  return (
    <p role="status" className="flex items-center gap-2 text-sm text-text-muted">
      <span aria-hidden="true" className={`size-2 rounded-pill ${DOT[status]}`} />
      {t(`connection.${status}`)}
    </p>
  );
}
