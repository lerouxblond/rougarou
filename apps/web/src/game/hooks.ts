import type { CommandInput, NarratorView, PlayerView } from '@rougarou/protocol';
import { useCallback, useEffect, useState } from 'react';

import { joinRoom, leaveRoom, sendCommand, useGameStore, type CommandReply } from './store.ts';

/** Ouvre la connexion a la partie le temps que le composant est monte. */
export function useGameConnection(gameId: string): void {
  useEffect(() => {
    joinRoom(gameId);
    return leaveRoom;
  }, [gameId]);
}

/** La vue projetee recue du serveur (`docs/09` §React). */
export function useGameView(): PlayerView | NarratorView | null {
  return useGameStore((store) => store.view);
}

/**
 * Envoie une commande. `busy` reste vrai jusqu'a la reponse, et `error` garde
 * la cle i18n du dernier refus.
 */
export function useSendCommand() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = useCallback(async (cmd: CommandInput): Promise<CommandReply> => {
    setBusy(true);
    const reply = await sendCommand(cmd);

    setBusy(false);
    setError(reply.ok ? null : reply.messageKey);
    return reply;
  }, []);

  return { send, busy, error };
}
