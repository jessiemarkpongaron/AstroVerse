import { createContext } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import type { AppSupabaseClient } from './supabase.ts';

export type AuthState =
  | { status: 'unavailable'; client: null; user: null; session: null }
  | { status: 'loading'; client: AppSupabaseClient; user: null; session: null }
  | { status: 'signed-out'; client: AppSupabaseClient; user: null; session: null }
  | { status: 'signed-in'; client: AppSupabaseClient; user: User; session: Session };

export const AuthContext = createContext<AuthState>({
  status: 'unavailable',
  client: null,
  user: null,
  session: null,
});
