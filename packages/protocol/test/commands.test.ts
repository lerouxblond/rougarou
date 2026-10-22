import { describe, expect, it } from 'vitest';

import {
  commandEnvelopeSchema,
  commandSchema,
  compositionSchema,
  playerIdSchema,
} from '../src/index.ts';

describe('commandSchema', () => {
  it.each([
    { type: 'JoinGame', name: 'Alice' },
    { type: 'LeaveGame' },
    { type: 'KickPlayer', playerId: 'p1' },
    { type: 'ReorderSeats', order: ['p2', 'p1'] },
    { type: 'SetOptions', options: { mayor: false } },
    { type: 'SetComposition', composition: { werewolf: 1, villager: 4 } },
    { type: 'Deal' },
    { type: 'ConfirmRoleSeen' },
    { type: 'AdvancePhase', force: true },
    { type: 'Undo' },
    { type: 'SubmitNightAction', action: { kind: 'wolfVote', target: 'p3' } },
    { type: 'ResolveWolfTie', target: 'p3' },
    { type: 'DeclareCandidacy' },
    { type: 'WithdrawCandidacy' },
    { type: 'DesignateSuccessor', playerId: 'p2' },
    { type: 'CastVote', ballot: { kind: 'player', playerId: 'p2' } },
    { type: 'CastVote', ballot: { kind: 'spare' } },
    { type: 'CastVote', ballot: { kind: 'abstain' } },
    { type: 'BreakTie', playerId: 'p2' },
    { type: 'Timeout' },
  ])('accepte $type', (command) => {
    expect(commandSchema.safeParse(command).success).toBe(true);
  });

  it('refuse un type inconnu', () => {
    expect(commandSchema.safeParse({ type: 'KillEveryone' }).success).toBe(false);
  });

  it('refuse un champ en trop', () => {
    expect(commandSchema.safeParse({ type: 'Deal', seed: 42 }).success).toBe(false);
  });

  it('AdvancePhase ne force pas par defaut', () => {
    expect(commandSchema.parse({ type: 'AdvancePhase' })).toEqual({
      type: 'AdvancePhase',
      force: false,
    });
  });

  it('SetOptions complete les options avec les valeurs par defaut', () => {
    const command = commandSchema.parse({ type: 'SetOptions', options: {} });

    expect(command.type === 'SetOptions' && command.options.tieBreak).toBe('mayor');
  });

  it('refuse un pseudo vide ou trop long', () => {
    expect(commandSchema.safeParse({ type: 'JoinGame', name: '   ' }).success).toBe(false);
    expect(commandSchema.safeParse({ type: 'JoinGame', name: 'x'.repeat(31) }).success).toBe(false);
  });

  it('refuse une action de nuit inconnue', () => {
    const command = { type: 'SubmitNightAction', action: { kind: 'eatEveryone' } };

    expect(commandSchema.safeParse(command).success).toBe(false);
  });
});

describe('commandEnvelopeSchema', () => {
  it('accepte les trois sortes d acteurs', () => {
    for (const actor of [
      { kind: 'narrator' },
      { kind: 'player', playerId: 'p1' },
      { kind: 'system' },
    ]) {
      expect(commandEnvelopeSchema.safeParse({ actor, cmd: { type: 'Undo' } }).success).toBe(true);
    }
  });

  it('refuse un acteur joueur sans identifiant', () => {
    const envelope = { actor: { kind: 'player' }, cmd: { type: 'Undo' } };

    expect(commandEnvelopeSchema.safeParse(envelope).success).toBe(false);
  });
});

describe('playerIdSchema', () => {
  it('refuse le prefixe @, reserve aux choix qui ne sont pas des joueurs', () => {
    expect(playerIdSchema.safeParse('@spare').success).toBe(false);
    expect(playerIdSchema.safeParse('alice@example').success).toBe(true);
  });
});

describe('compositionSchema', () => {
  it('refuse un role inconnu et un nombre nul', () => {
    expect(compositionSchema.safeParse({ dragon: 1 }).success).toBe(false);
    expect(compositionSchema.safeParse({ werewolf: 0 }).success).toBe(false);
  });
});
