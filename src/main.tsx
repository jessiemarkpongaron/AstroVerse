import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { App } from './App.tsx';
import { AuthProvider } from './components/auth/AuthProvider.tsx';
import { supabase } from './lib/supabase.ts';
import { registerServiceWorker } from './lib/registerServiceWorker.ts';
import './index.css';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root not found');

createRoot(rootEl).render(
  <StrictMode>
    <AuthProvider client={supabase}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>,
);

registerServiceWorker();
