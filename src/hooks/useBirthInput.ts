import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';
import type { BirthInput } from '../lib/astro/types.ts';
import type { ChartLocationState } from '../lib/chartState.ts';
import { decodeBirthHash } from '../lib/shareLink.ts';

/**
 * Birth data for /chart and /reading: from a share-link fragment (moved into router state
 * right away) or from router state.
 */
export function useBirthInput(): {
  input: BirthInput | null;
  name: string;
  savedChartId?: string | undefined;
  openSave?: boolean | undefined;
} {
  const location = useLocation();
  const navigate = useNavigate();
  const fromHash = location.hash ? decodeBirthHash(location.hash) : null;

  // Privacy: once a share link is opened, move the birth data from the address bar into
  // router state (kept across reloads by the browser), so it doesn't linger in the URL.
  useEffect(() => {
    if (!fromHash) return;
    const state: ChartLocationState = { input: fromHash, name: '' };
    navigate({ pathname: location.pathname, hash: '' }, { replace: true, state });
    // fromHash is derived from location.hash; re-run only when the hash changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.hash]);

  if (fromHash) return { input: fromHash, name: '' };
  const state = location.state as ChartLocationState | null;
  return {
    input: state?.input ?? null,
    name: state?.name ?? '',
    savedChartId: state?.savedChartId,
    openSave: state?.openSave,
  };
}
