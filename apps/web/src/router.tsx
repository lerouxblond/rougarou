import { createRootRoute, createRoute, createRouter, Outlet } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { Game } from './routes/Game.tsx';
import { Home } from './routes/Home.tsx';
import { Join } from './routes/Join.tsx';

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

const joinRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/join/$code',
  component: Join,
});

const gameRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/game/$gameId',
  component: Game,
});

// Routage par code plutot que par fichiers : peu de routes, et cela evite une
// etape de generation supplementaire dans la CI.
const routeTree = rootRoute.addChildren([homeRoute, joinRoute, gameRoute]);

export function createAppRouter() {
  return createRouter({ routeTree, defaultPreload: 'intent' });
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
}
