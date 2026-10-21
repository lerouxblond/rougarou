import type { GlobalProvider } from '@ladle/react';

import '../src/styles.css';

/**
 * Chaque histoire est rendue dans les **deux** themes, cote a cote
 * (`docs/06` : chaque composant est livre en nuit et en jour).
 *
 * Le theme se pilote par `data-phase`, exactement comme dans l'app.
 */
export const Provider: GlobalProvider = ({ children }) => (
  <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
    <section data-phase="night" className="flex flex-col items-start gap-6 bg-bg p-8 text-text">
      <h2 className="font-pixel text-xs tracking-[0.2em] text-text-muted uppercase">Nuit</h2>
      {children}
    </section>

    <section data-phase="day" className="flex flex-col items-start gap-6 bg-bg p-8 text-text">
      <h2 className="font-pixel text-xs tracking-[0.2em] text-text-muted uppercase">Jour</h2>
      {children}
    </section>
  </div>
);
