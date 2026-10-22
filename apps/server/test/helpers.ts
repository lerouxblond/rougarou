import { exports as worker } from 'cloudflare:workers';

export const ORIGIN = 'https://example.com';

let counter = 0;

/** Appelle le Worker comme le ferait la PWA, sur la meme origine. */
export function call(
  path: string,
  init: RequestInit & { cookie?: string } = {},
): Promise<Response> {
  const headers = new Headers(init.headers);

  headers.set('origin', ORIGIN);

  if (init.cookie !== undefined) {
    headers.set('cookie', init.cookie);
  }

  if (init.body !== undefined && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }

  return worker.default.fetch(`${ORIGIN}${path}`, { ...init, headers });
}

/** Les cookies poses par une reponse, prets a etre renvoyes. */
export function cookiesOf(response: Response): string {
  return response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(';')[0])
    .join('; ');
}

export function uniqueEmail(): string {
  counter += 1;
  return `joueur-${String(counter)}-${crypto.randomUUID().slice(0, 6)}@example.com`;
}

export const PASSWORD = 'correct-horse-battery';

/** Cree un compte et renvoie ses cookies de session. */
export async function signUp(name = 'Alice', email = uniqueEmail()): Promise<string> {
  const response = await call('/api/auth/sign-up/email', {
    method: 'POST',
    body: JSON.stringify({ email, password: PASSWORD, name }),
  });

  if (!response.ok) {
    throw new Error(`Inscription refusee : ${String(response.status)} ${await response.text()}`);
  }

  return cookiesOf(response);
}

/** Ouvre une session invite (D-04) et renvoie ses cookies. */
export async function signInGuest(): Promise<string> {
  const response = await call('/api/auth/sign-in/anonymous', { method: 'POST' });

  if (!response.ok) {
    throw new Error(`Session invite refusee : ${String(response.status)} ${await response.text()}`);
  }

  return cookiesOf(response);
}
