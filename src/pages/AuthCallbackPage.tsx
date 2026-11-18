import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../hooks/useAuth.ts';
import type { ChartLocationState } from '../lib/chartState.ts';
import { takePendingChart } from '../lib/pendingChart.ts';

/** Landing page for magic links and Google sign-in (PKCE code exchange happens in supabase-js). */
export function AuthCallbackPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [timedOut, setTimedOut] = useState(false);
  const urlError = new URLSearchParams(window.location.search).get('error_description');

  useEffect(() => {
    if (auth.status !== 'signed-in') return;
    const pending = takePendingChart();
    if (pending) {
      const state: ChartLocationState = {
        input: pending.input,
        name: pending.name,
        openSave: true,
      };
      navigate('/chart', { replace: true, state });
    } else {
      navigate('/charts', { replace: true });
    }
  }, [auth.status, navigate]);

  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 10_000);
    return () => clearTimeout(t);
  }, []);

  if (urlError || (timedOut && auth.status !== 'signed-in') || auth.status === 'unavailable') {
    return (
      <section role="alert" className="space-y-3 text-center">
        <h1 className="text-2xl font-bold">Sign-in didn’t work</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          The link may have expired or already been used. Please request a new one.
        </p>
        <Link to="/login" className="text-gold-dark underline dark:text-gold">
          Back to sign in
        </Link>
      </section>
    );
  }
  return <p className="text-center text-sm">Signing you in…</p>;
}
