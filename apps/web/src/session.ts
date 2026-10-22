import type { MeResponse } from '@rougarou/protocol';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from './api.ts';

const ME = ['me'] as const;

/** Le profil connecte, ou `null` sans session (TanStack Query, `docs/04`). */
export function useMe() {
  return useQuery<MeResponse | null>({ queryKey: ME, queryFn: () => api.meOrNull() });
}

/** Relit le profil apres une connexion ou une deconnexion. */
export function useRefreshMe(): () => Promise<void> {
  const client = useQueryClient();

  return () => client.invalidateQueries({ queryKey: ME });
}
