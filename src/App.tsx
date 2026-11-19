import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router';
import { AppLayout } from './components/layout/AppLayout.tsx';
import { AuthCallbackPage } from './pages/AuthCallbackPage.tsx';
import { aiReadingsEnabled } from './lib/features.ts';
import { HomePage } from './pages/HomePage.tsx';
import { LoginPage } from './pages/LoginPage.tsx';
import { MyChartsPage } from './pages/MyChartsPage.tsx';
import { NotFoundPage } from './pages/NotFoundPage.tsx';
// Sign pages are pre-rendered at build time, so they load eagerly (no loading flash).
import { SignPage } from './pages/SignPage.tsx';
import { SignsIndexPage } from './pages/SignsIndexPage.tsx';

// The chart page carries the astronomy engine; load it only when needed.
const ChartPage = lazy(() =>
  import('./pages/ChartPage.tsx').then((m) => ({ default: m.ChartPage })),
);
const FullReadingPage = lazy(() =>
  import('./pages/FullReadingPage.tsx').then((m) => ({ default: m.FullReadingPage })),
);
const CompatibilityPage = lazy(() =>
  import('./pages/CompatibilityPage.tsx').then((m) => ({ default: m.CompatibilityPage })),
);
const CareerPage = lazy(() =>
  import('./pages/CareerPage.tsx').then((m) => ({ default: m.CareerPage })),
);
const ForecastPage = lazy(() =>
  import('./pages/ForecastPage.tsx').then((m) => ({ default: m.ForecastPage })),
);
const ReadingPage = lazy(() =>
  import('./pages/ReadingPage.tsx').then((m) => ({ default: m.ReadingPage })),
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
        <Route
          path="reading"
          element={
            <Suspense fallback={<p className="min-h-[200vh] text-center text-sm">Loading…</p>}>
              <FullReadingPage />
            </Suspense>
          }
        />
        <Route
          path="forecast"
          element={
            <Suspense fallback={<p className="min-h-[200vh] text-center text-sm">Loading…</p>}>
              <ForecastPage />
            </Suspense>
          }
        />
        <Route
          path="career"
          element={
            <Suspense fallback={<p className="min-h-[200vh] text-center text-sm">Loading…</p>}>
              <CareerPage />
            </Suspense>
          }
        />
        <Route
          path="compatibility"
          element={
            <Suspense fallback={<p className="min-h-[200vh] text-center text-sm">Loading…</p>}>
              <CompatibilityPage />
            </Suspense>
          }
        />
        <Route path="signs" element={<SignsIndexPage />} />
        <Route path="signs/:sign" element={<SignPage kind="sun" />} />
        <Route path="moon/:sign" element={<SignPage kind="moon" />} />
        <Route path="rising/:sign" element={<SignPage kind="rising" />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="auth/callback" element={<AuthCallbackPage />} />
        <Route path="charts" element={<MyChartsPage />} />
        {aiReadingsEnabled() && (
          <Route
            path="charts/:chartId/reading"
            element={
              <Suspense fallback={<p className="min-h-[200vh] text-center text-sm">Loading…</p>}>
                <ReadingPage />
              </Suspense>
            }
          />
        )}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
