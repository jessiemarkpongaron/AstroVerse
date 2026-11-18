import { useEffect, useState } from 'react';
import { MIN_QUERY_LENGTH, searchPlaces, splitQuery, type PlaceResult } from '../lib/geo.ts';

export type PlaceSearchStatus = 'idle' | 'loading' | 'done' | 'error';

interface SearchState {
  query: string;
  status: PlaceSearchStatus;
  results: PlaceResult[];
}

const IDLE: SearchState = { query: '', status: 'idle', results: [] };

/** Debounced place search; cancels in-flight requests when the query changes. */
export function usePlaceSearch(query: string, delayMs = 300) {
  const [state, setState] = useState<SearchState>(IDLE);
  const active = splitQuery(query).name.length >= MIN_QUERY_LENGTH;

  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setState((s) => ({ ...s, query, status: 'loading' }));
      searchPlaces(query, { signal: controller.signal })
        .then((results) => setState({ query, status: 'done', results }))
        .catch(() => {
          if (!controller.signal.aborted) setState({ query, status: 'error', results: [] });
        });
    }, delayMs);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, active, delayMs]);

  return active ? state : IDLE;
}
