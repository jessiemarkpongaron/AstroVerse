import type { UncertaintyFlag } from '../../lib/astro/types.ts';

interface UncertaintyNotesProps {
  flags: readonly UncertaintyFlag[];
}

/** Chart-wide notes shown openly; per-point timing notes grouped behind a disclosure. */
export function UncertaintyNotes({ flags }: UncertaintyNotesProps) {
  if (flags.length === 0) return null;
  const general = flags.filter((f) => f.point === null);
  const timing = flags.filter((f) => f.kind === 'house-cusp');
  const signs = flags.filter((f) => f.point !== null && f.kind !== 'house-cusp');
  return (
    <div className="space-y-2 text-sm">
      {general.map((f, i) => (
        <p
          key={`g${i}`}
          className="rounded-xl bg-amber-50 p-3 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100"
        >
          {f.message}
        </p>
      ))}
      {(signs.length > 0 || timing.length > 0) && (
        <details className="rounded-xl bg-slate-50 p-3 dark:bg-dusk/60">
          <summary className="cursor-pointer font-medium">
            Depends on exact birth time or sign edges ({signs.length + timing.length})
          </summary>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-700 dark:text-slate-300">
            {[...signs, ...timing].map((f, i) => (
              <li key={i}>{f.message}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
