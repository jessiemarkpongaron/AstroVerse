import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router';
import { ReadingSkeleton, ReadingView } from '../components/ReadingView/ReadingView.tsx';
import { useAuth } from '../hooks/useAuth.ts';
import { buildChart } from '../lib/astro/chart.ts';
import type { ChartLocationState } from '../lib/chartState.ts';
import { ChartsError, getChart, rowToBirthInput, type ChartRow } from '../lib/charts.ts';
import { buildNatalPayload } from '../lib/interpret/buildPayload.ts';
import {
  ReadingError,
  findCachedReading,
  requestNatalReading,
  type LoadedReading,
  type ReadingErrorCode,
} from '../lib/readings.ts';

type View =
  | { step: 'loading' }
  | { step: 'missing' }
  | { step: 'offer' }
  | { step: 'writing' }
  | { step: 'ready'; result: LoadedReading }
  | { step: 'error'; code: ReadingErrorCode | 'chart'; message: string };

export function ReadingPage() {
  const { chartId = '' } = useParams();
  const auth = useAuth();
  const client = auth.status === 'signed-in' ? auth.client : null;
  const [row, setRow] = useState<ChartRow | null>(null);
  const [view, setView] = useState<View>({ step: 'loading' });

  // The reading always uses Placidus (Porphyry near the poles), the app's default.
  const payload = useMemo(() => {
    if (!row) return null;
    try {
      return buildNatalPayload(buildChart(rowToBirthInput(row)));
    } catch {
      return null;
    }
  }, [row]);

  // 1. Load the chart (RLS: only the user's own), then any cached reading for it.
  useEffect(() => {
    if (!client) return;
    let cancelled = false;
    (async () => {
      try {
        const chart = await getChart(client, chartId);
        if (cancelled) return;
        if (!chart) return setView({ step: 'missing' });
        setRow(chart);
      } catch (e) {
        if (!cancelled) {
          setView({
            step: 'error',
            code: 'chart',
            message: e instanceof ChartsError ? e.message : 'Something went wrong.',
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [client, chartId]);

  useEffect(() => {
    if (!client || !row) return;
    if (!payload) {
      // Data loading result; set after the async chart fetch above.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setView({
        step: 'error',
        code: 'chart',
        message: 'We couldn’t read this chart’s birth details.',
      });
      return;
    }
    let cancelled = false;
    findCachedReading(client, row.id, payload)
      .then((cached) => {
        if (!cancelled) setView(cached ? { step: 'ready', result: cached } : { step: 'offer' });
      })
      .catch(() => {
        if (!cancelled) setView({ step: 'offer' });
      });
    return () => {
      cancelled = true;
    };
  }, [client, row, payload]);

  const write = useCallback(async () => {
    if (!client || !row || !payload) return;
    setView({ step: 'writing' });
    try {
      setView({ step: 'ready', result: await requestNatalReading(client, row.id, payload) });
    } catch (e) {
      setView(
        e instanceof ReadingError
          ? { step: 'error', code: e.code, message: e.message }
          : { step: 'error', code: 'network', message: 'Something went wrong. Please try again.' },
      );
    }
  }, [client, row, payload]);

  if (auth.status === 'unavailable') return <Navigate to="/start" replace />;
  if (auth.status === 'signed-out') return <Navigate to="/login" replace />;
  if (auth.status === 'loading') return <p className="text-center text-sm">Loading…</p>;

  if (view.step === 'missing') {
    return (
      <section className="space-y-4 text-center">
        <h1 className="text-2xl font-bold">Chart not found</h1>
        <p className="text-sm">This chart isn’t in your account.</p>
        <Link to="/charts" className="text-gold-dark underline dark:text-gold">
          Go to My charts
        </Link>
      </section>
    );
  }

  const title = !row
    ? 'Your reading'
    : row.is_self
      ? 'Your full reading'
      : `${row.label}’s full reading`;
  const chartState: ChartLocationState | null = row
    ? { input: rowToBirthInput(row), name: row.is_self ? '' : row.label, savedChartId: row.id }
    : null;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {row && (
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {row.birth_date}
            {row.birth_time ? ` · ${row.birth_time.slice(0, 5)}` : ' · time unknown'}
            {row.time_accuracy === 'approximate' ? ' (approx.)' : ''} · {row.place_name}
          </p>
        )}
      </header>

      {view.step === 'loading' && <p className="text-sm">Loading…</p>}

      {view.step === 'offer' && (
        <section className="space-y-3 rounded-2xl border border-slate-200 p-4 dark:border-dusk">
          <p>
            A personal reading of the whole chart: personality, mind, love, work, emotions, growth,
            career and life lessons.
          </p>
          {row?.time_accuracy !== 'exact' && (
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {row?.time_accuracy === 'unknown'
                ? 'Without a birth time, the reading leaves out your Rising sign and houses.'
                : 'Your birth time is approximate, so the reading points out what depends on it.'}
            </p>
          )}
          <button
            type="button"
            onClick={write}
            className="min-h-11 w-full rounded-lg bg-ink px-4 py-2 font-semibold text-white sm:w-auto dark:bg-gold dark:text-ink"
          >
            Write my reading
          </button>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Takes about a minute. Only your chart’s placements are sent to our AI writer — never
            your name, birth date or birthplace.
          </p>
        </section>
      )}

      {view.step === 'writing' && (
        <section aria-busy="true" aria-label="Writing your reading" className="space-y-4">
          <p role="status" className="text-sm">
            Writing your reading… this can take up to a minute. You can keep this page open.
          </p>
          <ReadingSkeleton />
        </section>
      )}

      {view.step === 'error' && (
        <section className="space-y-3">
          <p role="alert" className="text-sm text-red-700 dark:text-red-400">
            {view.message}
          </p>
          {view.code === 'unauthorized' ? (
            <Link to="/login" className="text-gold-dark underline dark:text-gold">
              Sign in again
            </Link>
          ) : view.code !== 'rate-limited' && view.code !== 'chart' && view.code !== 'not-found' ? (
            <button
              type="button"
              onClick={write}
              className="min-h-11 rounded-lg border border-slate-300 px-4 font-medium dark:border-dusk"
            >
              Try again
            </button>
          ) : null}
        </section>
      )}

      {view.step === 'ready' && <ReadingView reading={view.result.reading} />}

      <nav aria-label="Reading links" className="flex flex-wrap gap-4 text-sm">
        {chartState && (
          <Link to="/chart" state={chartState} className="text-gold-dark underline dark:text-gold">
            View the chart
          </Link>
        )}
        <Link to="/charts" className="text-gold-dark underline dark:text-gold">
          My charts
        </Link>
      </nav>
    </div>
  );
}
