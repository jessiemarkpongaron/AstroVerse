import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { AspectsList } from '../components/AspectsList/AspectsList.tsx';
import {
  BigThreeCard,
  type BigThreeMeaning,
  type BigThreePoint,
} from '../components/BigThreeCard/BigThreeCard.tsx';
import { ChartWheel } from '../components/ChartWheel/ChartWheel.tsx';
import { PlacementsTable } from '../components/PlacementsTable/PlacementsTable.tsx';
import { SaveChartPanel } from '../components/SaveChart/SaveChartPanel.tsx';
import { ShortReading } from '../components/ShortReading/ShortReading.tsx';
import { SegmentedControl } from '../components/ui/SegmentedControl.tsx';
import { UncertaintyNotes } from '../components/ui/UncertaintyNotes.tsx';
import { buildChart } from '../lib/astro/chart.ts';
import { BirthInputError } from '../lib/astro/time.ts';
import type { Chart, HouseSystemChoice } from '../lib/astro/types.ts';
import type { ChartLocationState } from '../lib/chartState.ts';
import { isBigThreeCardFlag } from '../lib/flags.ts';
import { bigThreeEntry } from '../lib/interpret/staticText.ts';
import { buildShareUrl } from '../lib/shareLink.ts';
import { useBirthInput } from '../hooks/useBirthInput.ts';

const HOUSE_OPTIONS = [
  { value: 'placidus', label: 'Placidus' },
  { value: 'whole-sign', label: 'Whole Sign' },
] as const satisfies readonly { value: HouseSystemChoice; label: string }[];

function Section({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function ChartPage() {
  const { input, name, savedChartId, openSave } = useBirthInput();
  const [houseSystem, setHouseSystem] = useState<HouseSystemChoice>('placidus');
  const inputKey = input ? JSON.stringify(input) : '';
  const result = useMemo((): { chart: Chart } | { error: string } | null => {
    if (!input) return null;
    try {
      return { chart: buildChart(input, { houseSystem }) };
    } catch (e) {
      if (e instanceof BirthInputError) return { error: e.message };
      throw e;
    }
    // inputKey captures input by value (router state objects can change identity).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputKey, houseSystem]);
  const [copied, setCopied] = useState<'idle' | 'copied' | 'failed'>('idle');

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
  if ('error' in result) {
    return (
      <section className="space-y-4 text-center" role="alert">
        <h1 className="text-2xl font-bold">We couldn't read these birth details</h1>
        <p>{result.error}</p>
        <Link to="/" className="text-gold-dark underline dark:text-gold">
          Start again
        </Link>
      </section>
    );
  }

  const { chart } = result;
  const timeKnown = chart.houses !== null;
  const shareUrl = buildShareUrl(window.location.origin, chart.input);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied('copied');
    } catch {
      setCopied('failed');
    }
  }

  const fellBack = chart.houses?.system === 'porphyry';
  const meanings: Partial<Record<BigThreePoint, BigThreeMeaning>> = {};
  for (const [point, key] of [
    ['Sun', 'sun'],
    ['Moon', 'moon'],
    ['Ascendant', 'rising'],
  ] as const) {
    const p = chart.points.find((x) => x.name === point);
    if (p) meanings[point] = bigThreeEntry(key, p.sign);
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">
          {name ? `${name}'s Big Three` : 'Your Big Three'}
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          {chart.input.date}
          {chart.input.time ? ` · ${chart.input.time}` : ' · time unknown'}
          {chart.input.timeAccuracy === 'approximate' ? ' (approx.)' : ''} ·{' '}
          {chart.input.place.name}
        </p>
      </header>

      <BigThreeCard chart={chart} meanings={meanings} />

      <SaveChartPanel
        key={inputKey}
        input={chart.input}
        name={name}
        alreadySavedId={savedChartId}
        startOpen={openSave}
      />

      <UncertaintyNotes flags={chart.flags.filter((f) => !isBigThreeCardFlag(f))} />

      <Section title="Your short reading">
        <ShortReading chart={chart} />
        <Link
          to="/reading"
          state={{ input: chart.input, name, savedChartId } satisfies ChartLocationState}
          className="flex min-h-11 w-full items-center justify-center rounded-lg bg-ink px-4 py-2 font-semibold text-white sm:w-auto dark:bg-gold dark:text-ink"
        >
          Read your full reading
        </Link>
        <Link
          to="/forecast"
          state={{ input: chart.input, name, savedChartId } satisfies ChartLocationState}
          className="flex min-h-11 w-full items-center justify-center rounded-lg border border-gold px-4 py-2 font-semibold text-gold-dark sm:w-auto dark:text-gold"
        >
          See your next two years
        </Link>
        <Link
          to="/career"
          state={{ input: chart.input, name, savedChartId } satisfies ChartLocationState}
          className="flex min-h-11 w-full items-center justify-center rounded-lg border border-gold px-4 py-2 font-semibold text-gold-dark sm:w-auto dark:text-gold"
        >
          Your career reading
        </Link>
        <p className="text-xs text-slate-600 dark:text-slate-400">
          For entertainment and self-reflection. Not professional advice.
        </p>
      </Section>

      <Section
        title="Your chart wheel"
        action={
          timeKnown ? (
            <SegmentedControl
              label="House system"
              options={HOUSE_OPTIONS}
              value={houseSystem}
              onChange={setHouseSystem}
            />
          ) : null
        }
      >
        <ChartWheel chart={chart} />
        {fellBack && houseSystem === 'placidus' && (
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Showing Porphyry houses (see note above).
          </p>
        )}
      </Section>

      <Section title="Placements">
        <PlacementsTable points={chart.points} showHouses={timeKnown} />
      </Section>

      <Section title="Aspects">
        <AspectsList aspects={chart.aspects} />
      </Section>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={copyLink}
          className="min-h-11 rounded-lg border border-slate-300 px-4 py-2 font-medium dark:border-dusk"
        >
          Copy share link
        </button>
        <Link
          to="/"
          state={{ input: chart.input, name } satisfies ChartLocationState}
          className="flex min-h-11 items-center justify-center rounded-lg px-4 py-2 font-medium text-gold-dark underline dark:text-gold"
        >
          Edit birth details
        </Link>
      </div>
      <p role="status" aria-live="polite" className="text-sm">
        {copied === 'copied' &&
          'Link copied. It includes your birth date, time and place — share it only with people you trust.'}
        {copied === 'failed' && (
          <>
            Couldn't copy automatically. Your link: <span className="break-all">{shareUrl}</span>
          </>
        )}
      </p>
    </div>
  );
}
