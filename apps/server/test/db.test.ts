import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';

/** Le schema D1 applique par les migrations (`docs/04` §Base de donnees). */

async function insertGame(id: string, code: string, status = 'lobby'): Promise<void> {
  await env.DB.prepare('insert into game (id, code, status) values (?, ?, ?)')
    .bind(id, code, status)
    .run();
}

describe('Migrations D1', () => {
  it('creent toutes les tables de docs/04 et de Better Auth', async () => {
    const { results } = await env.DB.prepare(
      "select name from sqlite_master where type = 'table' order by name",
    ).all<{ name: string }>();
    // D1 et SQLite ajoutent leurs propres tables internes.
    const internal = /^(_cf_|sqlite_|d1_migrations$)/;

    expect(results.map((row) => row.name).filter((name) => !internal.test(name))).toEqual([
      'account',
      'game',
      'game_player',
      'preset',
      'profile',
      'session',
      'user',
      'verification',
    ]);
  });
});

describe('Code de partie (docs/04)', () => {
  it('deux parties actives ne partagent pas un code', async () => {
    await insertGame('01JA0000000000000000000001', 'ABC234');

    await expect(insertGame('01JA0000000000000000000002', 'ABC234', 'playing')).rejects.toThrow(
      /UNIQUE/,
    );
  });

  it('une partie terminee libere son code', async () => {
    await insertGame('01JA0000000000000000000003', 'XYZ789', 'ended');
    await insertGame('01JA0000000000000000000004', 'XYZ789');
    await insertGame('01JA0000000000000000000005', 'XYZ789', 'ended');

    const { results } = await env.DB.prepare('select id from game where code = ?')
      .bind('XYZ789')
      .all();

    expect(results).toHaveLength(3);
  });
});
