import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router';
import { AppLayout } from './components/layout/AppLayout.tsx';
import { HomePage } from './pages/HomePage.tsx';
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
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
