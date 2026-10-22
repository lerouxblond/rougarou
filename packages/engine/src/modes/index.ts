import type { ModeId } from '@rougarou/protocol';

import { classic } from './classic.ts';
import type { GameModeDefinition } from './types.ts';

/** Registre des modes implementes (`docs/11`). Les autres arrivent en M7. */
const MODES: ReadonlyMap<ModeId, GameModeDefinition> = new Map([[classic.id, classic]]);

/** La definition d'un mode, ou `undefined` s'il n'est pas encore implemente. */
export function findMode(id: ModeId): GameModeDefinition | undefined {
  return MODES.get(id);
}

/** La definition d'un mode configure. Un mode configure absent du registre est un bug. */
export function getMode(id: ModeId): GameModeDefinition {
  const mode = MODES.get(id);

  if (mode === undefined) {
    throw new Error(`Mode absent du registre : ${id}`);
  }

  return mode;
}

export type { GameModeDefinition, ValidationIssue, WinCondition } from './types.ts';
