import { Link } from 'react-router';
import { useAuth } from '../../hooks/useAuth.ts';
import { ThemeToggle } from './ThemeToggle.tsx';

export function Header() {
  const auth = useAuth();
  return (
    <header className="border-b border-slate-200 dark:border-dusk">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-2">
        <Link to="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <span aria-hidden="true" className="text-gold-dark dark:text-gold">
            ✦
          </span>
          AstroVerse
        </Link>
        <nav aria-label="Account" className="flex items-center gap-1 text-sm">
          {auth.status === 'signed-in' && (
            <>
              <Link
                to="/charts"
                className="rounded-lg px-2 py-2 font-medium hover:bg-slate-100 dark:hover:bg-dusk"
              >
                My charts
              </Link>
              <button
                type="button"
                onClick={() => void auth.client.auth.signOut()}
                className="rounded-lg px-2 py-2 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-dusk"
              >
                Sign out
              </button>
            </>
          )}
          {auth.status === 'signed-out' && (
            <Link
              to="/login"
              className="rounded-lg px-2 py-2 font-medium hover:bg-slate-100 dark:hover:bg-dusk"
            >
              Sign in
            </Link>
          )}
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
