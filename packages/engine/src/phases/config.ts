import type { Composition, GameOptions, RoleId } from '@rougarou/protocol';

import { findMode, getMode } from '../modes/index.ts';
import { findRole } from '../roles/index.ts';
import type { EngineError } from '../result.ts';
import { createRng } from '../rng.ts';
import type { GameState } from '../state.ts';
import { engineError, startTimer, type Tx } from '../tx.ts';
import { passCeremonyTurn } from './deal.ts';

/** Plus grande graine tiree pour la distribution (entier positif sur 31 bits). */
const MAX_SEED = 0x7f_ff_ff_ff;

/**
 * Options prevues par le schema mais pas encore prises en charge (`R-15`) :
 * on les refuse plutot que de les ignorer en silence.
 */
function unsupportedOption(options: GameOptions): string | null {
  if (findMode(options.gameMode) === undefined) {
    return 'errors.options.mode_unavailable';
  }

  if (options.roleplay) {
    return 'errors.options.roleplay_unavailable';
  }

  if (options.parallelNight) {
    return 'errors.options.parallel_night_unavailable';
  }

  return null;
}

export function setOptions(tx: Tx, options: GameOptions): EngineError | null {
  if (tx.state.phase !== 'CONFIG') {
    return engineError('WRONG_PHASE');
  }

  const unsupported = unsupportedOption(options);

  if (unsupported !== null) {
    return engineError('UNSUPPORTED_OPTION', unsupported);
  }

  tx.emit({ type: 'OptionsSet', options });
  return null;
}

export function setComposition(tx: Tx, composition: Composition): EngineError | null {
  if (tx.state.phase !== 'CONFIG') {
    return engineError('WRONG_PHASE');
  }

  tx.emit({ type: 'CompositionSet', composition });
  return null;
}

/**
 * Les problemes de la configuration actuelle, communs puis propres au mode
 * (`R-07`). Vide quand on peut distribuer. L'ecran de configuration s'en sert
 * aussi pour expliquer pourquoi « Distribuer » est grise.
 */
export function compositionIssues(state: GameState): string[] {
  const mode = getMode(state.options.gameMode);
  const entries = Object.entries(state.composition) as [RoleId, number][];
  const issues: string[] = [];

  for (const [roleId, count] of entries) {
    const role = findRole(roleId);

    if (role === undefined) {
      issues.push('errors.composition.role_unavailable');
    } else if (mode.allowedRoles !== 'all' && !mode.allowedRoles.includes(roleId)) {
      issues.push('errors.composition.role_not_allowed');
    } else if (role.unique && count > 1) {
      issues.push('errors.composition.duplicate_unique');
    }
  }

  const total = entries.reduce((sum, [, count]) => sum + count, 0);

  if (total !== state.seats.length) {
    issues.push('errors.composition.count_mismatch');
  }

  const modeIssues = mode
    .validateComposition(state.composition, state.seats.length)
    .map((issue) => issue.messageKey);

  return [...new Set([...issues, ...modeIssues])];
}

/** Associe deux listes de meme longueur, element par element. */
function zip<A, B>(left: readonly A[], right: readonly B[]): [A, B][] {
  if (left.length !== right.length) {
    throw new Error(`Listes de longueurs differentes : ${left.length} et ${right.length}`);
  }

  return left.map((item, index) => [item, right[index] as B]);
}

/**
 * « Distribuer » : les roles sont melanges avec une graine tiree maintenant
 * et rangee dans l'evenement, ce qui rend la partie rejouable (ADR 0002).
 */
export function deal(tx: Tx): EngineError | null {
  if (tx.state.phase !== 'CONFIG') {
    return engineError('WRONG_PHASE');
  }

  const [issue] = compositionIssues(tx.state);

  if (issue !== undefined) {
    return engineError('INVALID_COMPOSITION', issue);
  }

  const seed = tx.ctx.rng.int(MAX_SEED);
  const deck = (Object.entries(tx.state.composition) as [RoleId, number][]).flatMap(
    ([role, count]) => Array.from({ length: count }, () => role),
  );
  const shuffled = createRng(seed).shuffle(deck);
  const assignments = Object.fromEntries(zip(tx.state.seats, shuffled));

  tx.emit({ type: 'RolesDealt', seed, assignments });
  tx.emit({ type: 'PhaseChanged', phase: 'DEAL' });

  if (tx.state.options.dealMode === 'ceremony') {
    passCeremonyTurn(tx, 0);
  } else {
    startTimer(tx, 'roleReveal');
  }

  return null;
}
