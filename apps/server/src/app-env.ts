import type { Auth } from './auth.ts';
import type { Env } from './env.ts';

/** Utilisateur authentifie d'une requete. */
export interface SessionUser {
  readonly id: string;
  readonly email: string;
  readonly isAnonymous: boolean;
}

/** Types de l'app Hono : bindings du Worker et variables posees par les middlewares. */
export interface AppEnv {
  Bindings: Env;
  Variables: {
    auth: Auth;
    user: SessionUser;
  };
}
