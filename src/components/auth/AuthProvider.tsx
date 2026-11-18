import { useEffect, useState, type ReactNode } from 'react';
import { AuthContext, type AuthState } from '../../lib/authContext.ts';
import type { AppSupabaseClient } from '../../lib/supabase.ts';

interface AuthProviderProps {
  client: AppSupabaseClient | null;
  children: ReactNode;
}

export function AuthProvider({ client, children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>(() =>
    client
      ? { status: 'loading', client, user: null, session: null }
      : { status: 'unavailable', client: null, user: null, session: null },
  );

  useEffect(() => {
    if (!client) return;
    let active = true;
    const apply = (
      session: Awaited<ReturnType<typeof client.auth.getSession>>['data']['session'],
    ) => {
      if (!active) return;
      setState(
        session
          ? { status: 'signed-in', client, user: session.user, session }
          : { status: 'signed-out', client, user: null, session: null },
      );
    };
    client.auth.getSession().then(({ data }) => apply(data.session));
    const { data: sub } = client.auth.onAuthStateChange((_event, session) => apply(session));
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [client]);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}
