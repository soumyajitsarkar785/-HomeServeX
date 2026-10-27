import React from 'react';
import { AppProviders } from './providers.js';
import { AppRouter } from './router.js';

export const App: React.FC = () => {
  return (
    <AppProviders>
      <AppRouter />
    </AppProviders>
  );
};
