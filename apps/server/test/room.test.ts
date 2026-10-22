import { narratorViewSchema, playerViewSchema, type PlayerView } from '@rougarou/protocol';
import { evictDurableObject } from 'cloudflare:test';
import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';

import { connect, settle, table, type TestSocket } from './socket.ts';

const FIVE = ['Alice', 'Bob', 'Chloe', 'David', 'Eve'] as const;

function room(gameId: string) {
  return env.GAME_ROOM.get(env.GAME_ROOM.idFromName(gameId));
}

/** Configure et distribue une partie a cinq : un loup, quatre villageois. */
async function deal(narrator: TestSocket): Promise<void> {
  await narrator.ok({ type: 'AdvancePhase' });
  await narrator.ok({ type: 'SetComposition', composition: { werewolf: 1, villager: 4 } });
  await narrator.ok({ type: 'Deal' });
}

describe('GameRoom : vues projetees (CLAUDE.md regle 2)', () => {
  it('chaque socket recoit sa propre vue, validee par son schema strict', async () => {
    const { narrator, players } = await table(FIVE);

    await deal(narrator);

    expect(narratorViewSchema.parse(await narrator.view()).players).toHaveLength(5);

    for (const { socket } of Object.values(players)) {
      const view = playerViewSchema.parse(await socket.view());
      const others = view.players.filter((seen) => seen.id !== view.me?.id);

      expect(view.me?.role).not.toBeNull();
      // Un villageois ne voit aucun autre role ; le loup est seul de son camp.
      expect(others.every((seen) => seen.role === null)).toBe(true);
    }
  });

  it('un joueur ne recoit jamais la vue du meneur', async () => {
    const { players } = await table(FIVE);

    for (const { socket } of Object.values(players)) {
      expect(
        socket.received.every((message) => message.t !== 'state' || message.view.kind === 'player'),
      ).toBe(true);
    }
  });

  it('une arrivee est diffusee a tous', async () => {
    const { narrator, players } = await table(['Alice']);
    const alice = players.Alice?.socket;

    expect((await narrator.view()).players.map((seen) => seen.name)).toEqual(['Alice']);
    expect((await alice?.view())?.players.map((seen) => seen.name)).toEqual(['Alice']);
  });
});

describe('GameRoom : journal (docs/04)', () => {
  it('une commande refusee ne touche pas le journal et ne part qu a son auteur', async () => {
    const { narrator, players } = await table(['Alice']);
    const alice = players.Alice?.socket;

    await settle();
    const before = narrator.received.length;
    const reply = await alice?.command({ type: 'Deal' });

    expect(reply).toMatchObject({ t: 'error', code: 'FORBIDDEN' });
    await settle();
    expect(narrator.received.length).toBe(before);
  });

  it('un Durable Object recharge retrouve l etat exact, Undo compris', async () => {
    const { gameId, narrator, narratorCookie, players } = await table(FIVE);

    await narrator.ok({ type: 'AdvancePhase' });
    await narrator.ok({ type: 'SetComposition', composition: { werewolf: 1, villager: 4 } });
    await narrator.ok({ type: 'Undo' });

    const before = await narrator.view();

    await evictDurableObject(room(gameId));

    const reopened = await connect(narratorCookie, gameId);

    expect(await reopened.view()).toEqual(before);
    expect((await reopened.view()).composition).toEqual({});

    const bob = players.Bob;

    if (bob === undefined) {
      throw new Error('Bob absent');
    }

    const bobAgain = await connect(bob.cookie, gameId);
    const view = (await bobAgain.view()) as PlayerView;

    expect(view.me?.id).toBeDefined();
    expect(view.phase).toBe('CONFIG');
  });

  it('la sequence croit a chaque commande acceptee, Undo compris', async () => {
    const { narrator } = await table(['Alice']);
    const seqs = () =>
      narrator.received.flatMap((message) => (message.t === 'state' ? [message.seq] : []));

    await narrator.ok({ type: 'AdvancePhase' });
    await narrator.ok({ type: 'Undo' });
    await settle();

    const seen = seqs();

    expect(seen.slice(-2)[1]).toBeGreaterThan(seen.slice(-2)[0] ?? Infinity);
  });
});

describe('GameRoom : D1', () => {
  it('la distribution passe la partie en cours', async () => {
    const { gameId, narrator } = await table(FIVE);

    await deal(narrator);
    await settle();

    expect(
      await env.DB.prepare('select status from game where id = ?').bind(gameId).first('status'),
    ).toBe('playing');
  });
});
