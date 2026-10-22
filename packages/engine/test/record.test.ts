import { commandSchema, type Actor, type CommandInput } from '@rougarou/protocol';
import { describe, expect, it } from 'vitest';

import {
  applyToRecord,
  createRecord,
  createRng,
  eventCount,
  replay,
  SNAPSHOT_EVERY,
  type GameRecord,
  type RecordResult,
} from '../src/index.ts';
import { EIGHT_ROLES, NARRATOR, player, T0 } from './dsl.ts';

const rng = createRng(3);

function send(record: GameRecord, actor: Actor, command: CommandInput): RecordResult {
  return applyToRecord(record, { actor, cmd: commandSchema.parse(command) }, { now: T0, rng });
}

function ok(record: GameRecord, actor: Actor, command: CommandInput): GameRecord {
  const result = send(record, actor, command);

  if (!result.ok) {
    throw new Error(`${command.type} refusee : ${result.error.code}`);
  }

  return result.record;
}

/** Une partie a huit joueurs, roles distribues et vus, prete a lancer la nuit. */
function dealtRecord(): GameRecord {
  let record = createRecord('game-r');
  const names = Object.keys(EIGHT_ROLES);

  for (const name of names) {
    record = ok(record, player(name), { type: 'JoinGame', name });
  }

  record = ok(record, NARRATOR, { type: 'AdvancePhase' });
  record = ok(record, NARRATOR, {
    type: 'SetComposition',
    composition: { werewolf: 2, villager: 6 },
  });
  record = ok(record, NARRATOR, { type: 'Deal' });

  for (const name of names) {
    record = ok(record, player(name), { type: 'ConfirmRoleSeen' });
  }

  return record;
}

function wolvesOf(record: GameRecord): string[] {
  return record.state.seats.filter((id) => record.state.players[id]?.role === 'werewolf');
}

describe('Rejeu (ADR 0002)', () => {
  it('rejouer tous les evenements redonne l etat courant', () => {
    const record = dealtRecord();

    expect(replay(record.groups.flat())).toEqual(record.state);
  });

  it('une commande refusee ne touche pas le journal', () => {
    const record = dealtRecord();
    const result = send(record, player('Zoe'), { type: 'JoinGame', name: 'Zoe' });

    expect(result.ok).toBe(false);
  });

  it('une commande sans effet n ouvre pas de groupe', () => {
    const record = dealtRecord();
    const result = send(record, player('Alice'), { type: 'ConfirmRoleSeen' });

    expect(result).toMatchObject({ ok: true, record, appended: [], removed: 0 });
  });
});

describe('Instantanes (docs/04)', () => {
  it(`un instantane est pris des que le journal franchit ${SNAPSHOT_EVERY} evenements`, () => {
    let record = createRecord('big');

    for (let index = 0; index < 24; index += 1) {
      record = ok(record, player(`p${index}`), { type: 'JoinGame', name: `p${index}` });
      record = ok(record, NARRATOR, {
        type: 'ReorderSeats',
        order: [...record.state.seats].reverse(),
      });
    }

    expect(eventCount(record)).toBe(49);
    expect(record.snapshots).toEqual([]);

    record = ok(record, NARRATOR, { type: 'AdvancePhase' });
    expect(record.snapshots).toEqual([{ seq: 50, state: record.state }]);
  });

  it('rejouer depuis l instantane donne le meme etat que depuis le debut', () => {
    let record = createRecord('big');

    for (let index = 0; index < 30; index += 1) {
      record = ok(record, player(`p${index % 24}x${index}`), { type: 'JoinGame', name: 'x' });
      record = ok(record, player(`p${index % 24}x${index}`), { type: 'LeaveGame' });
    }

    const events = record.groups.flat();
    const [snapshot] = record.snapshots;

    expect(snapshot?.seq).toBe(50);
    expect(replay(events, snapshot)).toEqual(replay(events));
  });
});

describe('Annuler (R-11)', () => {
  it('annule le dernier groupe d evenements', () => {
    const night = ok(dealtRecord(), NARRATOR, { type: 'AdvancePhase' });
    const [wolf] = wolvesOf(night);
    const target = night.state.seats.find((id) => !wolvesOf(night).includes(id)) ?? '';
    const voted = ok(night, player(wolf ?? ''), {
      type: 'SubmitNightAction',
      action: { kind: 'wolfVote', target },
    });
    const result = send(voted, NARRATOR, { type: 'Undo' });

    expect(result).toMatchObject({ ok: true, removed: 1 });
    expect(result.ok && result.record.state).toEqual(night.state);
  });

  it('on peut annuler plusieurs fois de suite', () => {
    const dealt = dealtRecord();
    let record = ok(dealt, NARRATOR, { type: 'AdvancePhase' });

    record = ok(record, NARRATOR, { type: 'Undo' });
    expect(record.state).toEqual(dealt.state);

    // Puis les confirmations, une par une.
    record = ok(record, NARRATOR, { type: 'Undo' });
    expect(record.state.players.Hugo?.roleSeen).toBe(false);
    expect(record.state.players.Gaspard?.roleSeen).toBe(true);
  });

  it('refuse d annuler une revelation : la distribution des roles', () => {
    let record = dealtRecord();

    for (let index = 0; index < 8; index += 1) {
      record = ok(record, NARRATOR, { type: 'Undo' });
    }

    expect(send(record, NARRATOR, { type: 'Undo' })).toEqual({
      ok: false,
      error: { code: 'UNDO_BLOCKED', messageKey: 'errors.undo_blocked' },
    });
  });

  it('refuse d annuler l annonce des morts', () => {
    let record = ok(dealtRecord(), NARRATOR, { type: 'AdvancePhase' });

    record = ok(record, NARRATOR, { type: 'AdvancePhase', force: true });
    record = ok(record, NARRATOR, { type: 'AdvancePhase' });

    expect(send(record, NARRATOR, { type: 'Undo' })).toMatchObject({
      ok: false,
      error: { code: 'UNDO_BLOCKED' },
    });
  });

  it('rien a annuler dans une partie neuve', () => {
    expect(send(createRecord('x'), NARRATOR, { type: 'Undo' })).toMatchObject({
      ok: false,
      error: { code: 'NOTHING_TO_UNDO' },
    });
  });

  it('seul le meneur annule', () => {
    expect(send(dealtRecord(), player('Alice'), { type: 'Undo' })).toMatchObject({
      ok: false,
      error: { code: 'FORBIDDEN' },
    });
  });

  it('annuler retire les instantanes posterieurs', () => {
    let record = createRecord('big');

    for (let index = 0; index < 49; index += 1) {
      record = ok(record, player(`p${index}`), { type: 'JoinGame', name: 'x' });
      record = ok(record, player(`p${index}`), { type: 'LeaveGame' });

      if (eventCount(record) >= SNAPSHOT_EVERY) {
        break;
      }
    }

    // 51 evenements, instantane a 50. Revenir a 50 le garde ; descendre a 49 le retire.
    expect(eventCount(record)).toBe(51);
    expect(record.snapshots).toHaveLength(1);
    record = ok(record, NARRATOR, { type: 'Undo' });
    expect(record.snapshots).toHaveLength(1);
    record = ok(record, NARRATOR, { type: 'Undo' });
    expect(record.snapshots).toEqual([]);
    expect(record.state).toEqual(replay(record.groups.flat()));
  });
});
