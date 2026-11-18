import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import type { Session, User } from '@supabase/supabase-js';
import { App } from '../App.tsx';
import { AuthContext, type AuthState } from '../lib/authContext.ts';
import type { AppSupabaseClient } from '../lib/supabase.ts';

/** A minimal fake client: only the auth methods our UI calls. Data calls go through mocked lib/charts. */
export function fakeClient(overrides: Record<string, unknown> = {}) {
  return {
    auth: {
      signInWithOtp: vi.fn(async () => ({ data: {}, error: null })),
      signInWithOAuth: vi.fn(async () => ({ data: {}, error: null })),
      signOut: vi.fn(async () => ({ error: null })),
      ...overrides,
    },
  } as unknown as AppSupabaseClient;
}

export function signedIn(client = fakeClient()): AuthState {
  const user = { id: 'user-1', email: 'me@example.com' } as User;
  return { status: 'signed-in', client, user, session: { user } as Session };
}

export function signedOut(client = fakeClient()): AuthState {
  return { status: 'signed-out', client, user: null, session: null };
}

export function renderApp(
  auth: AuthState,
  entry: string | { pathname: string; hash?: string; state?: unknown },
  extra?: ReactNode,
) {
  return (
    <AuthContext.Provider value={auth}>
      <MemoryRouter initialEntries={[entry]}>
        <App />
        {extra}
      </MemoryRouter>
    </AuthContext.Provider>
  );
}
