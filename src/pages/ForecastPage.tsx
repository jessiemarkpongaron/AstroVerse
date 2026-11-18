import { useMemo } from 'react';
import { Link } from 'react-router';
import { useBirthInput } from '../hooks/useBirthInput.ts';
import { buildChart } from '../lib/astro/chart.ts';
import { BirthInputError } from '../lib/astro/time.ts';
import { chartTransits } from '../lib/astro/transits.ts';
import type { ChartLocationState } from '../lib/chartState.ts';
import { formatDay, formatWindow } from '../lib/display.ts';
import { THEME_TITLES, buildForecast, type ForecastPeriod } from '../lib/interpret/forecast.ts';

const DISCLAIMER =
  'Transits describe themes and timing, not fixed events. Your choices shape what happens.';

function Period({ p }: { p: ForecastPeriod }) {
  const w = p.window;
  return (
    <article className="space-y-1.5 rounded-xl border border-slate-200 p-4 dark:border-dusk">
      <h3 className="font-semibold">{p.title}</h3>
      <p className="text-sm text-slate-600 dark:text-slate-400">
        {formatWindow(w)}
        {w.exactDates.length > 0 && <> · exact {w.exactDates.map(formatDay).join(', ')}</>}
      </p>
      {p.meaning && <p className="leading-relaxed">{p.meaning}</p>}
      {p.howToUseIt && (
        <p className="text-sm">
          <span className="font-medium">How to use this time: </span>
          {p.howToUseIt}
        </p>
      )}
      {p.timeSensitive && (
        <p className="text-xs text-slate-600 dark:text-slate-400">
          Depends on your exact birth time, so the dates may shift.
        </p>
      )}
    </article>
  );
}

/** Free 2-year forecast (PRD F5): transit periods grouped by theme. Runs in the browser. */
export function ForecastPage() {
  const { input, name, savedChartId } = useBirthInput();
  const inputKey = input ? JSON.stringify(input) : '';
  const today = new Date().toISOString().slice(0, 10);
  const result = useMemo(() => {
    if (!input) return null;
    try {
      const chart = buildChart(input);
      const scan = chartTransits(chart, new Date(`${today}T00:00:00Z`));
      return { chart, forecast: buildForecast(scan, chart.input.timeAccuracy) };
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
        <Link to="/" className="text-gold-dark underline dark:text-gold">
          Enter your birth details
        </Link>
      </section>
    );
  }

  const { chart, forecast } = result;
  const back: ChartLocationState = { input: chart.input, name, savedChartId };
  const timeKnown = chart.houses !== null;

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">
          {name ? `${name}’s next two years` : 'Your next two years'}
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {formatDay(forecast.start)} – {formatDay(forecast.end)} · slow-moving planets (Jupiter to
          Pluto) and the points in your chart they touch.
        </p>
        {!timeKnown && (
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Without a birth time, transits to your Moon, Rising and Midheaven, and house changes,
            are left out.
          </p>
        )}
        <p className="text-sm font-medium">{DISCLAIMER}</p>
      </header>

      {forecast.now.length > 0 && (
        <section aria-labelledby="forecast-now" className="space-y-3">
          <h2 id="forecast-now" className="text-lg font-semibold">
            Happening now
          </h2>
          <ul className="space-y-1 text-sm">
            {forecast.now.map((p) => (
              <li key={p.key}>
                <span className="font-medium">{p.title}</span>
                <span className="text-slate-600 dark:text-slate-400">
                  {' '}
                  · {THEME_TITLES[p.theme]} ·{' '}
                  {p.window.endsAfterScan ? 'ongoing' : `until ${formatDay(p.window.end)}`}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {forecast.themes.map((t) => (
        <section key={t.theme} aria-labelledby={`forecast-${t.theme}`} className="space-y-3">
          <h2 id={`forecast-${t.theme}`} className="text-lg font-semibold">
            {t.title}
          </h2>
          {t.periods.map((p) => (
            <Period key={p.key} p={p} />
          ))}
        </section>
      ))}

      {forecast.ingresses.length > 0 && (
        <section aria-labelledby="forecast-houses" className="space-y-3">
          <h2 id="forecast-houses" className="text-lg font-semibold">
            Planets changing house
          </h2>
          <ul className="space-y-2">
            {forecast.ingresses.map((i) => (
              <li key={i.key} className="text-sm leading-relaxed">
                <span className="font-medium">{formatDay(i.ingress.date)}: </span>
                {i.text ??
                  `${i.ingress.body} ${i.ingress.retrograde ? 'moves back into' : 'moves into'} house ${i.ingress.house}.`}
              </li>
            ))}
          </ul>
        </section>
      )}

      {forecast.themes.length === 0 && (
        <p className="text-sm">No major transits in this period — a quieter stretch.</p>
      )}

      <p className="border-t border-slate-200 pt-4 text-xs text-slate-600 dark:border-dusk dark:text-slate-400">
        {DISCLAIMER} For entertainment and self-reflection. Not professional advice.
      </p>

      <nav aria-label="Forecast links" className="flex flex-wrap gap-4 text-sm">
        <Link to="/chart" state={back} className="text-gold-dark underline dark:text-gold">
          Back to the chart
        </Link>
        <Link to="/reading" state={back} className="text-gold-dark underline dark:text-gold">
          Full reading
        </Link>
        <Link to="/career" state={back} className="text-gold-dark underline dark:text-gold">
          Career reading
        </Link>
      </nav>
    </div>
  );
}
