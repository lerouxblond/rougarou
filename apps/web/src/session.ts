import type { MeResponse } from '@rougarou/protocol';
import { type QueryClient, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from './api.ts';

const ME = ['me'] as const;

// Une minute de fraicheur : la page qui se monte reprend le profil demande au
// demarrage au lieu de le redemander aussitot. Connexion et deconnexion
// l'invalident de toute facon (`useRefreshMe`).
const meQuery = { queryKey: ME, queryFn: () => api.meOrNull(), staleTime: 60_000 };

/** Le profil connecte, ou `null` sans session (TanStack Query, `docs/04`). */
export function useMe() {
  return useQuery<MeResponse | null>(meQuery);
}

/**
 * Toutes les pages attendent la session : on la demande au demarrage, en
 * parallele des morceaux de la route, plutot qu'apres leur chargement (P30).
 */
export function prefetchMe(client: QueryClient): void {
  // Une erreur reapparaitra dans `useMe`, qui relance la requete.
  client.query(meQuery).catch(() => undefined);
}

/** Relit le profil apres une connexion ou une deconnexion. */
export function useRefreshMe(): () => Promise<void> {
  const client = useQueryClient();

  return () => client.invalidateQueries({ queryKey: ME });
}
