import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryHistory, RouterProvider } from '@tanstack/react-router';
import { render } from '@testing-library/react';
import axe from 'axe-core';
import type { ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import { vi } from 'vitest';

import { createI18n } from '../src/i18n.ts';
import { createAppRouter } from '../src/router.tsx';

/** Reponses REST factices, par chemin. */
export type Routes = Readonly<Record<string, { status: number; body: unknown }>>;

/** Remplace `fetch` : chaque chemin connu renvoie sa reponse, les autres 404. */
export function mockFetch(routes: Routes): void {
  vi.stubGlobal('fetch', (input: RequestInfo | URL) => {
    const url = input instanceof Request ? input.url : input.toString();
    const path = new URL(url, 'http://localhost').pathname;
    const route = routes[path] ?? { status: 404, body: null };

    return Promise.resolve(new Response(JSON.stringify(route.body), { status: route.status }));
  });
}

export const SIGNED_OUT: Routes = {
  '/api/me': {
    status: 401,
    body: { code: 'UNAUTHENTICATED', messageKey: 'errors.unauthenticated' },
  },
};

export const SIGNED_IN: Routes = {
  '/api/me': { status: 200, body: { id: 'u1', displayName: 'Alice', email: null, guest: true } },
};

function providers(children: ReactNode, locale = 'fr') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return (
    <I18nextProvider i18n={createI18n(locale)}>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </I18nextProvider>
  );
}

/** Rend l'app entiere sur une route donnee. */
export async function renderRoute(path: string, locale = 'fr') {
  const router = createAppRouter();

  router.update({ history: createMemoryHistory({ initialEntries: [path] }) });
  await router.load();
  return render(providers(<RouterProvider router={router} />, locale));
}

/** Rend un composant avec i18n et TanStack Query. */
export function renderWithProviders(children: ReactNode) {
  return render(providers(children));
}

/**
 * Violations axe. `color-contrast` est verifie sur les tokens
 * (`packages/ui/test/contrast.test.ts`), jsdom n'ayant pas de canvas.
 */
export async function axeViolations(element: HTMLElement): Promise<axe.Result[]> {
  const results = await axe.run(element, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
    rules: { 'color-contrast': { enabled: false } },
  });

  return results.violations;
}
