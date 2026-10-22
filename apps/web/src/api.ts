import {
  apiErrorSchema,
  createGameResponseSchema,
  joinGameResponseSchema,
  meResponseSchema,
  ticketResponseSchema,
  type ApiError,
  type CreateGameResponse,
  type JoinGameResponse,
  type MeResponse,
} from '@rougarou/protocol';

/**
 * Appels REST (`docs/04`). Les reponses sont validees par les schemas
 * partages ; une erreur porte une cle i18n que l'ecran traduit.
 */
export class ApiFailure extends Error {
  readonly status: number;
  readonly error: ApiError | null;

  constructor(status: number, error: ApiError | null) {
    super(error?.messageKey ?? `HTTP ${String(status)}`);
    this.status = status;
    this.error = error;
  }

  /** Cle i18n a afficher. */
  get messageKey(): string {
    return this.error?.messageKey ?? 'errors.network';
  }
}

async function request(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);

  if (init.body !== undefined) {
    headers.set('content-type', 'application/json');
  }

  const response = await fetch(path, { ...init, headers, credentials: 'include' });

  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    const parsed = apiErrorSchema.safeParse(body);

    throw new ApiFailure(response.status, parsed.success ? parsed.data : null);
  }

  return response;
}

/** Un schema du protocole : on n'en utilise que `parse`. */
interface Schema<T> {
  parse(value: unknown): T;
}

async function json<T>(path: string, schema: Schema<T>, init?: RequestInit): Promise<T> {
  return schema.parse(await (await request(path, init)).json());
}

export const api = {
  me: (): Promise<MeResponse> => json('/api/me', meResponseSchema),
  /** Le profil, ou `null` sans session. */
  async meOrNull(): Promise<MeResponse | null> {
    try {
      return await api.me();
    } catch (error) {
      if (error instanceof ApiFailure && error.status === 401) {
        return null;
      }

      throw error;
    }
  },
  async rename(displayName: string): Promise<void> {
    await request('/api/me', { method: 'PATCH', body: JSON.stringify({ displayName }) });
  },
  async signUp(name: string, email: string, password: string): Promise<void> {
    await request('/api/auth/sign-up/email', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
  },
  async signIn(email: string, password: string): Promise<void> {
    await request('/api/auth/sign-in/email', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },
  /** Session invite (D-04), puis le pseudo choisi. */
  async signInGuest(displayName: string): Promise<void> {
    await request('/api/auth/sign-in/anonymous', { method: 'POST' });
    await api.rename(displayName);
  },
  async signOut(): Promise<void> {
    await request('/api/auth/sign-out', { method: 'POST' });
  },
  createGame: (): Promise<CreateGameResponse> =>
    json('/api/games', createGameResponseSchema, { method: 'POST' }),
  joinGame: (code: string): Promise<JoinGameResponse> =>
    json('/api/games/join', joinGameResponseSchema, {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),
  async ticket(gameId: string): Promise<string> {
    return (await json(`/api/games/${gameId}/ticket`, ticketResponseSchema, { method: 'POST' }))
      .ticket;
  },
};
