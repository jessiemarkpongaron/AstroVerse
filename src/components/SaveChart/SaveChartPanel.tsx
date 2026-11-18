import { useId, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../../hooks/useAuth.ts';
import type { BirthInput } from '../../lib/astro/types.ts';
import { ChartsError, saveChart } from '../../lib/charts.ts';
import { setPendingChart } from '../../lib/pendingChart.ts';

interface SaveChartPanelProps {
  input: BirthInput;
  name: string;
  alreadySavedId?: string | undefined;
  startOpen?: boolean | undefined;
}

export function SaveChartPanel({ input, name, alreadySavedId, startOpen }: SaveChartPanelProps) {
  const auth = useAuth();
  const navigate = useNavigate();
  const id = useId();
  const [open, setOpen] = useState(!!startOpen);
  const [label, setLabel] = useState(name || 'My chart');
  const [isSelf, setIsSelf] = useState(!name);
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>(
    alreadySavedId ? 'saved' : 'idle',
  );
  const [savedId, setSavedId] = useState(alreadySavedId);
  const [error, setError] = useState('');

  if (auth.status === 'unavailable') return null;

  if (status === 'saved') {
    return (
      <p
        role="status"
        className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-100"
      >
        Saved in{' '}
        <Link to="/charts" className="font-semibold underline">
          My charts
        </Link>
        .
        {savedId && (
          <>
            {' '}
            <Link to={`/charts/${savedId}/reading`} className="font-semibold underline">
              Get the full reading
            </Link>
          </>
        )}
      </p>
    );
  }

  if (auth.status !== 'signed-in') {
    return (
      <button
        type="button"
        onClick={() => {
          setPendingChart(input, name);
          navigate('/login');
        }}
        className="min-h-11 w-full rounded-lg border border-slate-300 px-4 py-2 font-medium sm:w-auto dark:border-dusk"
      >
        Sign in to save this chart
      </button>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="min-h-11 w-full rounded-lg bg-ink px-4 py-2 font-semibold text-white sm:w-auto dark:bg-gold dark:text-ink"
      >
        Save this chart
      </button>
    );
  }

  const client = auth.client;
  async function submit(e: FormEvent) {
    e.preventDefault();
    setStatus('saving');
    try {
      const row = await saveChart(client, input, { label, isSelf, consentConfirmed: consent });
      setSavedId(row.id);
      setStatus('saved');
    } catch (err) {
      setStatus('error');
      setError(err instanceof ChartsError ? err.message : 'Something went wrong.');
    }
  }

  return (
    <form
      onSubmit={submit}
      noValidate
      className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-dusk"
    >
      <h2 className="font-semibold">Save this chart</h2>
      <div>
        <label htmlFor={`${id}-label`} className="mb-1 block text-sm font-medium">
          Chart name
        </label>
        <input
          id={`${id}-label`}
          type="text"
          maxLength={60}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="field"
        />
      </div>
      <label className="flex min-h-11 items-center gap-3 text-sm">
        <input
          type="checkbox"
          checked={isSelf}
          onChange={(e) => setIsSelf(e.target.checked)}
          className="h-5 w-5"
        />
        This is my own chart
      </label>
      {!isSelf && (
        <label className="flex items-start gap-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-950 dark:bg-amber-950/40 dark:text-amber-100">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0"
          />
          <span>I have this person’s permission to save their birth details.</span>
        </label>
      )}
      {status === 'error' && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={status === 'saving' || (!isSelf && !consent)}
          className="min-h-11 rounded-lg bg-ink px-4 font-semibold text-white disabled:opacity-50 dark:bg-gold dark:text-ink"
        >
          {status === 'saving' ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="min-h-11 rounded-lg border border-slate-300 px-4 dark:border-dusk"
        >
          Cancel
        </button>
      </div>
      <p className="text-xs text-slate-600 dark:text-slate-400">
        Saved charts are private to your account. You can delete them anytime.
      </p>
    </form>
  );
}
