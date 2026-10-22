import { meResponseSchema } from '@rougarou/protocol';
import { describe, expect, it } from 'vitest';

import { call, cookiesOf, PASSWORD, signInGuest, signUp, uniqueEmail } from './helpers.ts';

async function me(cookie: string) {
  const response = await call('/api/me', { cookie });

  expect(response.status).toBe(200);
  return meResponseSchema.parse(await response.json());
}

describe('Inscription et connexion (US-01)', () => {
  it('cree un compte et ouvre une session dans un cookie HttpOnly, SameSite=Lax', async () => {
    const response = await call('/api/auth/sign-up/email', {
      method: 'POST',
      body: JSON.stringify({ email: uniqueEmail(), password: PASSWORD, name: 'Alice' }),
    });

    expect(response.status).toBe(200);
    const [session] = response.headers.getSetCookie();

    expect(session).toMatch(/HttpOnly/i);
    expect(session).toMatch(/SameSite=Lax/i);
    expect(session).toMatch(/Secure/i);
  });

  it('refuse un mot de passe de moins de 12 caracteres', async () => {
    const response = await call('/api/auth/sign-up/email', {
      method: 'POST',
      body: JSON.stringify({ email: uniqueEmail(), password: 'trop-court', name: 'Bob' }),
    });

    expect(response.status).toBe(400);
  });

  it('se connecte avec le bon mot de passe, et pas avec un autre', async () => {
    const email = uniqueEmail();

    await signUp('Chloe', email);

    const good = await call('/api/auth/sign-in/email', {
      method: 'POST',
      body: JSON.stringify({ email, password: PASSWORD }),
    });
    const bad = await call('/api/auth/sign-in/email', {
      method: 'POST',
      body: JSON.stringify({ email, password: 'pas-le-bon-mot-de-passe' }),
    });

    expect(good.status).toBe(200);
    expect((await me(cookiesOf(good))).displayName).toBe('Chloe');
    expect(bad.status).toBe(401);
  });
});

describe('Invites (D-04)', () => {
  it('ouvre une session sans e-mail visible', async () => {
    const profile = await me(await signInGuest());

    expect(profile.guest).toBe(true);
    expect(profile.email).toBeNull();
  });

  it('un invite qui cree un compte garde son profil et ses parties', async () => {
    const guest = await signInGuest();
    const before = await me(guest);

    await call('/api/me', {
      method: 'PATCH',
      cookie: guest,
      body: JSON.stringify({ displayName: 'Isaure' }),
    });

    const linked = await call('/api/auth/sign-up/email', {
      method: 'POST',
      cookie: guest,
      body: JSON.stringify({ email: uniqueEmail(), password: PASSWORD, name: 'Isaure' }),
    });

    expect(linked.status).toBe(200);
    const after = await me(cookiesOf(linked));

    expect(after.guest).toBe(false);
    expect(after.displayName).toBe('Isaure');
    expect(after.id).not.toBe(before.id);
  });
});

describe('Sans session', () => {
  it('le profil repond 401 avec une cle i18n', async () => {
    const response = await call('/api/me');

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      code: 'UNAUTHENTICATED',
      messageKey: 'errors.unauthenticated',
    });
  });
});
