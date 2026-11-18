import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { useAuth } from '../hooks/useAuth.ts';
import type { ChartLocationState } from '../lib/chartState.ts';
import {
  ChartsError,
  deleteChart,
  listCharts,
  rowToBirthInput,
  type ChartRow,
} from '../lib/charts.ts';

export function MyChartsPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [charts, setCharts] = useState<ChartRow[] | null>(null);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState<string | null>(null);
  const client = auth.status === 'signed-in' ? auth.client : null;

  const load = useCallback(async () => {
    if (!client) return;
    try {
      setCharts(await listCharts(client));
      setError('');
    } catch (e) {
      setError(e instanceof ChartsError ? e.message : 'Something went wrong.');
    }
  }, [client]);

  useEffect(() => {
    // Data fetching on mount; the state update happens after the request resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  if (auth.status === 'unavailable') return <Navigate to="/" replace />;
  if (auth.status === 'signed-out') return <Navigate to="/login" replace />;
  if (auth.status === 'loading') return <p className="text-center text-sm">Loading…</p>;

  function open(row: ChartRow) {
    const state: ChartLocationState = {
      input: rowToBirthInput(row),
      name: row.is_self ? '' : row.label,
      savedChartId: row.id,
    };
    navigate('/chart', { state });
  }

  async function remove(id: string) {
    if (!client) return;
    try {
      await deleteChart(client, id);
      setConfirming(null);
      await load();
    } catch (e) {
      setError(e instanceof ChartsError ? e.message : 'Something went wrong.');
    }
  }

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">My charts</h1>
        <Link to="/" className="text-sm font-medium text-gold-dark underline dark:text-gold">
          New chart
        </Link>
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      )}

      {charts === null && !error && <p className="text-sm">Loading your charts…</p>}

      {charts?.length === 0 && (
        <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-600 dark:border-dusk dark:text-slate-400">
          No saved charts yet. Make a chart, then tap “Save this chart”.
        </p>
      )}

      {charts && charts.length > 0 && (
        <ul className="space-y-3">
          {charts.map((c) => (
            <li key={c.id} className="rounded-xl border border-slate-200 p-4 dark:border-dusk">
              <div className="flex flex-wrap items-baseline gap-2">
                <h2 className="font-semibold">{c.label}</h2>
                {c.is_self && (
                  <span className="rounded-full bg-gold/20 px-2 py-0.5 text-xs font-medium">
                    Me
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                {c.birth_date}
                {c.birth_time ? ` · ${c.birth_time.slice(0, 5)}` : ' · time unknown'} ·{' '}
                {c.place_name}
              </p>
              {confirming === c.id ? (
                <div
                  role="alertdialog"
                  aria-label={`Delete ${c.label}?`}
                  className="mt-3 space-y-2 rounded-lg bg-red-50 p-3 text-sm dark:bg-red-950/40"
                >
                  <p>Delete “{c.label}” and all its readings? This can’t be undone.</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => remove(c.id)}
                      className="min-h-11 rounded-lg bg-red-700 px-4 font-semibold text-white"
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirming(null)}
                      className="min-h-11 rounded-lg border border-slate-300 px-4 dark:border-dusk"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => open(c)}
                    className="min-h-11 rounded-lg bg-ink px-4 font-semibold text-white dark:bg-gold dark:text-ink"
                  >
                    Open
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirming(c.id)}
                    aria-label={`Delete ${c.label}`}
                    className="min-h-11 rounded-lg border border-slate-300 px-4 dark:border-dusk"
                  >
                    Delete
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
