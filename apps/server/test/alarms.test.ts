import { narratorViewSchema, type NarratorView } from '@rougarou/protocol';
import { runDurableObjectAlarm, runInDurableObject } from 'cloudflare:test';
import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';

import { call } from './helpers.ts';
import { settle, table, type TestSocket } from './socket.ts';

const FIVE = ['Alice', 'Bob', 'Chloe', 'David', 'Eve'] as const;

function room(gameId: string) {
  return env.GAME_ROOM.get(env.GAME_ROOM.idFromName(gameId));
}

function alarmOf(gameId: string): Promise<number | null> {
  return runInDurableObject(room(gameId), (_instance, state) => state.storage.getAlarm());
}

async function narratorView(socket: TestSocket): Promise<NarratorView> {
  return narratorViewSchema.parse(await socket.view());
}

/** Une partie a cinq, sans Maire, lancee jusqu'a la nuit 1 avec un vote des loups de 5 s. */
async function nightOne() {
  const game = await table(FIVE);
  const { narrator, players } = game;

  await narrator.ok({ type: 'AdvancePhase' });
  await narrator.ok({ type: 'SetOptions', options: { mayor: false, timers: { wolfVote: 5 } } });
  await narrator.ok({ type: 'SetComposition', composition: { werewolf: 1, villager: 4 } });
  await narrator.ok({ type: 'Deal' });

  for (const { socket } of Object.values(players)) {
    await socket.ok({ type: 'ConfirmRoleSeen' });
  }

  await narrator.ok({ type: 'AdvancePhase' });
  return game;
}

describe('Minuteurs par alarme (R-14, R-16)', () => {
  it('l alarme suit l echeance du moteur ; la pause la retire, la reprise la replace', async () => {
    const { gameId, narrator } = await nightOne();
    const { deadline } = await narratorView(narrator);

    expect(deadline).not.toBeNull();
    expect(await alarmOf(gameId)).toBe(deadline);

    await narrator.ok({ type: 'PauseTimer' });
    expect(await alarmOf(gameId)).toBeNull();

    await narrator.ok({ type: 'ResumeTimer' });
    expect(await alarmOf(gameId)).toBe((await narratorView(narrator)).deadline);
  });

  it(
    'avant l echeance, l alarme ne fait rien ; a l echeance, elle applique Timeout',
    { timeout: 20_000 },
    async () => {
      const { gameId, narrator } = await nightOne();

      await runDurableObjectAlarm(room(gameId));
      expect((await narratorView(narrator)).phase).toBe('NIGHT');

      await settle(5_200);
      await runDurableObjectAlarm(room(gameId));

      // Pas de victime (R-13), puis l'aube vient seule en pilotage assiste.
      const view = await narratorView(narrator);

      expect(view.phase).toBe('DAWN');
      expect(view.dawn?.deaths).toEqual([]);
    },
  );
});

describe('Fin de partie et purge (docs/04)', () => {
  it('le resume est ecrit dans D1, puis la partie est purgee a J+7', async () => {
    const { gameId, narrator, narratorCookie, players } = await nightOne();
    const roles = (await narratorView(narrator)).players;
    const wolf = roles.find((player) => player.role === 'werewolf');
    // Les places suivent l'ordre d'arrivee, donc l'ordre de `players`.
    const sockets = new Map(
      Object.values(players).map(({ socket }, index) => [roles[index]?.id ?? '', socket]),
    );

    if (wolf === undefined) {
      throw new Error('Pas de loup');
    }

    const victim = roles.find((player) => player.id !== wolf.id);

    await sockets.get(wolf.id)?.ok({
      type: 'SubmitNightAction',
      action: { kind: 'wolfVote', target: victim?.id ?? '' },
    });
    await narrator.ok({ type: 'AdvancePhase' }); // Lever le jour
    await narrator.ok({ type: 'AdvancePhase' }); // Debat
    await narrator.ok({ type: 'AdvancePhase' }); // Ouvrir le vote

    for (const player of roles) {
      if (player.id !== victim?.id && player.id !== wolf.id) {
        await sockets.get(player.id)?.ok({
          type: 'CastVote',
          ballot: { kind: 'player', playerId: wolf.id },
        });
      }
    }

    // Clore le vote : le loup est execute, et la victoire est verifiee aussitot (R-05).
    await narrator.ok({ type: 'AdvancePhase', force: true });
    await settle();

    expect((await narratorView(narrator)).phase).toBe('ENDED');

    const game = await env.DB.prepare('select status, winner from game where id = ?')
      .bind(gameId)
      .first();
    const rows = await env.DB.prepare(
      'select user_id, final_role, won from game_player where game_id = ? order by seat',
    )
      .bind(gameId)
      .all();

    expect(game).toEqual({ status: 'ended', winner: 'village' });
    expect(rows.results).toHaveLength(5);
    expect(rows.results.find((row) => row.user_id === wolf.id)).toMatchObject({
      final_role: 'werewolf',
      won: 0,
    });

    const purgeAt = await alarmOf(gameId);

    expect(purgeAt).toBeGreaterThan(Date.now() + 6 * 24 * 60 * 60 * 1000);

    await runInDurableObject(room(gameId), (_instance, state) => {
      state.storage.sql.exec("update meta set value = '0' where key = 'purgeAt'");
    });
    await runDurableObjectAlarm(room(gameId));

    // Le journal est vide : il ne reste que la marque de purge.
    const left = await runInDurableObject(room(gameId), (_instance, state) => ({
      events: state.storage.sql.exec('select count(*) as n from events').one().n,
      meta: state.storage.sql.exec('select key from meta').toArray(),
    }));

    expect(left).toEqual({ events: 0, meta: [{ key: 'purged' }] });

    // Une partie purgee ne renait pas : plus de ticket.
    const ticket = await call(`/api/games/${gameId}/ticket`, {
      method: 'POST',
      cookie: narratorCookie,
    });

    expect(ticket.status).toBe(404);
  });
});
