import { useMemo, type ReactNode } from 'react';
import { Link } from 'react-router';
import { useBirthInput } from '../hooks/useBirthInput.ts';
import { buildChart } from '../lib/astro/chart.ts';
import { BirthInputError } from '../lib/astro/time.ts';
import { chartTransits } from '../lib/astro/transits.ts';
import type { ChartLocationState } from '../lib/chartState.ts';
import { formatDay, formatWindow } from '../lib/display.ts';
import { composeCareer, rulersIntro } from '../lib/interpret/career.ts';
import { buildForecast } from '../lib/interpret/forecast.ts';
import type { StaticReadingItem } from '../lib/interpret/staticReading.ts';

const chip =
  'rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-700 dark:bg-dusk dark:text-slate-200';
const ELEMENT_LABEL = { fire: 'Fire', earth: 'Earth', air: 'Air', water: 'Water' } as const;

function Item({ it }: { it: StaticReadingItem }) {
  return (
    <article className="space-y-1.5">
      <h3 className="font-medium text-gold-dark dark:text-gold">{it.placement}</h3>
      <p className="leading-relaxed">{it.entry.meaning}</p>
    </article>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={`career-${id}`} className="space-y-3">
      <h2 id={`career-${id}`} className="text-lg font-semibold">
        {title}
      </h2>
      {children}
    </section>
  );
}

/** Free career reading (PRD F6): direction, work style, strengths, paths and timing. */
export function CareerPage() {
  const { input, name, savedChartId } = useBirthInput();
  const inputKey = input ? JSON.stringify(input) : '';
  const today = new Date().toISOString().slice(0, 10);
  const result = useMemo(() => {
    if (!input) return null;
    try {
      const chart = buildChart(input);
      const forecast = buildForecast(
        chartTransits(chart, new Date(`${today}T00:00:00Z`)),
        chart.input.timeAccuracy,
      );
      return { chart, career: composeCareer(chart, forecast) };
    } catch (e) {
      if (e instanceof BirthInputError) return null;
      throw e;
    }
    // inputKey captures input by value (router state objects can change identity).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputKey, today]);

  if (!result) {
    return (
      <section className="space-y-4 text-center">
        <h1 className="text-2xl font-bold">No birth details yet</h1>
        <Link to="/start" className="text-gold-dark underline dark:text-gold">
          Enter your birth details
        </Link>
      </section>
    );
  }

  const { chart, career } = result;
  const back: ChartLocationState = { input: chart.input, name, savedChartId };
  const timeKnown = chart.houses !== null;

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">
          {name ? `${name}’s career reading` : 'Your career reading'}
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Ideas to reflect on, not instructions. The right path is the one that fits your life.
        </p>
        {!timeKnown && (
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Without a birth time, your Midheaven, career houses and timing are left out.
          </p>
        )}
      </header>

      {career.direction.length > 0 && (
        <Section id="direction" title="Your career direction">
          {career.direction.map((it) => (
            <Item key={it.key} it={it} />
          ))}
        </Section>
      )}

      {career.rulers.length > 0 && (
        <Section id="rulers" title="Where your career energy flows">
          <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            {rulersIntro()}
          </p>
          {career.rulers.map((r) => (
            <article key={r.house} className="space-y-1.5">
              <h3 className="font-medium text-gold-dark dark:text-gold">{r.placement}</h3>
              <p className="leading-relaxed">{r.text}</p>
            </article>
          ))}
          {chart.input.timeAccuracy === 'approximate' && (
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Your birth time is approximate, so these house rulers may differ.
            </p>
          )}
        </Section>
      )}

      <Section id="style" title="How you work">
        {career.workStyle && <p className="leading-relaxed">{career.workStyle}</p>}
        <ul aria-label="Element balance" className="flex flex-wrap gap-1.5">
          {career.elements.map((e) => (
            <li key={e.element} className={chip}>
              {ELEMENT_LABEL[e.element]} {e.count}
            </li>
          ))}
        </ul>
        {career.howYouWork.map((it) => (
          <Item key={it.key} it={it} />
        ))}
      </Section>

      {career.strengths.length > 0 && (
        <Section id="strengths" title="Your strengths at work">
          <ul className="flex flex-wrap gap-1.5">
            {career.strengths.map((s) => (
              <li key={s} className={chip}>
                {s}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {career.paths.length > 0 && (
        <Section id="paths" title="Paths that may suit you">
          <ul className="space-y-3">
            {career.paths.map((p) => (
              <li key={p.title}>
                <p className="font-medium">{p.title}</p>
                <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                  {p.why}
                </p>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {career.timing.length > 0 && (
        <Section id="timing" title="Timing in the next two years">
          <ul className="space-y-3">
            {career.timing.map((p) => (
              <li key={p.key} className="space-y-1">
                <p className="font-medium">{p.title}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {formatWindow(p.window)}
                  {p.window.exactDates.length > 0 &&
                    ` · exact ${p.window.exactDates.map(formatDay).join(', ')}`}
                </p>
                {p.howToUseIt && <p className="text-sm">{p.howToUseIt}</p>}
              </li>
            ))}
          </ul>
          <Link
            to="/forecast"
            state={back}
            className="text-sm text-gold-dark underline dark:text-gold"
          >
            See the full forecast
          </Link>
        </Section>
      )}

      <p className="border-t border-slate-200 pt-4 text-xs text-slate-600 dark:border-dusk dark:text-slate-400">
        For entertainment and self-reflection. Not career, financial or professional advice.
      </p>

      <nav aria-label="Career links" className="flex flex-wrap gap-4 text-sm">
        <Link to="/chart" state={back} className="text-gold-dark underline dark:text-gold">
          Back to the chart
        </Link>
        <Link to="/reading" state={back} className="text-gold-dark underline dark:text-gold">
          Full reading
        </Link>
      </nav>
    </div>
  );
}
