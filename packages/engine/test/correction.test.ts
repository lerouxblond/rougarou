import type { PlayerView } from '@rougarou/protocol';
import { describe, expect, it } from 'vitest';

import { projectView, REVEALING_EVENTS } from '../src/index.ts';
import { NARRATOR, player, setup, type GameDriver } from './dsl.ts';

const ROLES = {
  Alice: 'werewolf',
  Bob: 'hunter',
  Chloe: 'witch',
  David: 'villager',
  Eve: 'villager',
  Fanny: 'villager',
} as const;

/** Nuit 1 : les loups tuent Fanny, la Sorciere ne fait rien. On arrive au debat. */
function toDebate(): GameDriver {
  const game = setup({ roles: ROLES, options: { mayor: false } }).advance();

  game.wolfVote('Alice', 'Fanny').witch('Chloe').advance().advance();
  expect(game.state.phase).toBe('DAY_DEBATE');
  return game;
}

function viewOf(game: GameDriver, playerId: string): PlayerView {
  const view = projectView(game.state, { kind: 'player', playerId });

  if (view.kind !== 'player') {
    throw new Error('Vue de joueur attendue');
  }

  return view;
}

describe('R-18 : mode correction', () => {
  it('tuer un joueur : cause `correction`, journalisee', () => {
    const game = toDebate().narrator({ type: 'CorrectKill', playerId: 'Eve' });

    expect(game.state.players.Eve?.alive).toBe(false);
    expect(game.state.journal.at(-1)?.fact).toEqual({
      kind: 'playerKilled',
      playerId: 'Eve',
      cause: 'correction',
    });
  });

  it('tuer le Chasseur : il tire, et le meneur attend son tir pour ouvrir le vote', () => {
    const game = toDebate().narrator({ type: 'CorrectKill', playerId: 'Bob' });

    expect(game.state.pending).toEqual([{ kind: 'hunterShot', from: 'Bob' }]);
    game.rejects(NARRATOR, { type: 'AdvancePhase' }, 'PENDING_ACTIONS').shoot('Bob', 'Eve');
    expect(game.state.players.Eve?.alive).toBe(false);
    game.advance();
    expect(game.state.phase).toBe('DAY_VOTE');
  });

  it('tuer un amoureux : l autre meurt de chagrin', () => {
    const game = toDebate();

    game.replay({ type: 'LoversLinked', cupid: 'David', lovers: ['David', 'Eve'] });
    game.narrator({ type: 'CorrectKill', playerId: 'David' });
    expect(game.state.players.Eve?.alive).toBe(false);
  });

  it('tuer le dernier loup fait gagner le village', () => {
    const game = toDebate().narrator({ type: 'CorrectKill', playerId: 'Alice' });

    expect(game.state.phase).toBe('ENDED');
    expect(game.state.winner).toBe('village');
  });

  it('ressusciter un joueur, sans rien rejouer', () => {
    const game = toDebate();

    game.replay({ type: 'LoversLinked', cupid: 'David', lovers: ['David', 'Eve'] });
    game.narrator({ type: 'CorrectKill', playerId: 'David' });
    game.narrator({ type: 'CorrectRevive', playerId: 'David' });

    expect(game.state.players.David?.alive).toBe(true);
    // Son amoureux, mort de chagrin, reste mort.
    expect(game.state.players.Eve?.alive).toBe(false);
    expect(game.state.journal.at(-1)?.fact).toEqual({ kind: 'playerRevived', playerId: 'David' });
  });

  it('changer le role d un joueur : pouvoirs remis a neuf, info privee', () => {
    const game = setup({ roles: ROLES, options: { mayor: false } }).advance();

    game.wolfVote('Alice', 'Fanny').witch('Chloe', { kill: 'David' }).advance().advance();
    expect(game.state.potions.Chloe).toEqual({ life: true, death: false });

    game.narrator({ type: 'CorrectRole', playerId: 'Chloe', role: 'witch' });
    expect(game.state.potions.Chloe).toBeUndefined();

    game.narrator({ type: 'CorrectRole', playerId: 'Eve', role: 'seer' });
    expect(game.state.players.Eve?.role).toBe('seer');
    expect(viewOf(game, 'Eve').me?.role).toBe('seer');
    expect(viewOf(game, 'Eve').me?.knowledge).toContainEqual({
      kind: 'roleChanged',
      role: 'seer',
    });
    expect(game.state.journal.at(-1)?.fact).toEqual({
      kind: 'roleCorrected',
      playerId: 'Eve',
      from: 'villager',
      to: 'seer',
    });
  });

  it('changer un role pendant la distribution', () => {
    const game = setup({ roles: ROLES }).narrator({
      type: 'CorrectRole',
      playerId: 'David',
      role: 'seer',
    });

    expect(game.state.players.David?.role).toBe('seer');
  });

  it('une correction s annule (R-11) : son groupe ne revele rien', () => {
    for (const command of [
      { type: 'CorrectKill', playerId: 'Eve' },
      { type: 'CorrectRole', playerId: 'Eve', role: 'seer' },
    ] as const) {
      const game = toDebate().narrator(command);

      expect(game.last.some((event) => REVEALING_EVENTS.has(event.type))).toBe(false);
    }
  });

  it('refuse les cibles impossibles', () => {
    toDebate()
      .rejects(NARRATOR, { type: 'CorrectKill', playerId: 'Fanny' }, 'INVALID_TARGET')
      .rejects(NARRATOR, { type: 'CorrectRevive', playerId: 'Eve' }, 'INVALID_TARGET')
      .rejects(NARRATOR, { type: 'CorrectKill', playerId: 'Zoe' }, 'UNKNOWN_PLAYER');
  });

  it('seul le meneur corrige', () => {
    toDebate().rejects(player('Eve'), { type: 'CorrectKill', playerId: 'David' }, 'FORBIDDEN');
  });

  it('refuse de corriger la nuit, avant la distribution et apres la fin', () => {
    const night = setup({ roles: ROLES, options: { mayor: false } }).advance();

    night.rejects(NARRATOR, { type: 'CorrectKill', playerId: 'Eve' }, 'WRONG_PHASE');
    night.rejects(NARRATOR, { type: 'CorrectRole', playerId: 'Eve', role: 'seer' }, 'WRONG_PHASE');
    // L'aube masquee est encore la nuit pour les joueurs (`R-12`).
    night.wolfVote('Alice', 'Fanny').witch('Chloe');
    expect(night.state.phase).toBe('DAWN');
    night.rejects(NARRATOR, { type: 'CorrectRevive', playerId: 'Fanny' }, 'WRONG_PHASE');
    // Pendant la distribution, seul le role se corrige.
    setup({ roles: ROLES }).rejects(
      NARRATOR,
      { type: 'CorrectKill', playerId: 'Eve' },
      'WRONG_PHASE',
    );
    toDebate()
      .narrator({ type: 'CorrectKill', playerId: 'Alice' })
      .rejects(NARRATOR, { type: 'CorrectRevive', playerId: 'Alice' }, 'WRONG_PHASE');
  });

  it('le meneur recoit les actions de correction', () => {
    const view = projectView(toDebate().state, { kind: 'narrator' });

    expect(view.actions).toContainEqual({
      type: 'CorrectKill',
      targets: ['Alice', 'Bob', 'Chloe', 'David', 'Eve'],
    });
    expect(view.actions).toContainEqual({ type: 'CorrectRevive', targets: ['Fanny'] });
    expect(view.actions).toContainEqual(
      expect.objectContaining({ type: 'CorrectRole', targets: Object.keys(ROLES) }),
    );
  });
});

describe('R-18 : non-fuite des corrections', () => {
  it('aucun joueur ne voit la cause `correction` avant la fin', () => {
    const game = toDebate().narrator({ type: 'CorrectKill', playerId: 'Eve' });

    for (const id of Object.keys(ROLES)) {
      expect(JSON.stringify(viewOf(game, id))).not.toContain('correction');
    }
  });

  it('seul le joueur concerne apprend que son role a change', () => {
    const game = toDebate().narrator({ type: 'CorrectRole', playerId: 'Eve', role: 'seer' });

    for (const id of Object.keys(ROLES).filter((name) => name !== 'Eve')) {
      expect(viewOf(game, id).me?.knowledge).not.toContainEqual(
        expect.objectContaining({ kind: 'roleChanged' }),
      );
    }
  });
});
