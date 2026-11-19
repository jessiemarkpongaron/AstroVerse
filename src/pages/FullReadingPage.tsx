import { useMemo } from 'react';
import { Link } from 'react-router';
import { useBirthInput } from '../hooks/useBirthInput.ts';
import { buildChart } from '../lib/astro/chart.ts';
import { BirthInputError } from '../lib/astro/time.ts';
import type { ChartLocationState } from '../lib/chartState.ts';
import { aiReadingsEnabled } from '../lib/features.ts';
import { composeStaticReading } from '../lib/interpret/staticReading.ts';

const chip =
  'rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-700 dark:bg-dusk dark:text-slate-200';

/**
 * Free full reading (PRD F4, static layer): themed sections built from approved static text.
 * Runs entirely in the browser; nothing is sent anywhere.
 */
export function FullReadingPage() {
  const { input, name, savedChartId } = useBirthInput();
  const inputKey = input ? JSON.stringify(input) : '';
  const result = useMemo(() => {
    if (!input) return null;
    try {
      const chart = buildChart(input);
      return { chart, sections: composeStaticReading(chart) };
    } catch (e) {
      if (e instanceof BirthInputError) return { error: e.message };
      throw e;
    }
    // inputKey captures input by value (router state objects can change identity).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputKey]);

  if (!result || 'error' in result) {
    return (
      <section className="space-y-4 text-center">
        <h1 className="text-2xl font-bold">No birth details yet</h1>
        <Link to="/" className="text-gold-dark underline dark:text-gold">
          Enter your birth details
        </Link>
      </section>
    );
  }

  const { chart, sections } = result;
  const back: ChartLocationState = { input: chart.input, name, savedChartId };
  const timeKnown = chart.houses !== null;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">
          {name ? `${name}’s full reading` : 'Your full reading'}
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          {chart.input.date}
          {chart.input.time ? ` · ${chart.input.time}` : ' · time unknown'}
          {chart.input.timeAccuracy === 'approximate' ? ' (approx.)' : ''} ·{' '}
          {chart.input.place.name}
        </p>
        {!timeKnown && (
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Without a birth time, this reading leaves out your Rising sign and houses.
          </p>
        )}
      </header>

      {sections.map((s) => (
        <section key={s.id} aria-labelledby={`static-${s.id}`} className="space-y-4">
          <h2 id={`static-${s.id}`} className="text-lg font-semibold">
            {s.title}
          </h2>
          {s.items.map((it) => (
            <article key={it.key} className="space-y-2">
              <h3 className="font-medium text-gold-dark dark:text-gold">{it.placement}</h3>
              <p className="leading-relaxed">{it.entry.meaning}</p>
              <dl className="grid gap-1 text-sm sm:grid-cols-[auto_1fr] sm:gap-x-3">
                <dt className="font-medium">Strengths</dt>
                <dd className="text-slate-700 dark:text-slate-300">
                  {it.entry.strengths.join(' · ')}
                </dd>
                <dt className="font-medium">Watch for</dt>
                <dd className="text-slate-700 dark:text-slate-300">
                  {it.entry.challenges.join(' · ')}
                </dd>
              </dl>
              <ul aria-label="Keywords" className="flex flex-wrap gap-1.5">
                {it.entry.keywords.map((k) => (
                  <li key={k} className={chip}>
                    {k}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </section>
      ))}

      {aiReadingsEnabled() && savedChartId && (
        <section className="space-y-2 rounded-2xl border border-gold/40 bg-gold/10 p-4">
          <h2 className="font-semibold">Want it written just for you?</h2>
          <p className="text-sm">
            An AI-written reading weaves your whole chart into one personal story.
          </p>
          <Link
            to={`/charts/${savedChartId}/reading`}
            className="inline-flex min-h-11 items-center rounded-lg bg-ink px-4 font-semibold text-white dark:bg-gold dark:text-ink"
          >
            Get the AI reading
          </Link>
        </section>
      )}

      <p className="text-sm text-slate-600 dark:text-slate-400">
        Enjoyed your reading? AstroVerse is free.{' '}
        <Link to="/support" className="text-gold-dark underline dark:text-gold">
          Support it with a tip
        </Link>
      </p>

      <p className="border-t border-slate-200 pt-4 text-xs text-slate-600 dark:border-dusk dark:text-slate-400">
        For entertainment and self-reflection. Not professional advice.
      </p>

      <nav aria-label="Reading links" className="flex flex-wrap gap-4 text-sm">
        <Link to="/chart" state={back} className="text-gold-dark underline dark:text-gold">
          Back to the chart
        </Link>
        <Link to="/forecast" state={back} className="text-gold-dark underline dark:text-gold">
          Your next two years
        </Link>
        <Link to="/career" state={back} className="text-gold-dark underline dark:text-gold">
          Career reading
        </Link>
      </nav>
    </div>
  );
}
