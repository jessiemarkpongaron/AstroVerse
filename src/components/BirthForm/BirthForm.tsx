import { useId, useState, type FormEvent, type ReactNode } from 'react';
import type { BirthInput } from '../../lib/astro/types.ts';
import {
  MAX_DATE,
  MIN_DATE,
  validateBirthForm,
  type BirthFormErrors,
  type BirthFormValues,
} from '../../lib/birthForm.ts';
import { PlaceAutocomplete } from './PlaceAutocomplete.tsx';
import { TimeAccuracySelector } from './TimeAccuracySelector.tsx';

interface BirthFormProps {
  initial?: Partial<BirthFormValues> | undefined;
  onSubmit: (input: BirthInput, name: string) => void;
  /** Defaults: 'Name', 'See my chart'. */
  nameLabel?: string | undefined;
  submitLabel?: string | undefined;
  /** Extra fields shown above the submit button (e.g. a consent checkbox). */
  extra?: ReactNode;
  submitDisabled?: boolean | undefined;
}

const EMPTY: BirthFormValues = { name: '', date: '', time: '', accuracy: 'exact', place: null };

export function BirthForm({
  initial,
  onSubmit,
  nameLabel = 'Name',
  submitLabel = 'See my chart',
  extra,
  submitDisabled,
}: BirthFormProps) {
  const id = useId();
  const [values, setValues] = useState<BirthFormValues>({ ...EMPTY, ...initial });
  const [errors, setErrors] = useState<BirthFormErrors>({});
  const set = <K extends keyof BirthFormValues>(k: K, v: BirthFormValues[K]) =>
    setValues((s) => ({ ...s, [k]: v }));

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const result = validateBirthForm(values);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    onSubmit(result.input, values.name.trim());
  }

  const timeUnknown = values.accuracy === 'unknown';

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <div>
        <label htmlFor={`${id}-name`} className="mb-1 block text-sm font-medium">
          {nameLabel} <span className="font-normal text-slate-500">(optional)</span>
        </label>
        <input
          id={`${id}-name`}
          type="text"
          autoComplete="given-name"
          value={values.name}
          onChange={(e) => set('name', e.target.value)}
          className="field"
        />
      </div>

      <div>
        <label htmlFor={`${id}-date`} className="mb-1 block text-sm font-medium">
          Birth date
        </label>
        <input
          id={`${id}-date`}
          type="date"
          min={MIN_DATE}
          max={MAX_DATE}
          value={values.date}
          onChange={(e) => set('date', e.target.value)}
          aria-invalid={!!errors.date}
          aria-describedby={errors.date ? `${id}-date-error` : undefined}
          className="field"
        />
        {errors.date && (
          <p id={`${id}-date-error`} className="mt-1 text-sm text-red-700 dark:text-red-400">
            {errors.date}
          </p>
        )}
      </div>

      <TimeAccuracySelector value={values.accuracy} onChange={(a) => set('accuracy', a)} />

      {timeUnknown ? (
        <p className="rounded-lg bg-slate-100 p-3 text-sm text-slate-700 dark:bg-dusk dark:text-slate-300">
          No problem — we'll calculate your Sun, Moon and planets for noon. Your Rising sign and
          houses need a birth time, so they won't be shown.
        </p>
      ) : (
        <div>
          <label htmlFor={`${id}-time`} className="mb-1 block text-sm font-medium">
            Birth time
          </label>
          <input
            id={`${id}-time`}
            type="time"
            value={values.time}
            onChange={(e) => set('time', e.target.value)}
            aria-invalid={!!errors.time}
            aria-describedby={errors.time ? `${id}-time-error` : undefined}
            className="field"
          />
          {errors.time && (
            <p id={`${id}-time-error`} className="mt-1 text-sm text-red-700 dark:text-red-400">
              {errors.time}
            </p>
          )}
        </div>
      )}

      <PlaceAutocomplete
        value={values.place}
        onChange={(p) => set('place', p)}
        error={errors.place}
      />

      {extra}

      <button
        type="submit"
        disabled={submitDisabled}
        className="min-h-12 w-full rounded-lg bg-ink px-4 py-3 font-semibold text-white hover:bg-dusk focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gold dark:text-ink dark:hover:bg-gold/90"
      >
        {submitLabel}
      </button>
    </form>
  );
}
