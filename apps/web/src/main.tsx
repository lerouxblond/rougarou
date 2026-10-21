import { RouterProvider } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';

import './app.css';
import { createI18n } from './i18n.ts';
import { createAppRouter } from './router.tsx';

const container = document.getElementById('root');

if (container === null) {
  throw new Error("L'element #root est absent de index.html.");
}

createRoot(container).render(
  <StrictMode>
    <I18nextProvider i18n={createI18n()}>
      <RouterProvider router={createAppRouter()} />
    </I18nextProvider>
  </StrictMode>,
);
