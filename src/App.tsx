import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router';
import { AppLayout } from './components/layout/AppLayout.tsx';
import { AuthCallbackPage } from './pages/AuthCallbackPage.tsx';
import { HomePage } from './pages/HomePage.tsx';
import { LoginPage } from './pages/LoginPage.tsx';
import { MyChartsPage } from './pages/MyChartsPage.tsx';
import { NotFoundPage } from './pages/NotFoundPage.tsx';

// The chart page carries the astronomy engine; load it only when needed.
const ChartPage = lazy(() =>
  import('./pages/ChartPage.tsx').then((m) => ({ default: m.ChartPage })),
);

export function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route
          path="chart"
          element={
            <Suspense
              fallback={
                <p className="min-h-[200vh] text-center text-sm">Calculating your chart…</p>
              }
            >
              <ChartPage />
            </Suspense>
          }
        />
        <Route path="login" element={<LoginPage />} />
        <Route path="auth/callback" element={<AuthCallbackPage />} />
        <Route path="charts" element={<MyChartsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
