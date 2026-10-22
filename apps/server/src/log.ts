/**
 * Un log structure pour Workers Logs (`docs/04` §Observabilite). Il porte
 * `gameId`, `seq` et `cmd`, jamais de donnee personnelle ni de role cache.
 */
export interface LogEntry {
  readonly message: string;
  readonly gameId?: string;
  readonly seq?: number;
  readonly cmd?: string;
}

export function log(entry: LogEntry): void {
  // eslint-disable-next-line no-console -- seul point de sortie des logs d'information
  console.log(JSON.stringify(entry));
}
