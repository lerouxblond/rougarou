import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  type AnyRoute,
} from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { Home } from './routes/Home.tsx';

/**
 * Racine du routage. Le lien d'evitement est le premier element focusable de
 * la page : on doit pouvoir sauter la navigation au clavier (`CLAUDE.md`
 * regle 9).
 */
function RootLayout() {
  const { t } = useTranslation();

  return (
    <>
      <a
        href="#contenu"
        className="sr-only focus-visible:not-sr-only focus-visible:absolute focus-visible:top-2 focus-visible:left-2 focus-visible:rounded-pill focus-visible:bg-accent focus-visible:px-4 focus-visible:py-2 focus-visible:text-on-accent"
      >
        {t('app.skip_to_content')}
      </a>
      <Outlet />
    </>
  );
}

const rootRoute = createRootRoute({ component: RootLayout });

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: Home,
});

// Routage par code plutot que par fichiers : une seule route a ce jalon, et
// cela evite une etape de generation supplementaire dans la CI.
const routeTree = rootRoute.addChildren([homeRoute as AnyRoute]);

export function createAppRouter() {
  return createRouter({ routeTree, defaultPreload: 'intent' });
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
}
