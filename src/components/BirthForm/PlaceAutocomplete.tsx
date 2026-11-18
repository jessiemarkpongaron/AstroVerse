import { useId, useState, type KeyboardEvent } from 'react';
import type { Place } from '../../lib/astro/types.ts';
import { usePlaceSearch } from '../../hooks/usePlaceSearch.ts';
import type { PlaceResult } from '../../lib/geo.ts';

interface PlaceAutocompleteProps {
  value: Place | null;
  onChange: (place: Place | null) => void;
  error?: string | undefined;
}

export function PlaceAutocomplete({ value, onChange, error }: PlaceAutocompleteProps) {
  const id = useId();
  const listId = `${id}-list`;
  const errorId = `${id}-error`;
  const [text, setText] = useState(value?.name ?? '');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const search = usePlaceSearch(value ? '' : text);
  const results = search.results;
  const showList = open && !value && search.status !== 'idle';

  function choose(p: PlaceResult) {
    onChange({ name: p.label, lat: p.lat, lon: p.lon, tz: p.tz });
    setText(p.label);
    setOpen(false);
    setActive(-1);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!showList || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (i + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (e.key === 'Enter' && active >= 0) {
      e.preventDefault();
      const r = results[active];
      if (r) choose(r);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  const status =
    search.status === 'loading'
      ? 'Searching…'
      : search.status === 'error'
        ? 'Place search is unavailable. Check your connection and try again.'
        : search.status === 'done' && results.length === 0
          ? 'No places found. Try the nearest town or city.'
          : '';

  return (
    <div className="relative">
      <label htmlFor={id} className="mb-1 block text-sm font-medium">
        Birth place
      </label>
      <input
        id={id}
        type="text"
        role="combobox"
        autoComplete="off"
        placeholder="Town or city, e.g. Carrascal"
        aria-autocomplete="list"
        aria-expanded={showList}
        aria-controls={listId}
        aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
          setActive(-1);
          if (value) onChange(null);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={onKeyDown}
        className="field"
      />
      {value && (
        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
          {value.lat.toFixed(2)}°, {value.lon.toFixed(2)}° · {value.tz}
        </p>
      )}
      {showList && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Matching places"
          className="absolute z-10 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg dark:border-dusk dark:bg-ink"
        >
          {results.map((r, i) => (
            <li
              key={r.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(r)}
              className={`cursor-pointer px-3 py-3 text-sm ${i === active ? 'bg-slate-100 dark:bg-dusk' : ''}`}
            >
              {r.label}
            </li>
          ))}
          {status && (
            <li className="px-3 py-3 text-sm text-slate-600 dark:text-slate-400">{status}</li>
          )}
        </ul>
      )}
      <p className="sr-only" role="status" aria-live="polite">
        {showList && search.status === 'done' && results.length > 0
          ? `${results.length} places found`
          : status}
      </p>
      {error && (
        <p id={errorId} className="mt-1 text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
