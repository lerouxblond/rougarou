import { exports as worker } from 'cloudflare:workers';
import { healthResponseSchema, PROTOCOL_VERSION } from '@rougarou/protocol';
import { describe, expect, it } from 'vitest';

describe('GET /api/health', () => {
  it('repond 200', async () => {
    const response = await worker.default.fetch('https://example.com/api/health');

    expect(response.status).toBe(200);
  });

  it('renvoie un corps que le schema partage valide (CLAUDE.md regle 4)', async () => {
    const response = await worker.default.fetch('https://example.com/api/health');

    const parsed = healthResponseSchema.safeParse(await response.json());

    expect(parsed.success).toBe(true);
  });

  it('annonce la version du protocole du paquet partage', async () => {
    const response = await worker.default.fetch('https://example.com/api/health');
    const body = healthResponseSchema.parse(await response.json());

    expect(body.protocol).toBe(PROTOCOL_VERSION);
    expect(body.status).toBe('ok');
  });

  it('renvoie une horloge serveur plausible (docs/12)', async () => {
    const before = Date.now();
    const response = await worker.default.fetch('https://example.com/api/health');
    const body = healthResponseSchema.parse(await response.json());

    expect(body.now).toBeGreaterThanOrEqual(before - 1000);
    expect(body.now).toBeLessThanOrEqual(Date.now() + 1000);
  });
});

describe('routes inconnues', () => {
  it('renvoie du JSON et non du HTML sur /api/*', async () => {
    const response = await worker.default.fetch('https://example.com/api/inconnue');

    expect(response.status).toBe(404);
    expect(response.headers.get('content-type')).toContain('application/json');
    expect(await response.json()).toEqual({ code: 'NOT_FOUND', message: 'Route inconnue.' });
  });
});

describe('CORS (docs/04)', () => {
  it('autorise l origine des apps Tauri', async () => {
    const response = await worker.default.fetch('https://example.com/api/health', {
      headers: { Origin: 'tauri://localhost' },
    });

    expect(response.headers.get('access-control-allow-origin')).toBe('tauri://localhost');
  });

  it('refuse une origine inconnue', async () => {
    const response = await worker.default.fetch('https://example.com/api/health', {
      headers: { Origin: 'https://attaquant.example' },
    });

    expect(response.headers.get('access-control-allow-origin')).toBeNull();
  });
});
