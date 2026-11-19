import { useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router';
import { useAuth } from '../hooks/useAuth.ts';
import { authRedirectUrl } from '../lib/supabase.ts';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginPage() {
  const auth = useAuth();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');

  if (auth.status === 'unavailable') {
    return (
      <section className="space-y-3 text-center">
        <h1 className="text-2xl font-bold">Accounts are not available yet</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          You can still make free charts.
        </p>
        <Link to="/start" className="text-gold-dark underline dark:text-gold">
          Make a chart
        </Link>
      </section>
    );
  }
  if (auth.status === 'signed-in') return <Navigate to="/charts" replace />;
  const client = auth.client;

  async function sendLink(e: FormEvent) {
    e.preventDefault();
    if (!EMAIL_RE.test(email.trim())) {
      setStatus('error');
      setError('Enter a valid email address.');
      return;
    }
    setStatus('sending');
    const { error: err } = await client.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: authRedirectUrl() },
    });
    if (err) {
      setStatus('error');
      setError(
        err.status === 429
          ? 'Too many sign-in emails. Please wait a few minutes and try again.'
          : 'We couldn’t send the email. Please try again.',
      );
    } else {
      setStatus('sent');
    }
  }

  async function google() {
    const { error: err } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: authRedirectUrl() },
    });
    if (err) {
      setStatus('error');
      setError('Google sign-in is not available right now. Try the email link instead.');
    }
  }

  return (
    <section className="mx-auto max-w-sm space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Welcome to AstroVerse</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Sign in to save your charts and come back to them anytime. No password needed.
        </p>
      </div>

      {status === 'sent' ? (
        <div
          role="status"
          className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-100"
        >
          <p className="font-semibold">Check your email</p>
          <p className="mt-1">
            We sent a sign-in link to <strong>{email.trim()}</strong>. Open it on this phone or
            computer to continue.
          </p>
        </div>
      ) : (
        <form onSubmit={sendLink} noValidate className="space-y-3">
          <div>
            <label htmlFor="login-email" className="mb-1 block text-sm font-medium">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={status === 'error'}
              aria-describedby={status === 'error' ? 'login-error' : undefined}
              className="field"
            />
          </div>
          <button
            type="submit"
            disabled={status === 'sending'}
            className="min-h-12 w-full rounded-lg bg-ink px-4 py-3 font-semibold text-white hover:bg-dusk disabled:opacity-60 dark:bg-gold dark:text-ink"
          >
            {status === 'sending' ? 'Sending…' : 'Email me a sign-in link'}
          </button>
        </form>
      )}

      {status === 'error' && (
        <p id="login-error" role="alert" className="text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3 text-xs text-slate-500">
        <span className="h-px flex-1 bg-slate-200 dark:bg-dusk" /> or{' '}
        <span className="h-px flex-1 bg-slate-200 dark:bg-dusk" />
      </div>

      <button
        type="button"
        onClick={google}
        className="min-h-12 w-full rounded-lg border border-slate-300 px-4 py-3 font-semibold dark:border-dusk"
      >
        Continue with Google
      </button>

      <Link
        to="/start"
        className="flex min-h-12 w-full items-center justify-center rounded-lg px-4 py-3 font-semibold text-gold-dark underline dark:text-gold"
      >
        Continue without an account
      </Link>

      <p className="text-xs text-slate-600 dark:text-slate-400">
        We only use your email to sign you in. Your saved charts are private to your account.
      </p>
    </section>
  );
}
