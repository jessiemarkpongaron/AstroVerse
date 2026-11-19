import { Navigate } from 'react-router';
import { useAuth } from '../hooks/useAuth.ts';
import { HomePage } from './HomePage.tsx';

/**
 * The site root. Signed-out visitors land on /login (which offers "Continue without an
 * account" → /start); signed-in users, or a build without accounts, get the birth form.
 */
export function LandingPage() {
  const auth = useAuth();
  if (auth.status === 'loading') return <p className="min-h-[60vh]" aria-busy="true" />;
  if (auth.status === 'signed-out') return <Navigate to="/login" replace />;
  return <HomePage />;
}
