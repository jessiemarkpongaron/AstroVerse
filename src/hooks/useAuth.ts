import { useContext } from 'react';
import { AuthContext } from '../lib/authContext.ts';

export function useAuth() {
  return useContext(AuthContext);
}
