interface SegmentedControlProps<T extends string> {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex rounded-lg bg-slate-100 p-1 dark:bg-dusk"
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`min-h-10 rounded-md px-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-gold ${
            value === o.value
              ? 'bg-white shadow-sm dark:bg-ink'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
