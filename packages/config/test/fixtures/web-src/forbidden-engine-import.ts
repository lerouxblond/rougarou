// Fixture : le client ne doit pas dependre du moteur (docs/04).
import { apply } from '@rougarou/engine';

export const run = (): unknown => apply();
