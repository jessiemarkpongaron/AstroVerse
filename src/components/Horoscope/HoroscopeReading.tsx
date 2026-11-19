import { DateTime } from 'luxon';
import { useMemo } from 'react';
import { dailySky, todayIn, weeklySky } from '../../lib/astro/horoscope.ts';
import type { SignIndex } from '../../lib/astro/types.ts';
import { ordinal } from '../../lib/astro/uncertainty.ts';
import { SIGN_NAMES } from '../../lib/astro/zodiac.ts';
import { composeDaily, composeWeekly } from '../../lib/interpret/horoscope.ts';

const fmt = (iso: string, f: string) => DateTime.fromISO(iso).toFormat(f);

/**
 * Today's and this week's horoscope for one sign. Loaded lazily (it carries the astronomy
 * engine) and computed on the device for today's Philippine date, so it is never stale.
 */
export function HoroscopeReading({ sign }: { sign: SignIndex }) {
  const today = todayIn();
  const { daily, weekly } = useMemo(
    () => ({
      daily: composeDaily(sign, dailySky(today)),
      weekly: composeWeekly(sign, weeklySky(today)),
    }),
    [sign, today],
  );
  const name = SIGN_NAMES[sign];

  return (
    <>
      <section aria-labelledby="horoscope-today" className="space-y-3">
        <h2 id="horoscope-today" className="text-lg font-semibold">
          Today · {fmt(today, 'EEEE, MMMM d')}
        </h2>
        {daily.focus && <p className="leading-relaxed">{daily.focus}</p>}
        {daily.phase && <p className="leading-relaxed">{daily.phase}</p>}
        {daily.change && <p className="leading-relaxed">{daily.change}</p>}
        <p className="text-xs text-slate-600 dark:text-slate-400">
          The Moon is in {SIGN_NAMES[daily.moonSign]}, the {ordinal(daily.moonHouse)} house counted
          from {name}.
        </p>
      </section>

      <section aria-labelledby="horoscope-week" className="space-y-3">
        <h2 id="horoscope-week" className="text-lg font-semibold">
          This week · {fmt(weekly.start, 'MMM d')} – {fmt(weekly.end, 'MMM d')}
        </h2>
        {weekly.items.map((it) => (
          <article key={it.key} className="space-y-1">
            <h3 className="font-medium text-gold-dark dark:text-gold">{it.title}</h3>
            {it.text && <p className="leading-relaxed">{it.text}</p>}
          </article>
        ))}
      </section>
    </>
  );
}
