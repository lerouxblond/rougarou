import { describe, expect, it } from 'vitest';

import { createEmailSender } from '../src/email.ts';

describe('EmailSender (ADR 0009)', () => {
  it('reste desactive sans cle ou sans expediteur (D-18)', () => {
    expect(createEmailSender({})).toBeNull();
    expect(createEmailSender({ RESEND_API_KEY: 're_x' })).toBeNull();
    expect(createEmailSender({ EMAIL_FROM: 'Rougarou <bonjour@exemple.fr>' })).toBeNull();
  });

  it('envoie a Resend avec la cle en Bearer', async () => {
    const requests: Request[] = [];
    const sender = createEmailSender(
      { RESEND_API_KEY: 're_test', EMAIL_FROM: 'Rougarou <bonjour@exemple.fr>' },
      (input, init) => {
        requests.push(new Request(input, init));
        return Promise.resolve(new Response('{}', { status: 200 }));
      },
    );

    await sender?.send({ to: 'alice@example.com', subject: 'Bienvenue', text: 'Salut' });

    const [request] = requests;

    expect(request?.url).toBe('https://api.resend.com/emails');
    expect(request?.headers.get('authorization')).toBe('Bearer re_test');
    expect(await request?.json()).toEqual({
      from: 'Rougarou <bonjour@exemple.fr>',
      to: 'alice@example.com',
      subject: 'Bienvenue',
      text: 'Salut',
    });
  });

  it('remonte un refus de Resend', async () => {
    const sender = createEmailSender(
      { RESEND_API_KEY: 're_test', EMAIL_FROM: 'bonjour@exemple.fr' },
      () => Promise.resolve(new Response('{}', { status: 422 })),
    );

    await expect(sender?.send({ to: 'a@b.c', subject: 's', text: 't' })).rejects.toThrow(/422/);
  });
});
