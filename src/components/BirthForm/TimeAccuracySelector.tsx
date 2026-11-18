import type { TimeAccuracy } from '../../lib/astro/types.ts';

const OPTIONS: { value: TimeAccuracy; label: string; hint: string }[] = [
  { value: 'exact', label: 'Exact', hint: 'From a birth certificate or record' },
  { value: 'approximate', label: 'Approximate', hint: 'Within about 30 minutes' },
  { value: 'unknown', label: 'Unknown', hint: 'No Rising sign or houses' },
];

interface TimeAccuracySelectorProps {
  value: TimeAccuracy;
  onChange: (value: TimeAccuracy) => void;
}

export function TimeAccuracySelector({ value, onChange }: TimeAccuracySelectorProps) {
  return (
    <fieldset>
      <legend className="mb-1 text-sm font-medium">How sure are you of the time?</legend>
      <div className="grid grid-cols-3 gap-2">
        {OPTIONS.map((o) => (
          <label
            key={o.value}
            className={`flex min-h-11 cursor-pointer flex-col justify-center rounded-lg border px-2 py-2 text-center text-sm has-focus-visible:outline-2 has-focus-visible:outline-gold ${
              value === o.value
                ? 'border-gold-dark bg-gold/15 font-semibold dark:border-gold'
                : 'border-slate-300 dark:border-dusk'
            }`}
          >
            <input
              type="radio"
              name="time-accuracy"
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className="sr-only"
            />
            {o.label}
            <span className="mt-0.5 hidden text-xs font-normal text-slate-600 sm:block dark:text-slate-400">
              {o.hint}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
