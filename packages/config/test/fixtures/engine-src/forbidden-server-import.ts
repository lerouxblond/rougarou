// Fixture : le moteur ne doit pas dependre du serveur (docs/04).
import { handle } from '@rougarou/server';

export const run = (): unknown => handle();
