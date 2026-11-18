import { SECTION_TITLES, type NatalReading } from '../../../supabase/functions/_shared/reading.ts';

const paragraphs = (text: string) =>
  text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

/** A natal reading: summary card, then one section per theme with its key placements. */
export function ReadingView({ reading }: { reading: NatalReading }) {
  return (
    <article className="space-y-8">
      <section
        aria-label="Summary"
        className="rounded-2xl border border-gold/40 bg-gold/10 p-4 text-base leading-relaxed"
      >
        {paragraphs(reading.summary).map((p, i) => (
          <p key={i} className={i > 0 ? 'mt-3' : undefined}>
            {p}
          </p>
        ))}
      </section>

      {reading.sections.map((s) => (
        <section key={s.id} aria-labelledby={`reading-${s.id}`} className="space-y-3">
          <h2 id={`reading-${s.id}`} className="text-lg font-semibold">
            {SECTION_TITLES[s.id]}
          </h2>
          {s.keyPlacements.length > 0 && (
            <ul aria-label="Based on" className="flex flex-wrap gap-1.5">
              {s.keyPlacements.map((k) => (
                <li
                  key={k}
                  className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-700 dark:bg-dusk dark:text-slate-200"
                >
                  {k}
                </li>
              ))}
            </ul>
          )}
          <div className="space-y-3 leading-relaxed">
            {paragraphs(s.body).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </section>
      ))}

      <p className="border-t border-slate-200 pt-4 text-xs text-slate-600 dark:border-dusk dark:text-slate-400">
        For entertainment and self-reflection. Not professional advice.
      </p>
    </article>
  );
}

/** Placeholder blocks shown while a reading is being written. */
export function ReadingSkeleton() {
  return (
    <div aria-hidden="true" className="animate-pulse space-y-8">
      <div className="h-24 rounded-2xl bg-slate-200 dark:bg-dusk" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="space-y-3">
          <div className="h-5 w-1/2 rounded bg-slate-200 dark:bg-dusk" />
          <div className="h-3 rounded bg-slate-200 dark:bg-dusk" />
          <div className="h-3 rounded bg-slate-200 dark:bg-dusk" />
          <div className="h-3 w-4/5 rounded bg-slate-200 dark:bg-dusk" />
        </div>
      ))}
    </div>
  );
}
