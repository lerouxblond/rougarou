import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { StrictMode, startTransition } from 'react';
import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';

import './app.css';
import { createI18n } from './i18n.ts';
import { createAppRouter } from './router.tsx';
import { prefetchMe } from './session.ts';

const container = document.getElementById('root');

if (container === null) {
  throw new Error("L'element #root est absent de index.html.");
}

const queryClient = new QueryClient();
const root = createRoot(container);

prefetchMe(queryClient);

// Le premier rendu passe par une transition : React le decoupe en tranches
// courtes au lieu d'une longue tache qui bloque le fil principal (P30).
startTransition(() => {
  root.render(
    <StrictMode>
      <I18nextProvider i18n={createI18n()}>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={createAppRouter()} />
        </QueryClientProvider>
      </I18nextProvider>
    </StrictMode>,
  );
});
