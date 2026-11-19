import { useEffect, useId, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { BirthForm } from '../components/BirthForm/BirthForm.tsx';
import { useAuth } from '../hooks/useAuth.ts';
import { useBirthInput } from '../hooks/useBirthInput.ts';
import { buildChart } from '../lib/astro/chart.ts';
import { compareCharts } from '../lib/astro/synastry.ts';
import type { BirthInput } from '../lib/astro/types.ts';
import type { ChartLocationState } from '../lib/chartState.ts';
import { listCharts, rowToBirthInput, type ChartRow } from '../lib/charts.ts';
import { STRENGTH_LABEL, composeCompatibility } from '../lib/interpret/synastry.ts';

interface Partner {
  input: BirthInput;
  name: string;
}

/** Saved charts the signed-in user can compare with (all have consent or are their own). */
function SavedPartnerPicker({
  excludeId,
  onPick,
}: {
  excludeId: string | undefined;
  onPick: (p: Partner) => void;
}) {
  const auth = useAuth();
  const client = auth.status === 'signed-in' ? auth.client : null;
  const [rows, setRows] = useState<ChartRow[]>([]);
  useEffect(() => {
    if (!client) return;
    let cancelled = false;
    listCharts(client)
      .then((r) => {
        if (!cancelled) setRows(r.filter((x) => x.id !== excludeId));
      })
      .catch(() => {
        // Saved charts are optional here; the form below still works.
      });
    return () => {
      cancelled = true;
    };
  }, [client, excludeId]);

  if (rows.length === 0) return null;
  return (
    <section aria-labelledby="pick-saved" className="space-y-2">
      <h2 id="pick-saved" className="font-semibold">
        Compare with a saved chart
      </h2>
      <ul className="flex flex-wrap gap-2">
        {rows.map((r) => (
          <li key={r.id}>
            <button
              type="button"
              onClick={() =>
                onPick({ input: rowToBirthInput(r), name: r.is_self ? 'Me' : r.label })
              }
              className="min-h-11 rounded-lg border border-slate-300 px-4 dark:border-dusk"
            >
              {r.label}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Compatibility (PRD F7): the reader's chart compared with another person's. Everything runs in
 * the browser; the other person's details are kept only in memory and never saved here.
 */
export function CompatibilityPage() {
  const { input, name, savedChartId } = useBirthInput();
  const consentId = useId();
  const [consent, setConsent] = useState(false);
  const [partner, setPartner] = useState<Partner | null>(null);

  const inputKey = input ? JSON.stringify(input) : '';
  const partnerKey = partner ? JSON.stringify(partner) : '';
  const result = useMemo(() => {
    if (!input || !partner) return null;
    const syn = compareCharts(buildChart(input), buildChart(partner.input));
    return { syn, reading: composeCompatibility(syn, partner.name) };
    // Keys capture inputs by value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputKey, partnerKey]);

  if (!input) {
    return (
      <section className="space-y-4 text-center">
        <h1 className="text-2xl font-bold">Start with your own chart</h1>
        <Link to="/start" className="text-gold-dark underline dark:text-gold">
          Enter your birth details
        </Link>
      </section>
    );
  }

  const back: ChartLocationState = { input, name, savedChartId };
  const me = name || 'You';

  if (!partner || !result) {
    return (
      <div className="space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Compatibility</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Compare {name ? `${name}’s` : 'your'} chart with someone else’s. Nothing is sent or
            saved: the comparison happens on this device.
          </p>
        </header>

        <SavedPartnerPicker excludeId={savedChartId} onPick={setPartner} />

        <section aria-labelledby="enter-partner" className="space-y-3">
          <h2 id="enter-partner" className="font-semibold">
            Enter their birth details
          </h2>
          <BirthForm
            nameLabel="Their name"
            submitLabel="Compare charts"
            submitDisabled={!consent}
            onSubmit={(i, n) => setPartner({ input: i, name: n })}
            extra={
              <div className="flex items-start gap-2">
                <input
                  id={consentId}
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-1 h-5 w-5"
                />
                <label htmlFor={consentId} className="text-sm">
                  I have this person’s permission to use their birth details.
                </label>
              </div>
            }
          />
        </section>

        <Link to="/chart" state={back} className="text-sm text-gold-dark underline dark:text-gold">
          Back to the chart
        </Link>
      </div>
    );
  }

  const { syn, reading } = result;
  const them = partner.name || 'them';
  const leftOut = [
    syn.leftOut.first.length > 0 && `${me === 'You' ? 'your' : `${me}’s`} Moon and Rising`,
    syn.leftOut.second.length > 0 &&
      `${partner.name ? `${partner.name}’s` : 'their'} Moon and Rising`,
  ].filter(Boolean);

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">
          {me} &amp; {partner.name || 'them'}
        </h1>
        {reading.intro && <p className="leading-relaxed">{reading.intro}</p>}
        {leftOut.length > 0 && (
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Without a birth time, {leftOut.join(' and ')} are left out.
          </p>
        )}
        {name && (
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Written for {name}: “you” is {name}, “they” is {them}.
          </p>
        )}
      </header>

      <ul aria-label="Overview" className="grid grid-cols-3 gap-2 text-center">
        {reading.bands.map((b) => (
          <li key={b.band} className="rounded-xl border border-slate-200 p-3 dark:border-dusk">
            <p className="text-xs text-slate-600 dark:text-slate-400">{b.title}</p>
            <p className="font-semibold">{STRENGTH_LABEL[b.strength]}</p>
          </li>
        ))}
      </ul>

      {reading.bands.map((b) => (
        <section key={b.band} aria-labelledby={`band-${b.band}`} className="space-y-3">
          <h2 id={`band-${b.band}`} className="text-lg font-semibold">
            {b.title} · {STRENGTH_LABEL[b.strength]}
          </h2>
          {b.description && (
            <p className="text-sm text-slate-600 dark:text-slate-400">{b.description}</p>
          )}
          {b.items.length === 0 && <p className="text-sm">No close contacts here.</p>}
          {b.items.map((it) => (
            <article key={it.key} className="space-y-1">
              <h3 className="font-medium text-gold-dark dark:text-gold">{it.title}</h3>
              {it.text && <p className="leading-relaxed">{it.text}</p>}
            </article>
          ))}
          {b.more > 0 && (
            <p className="text-xs text-slate-600 dark:text-slate-400">
              …and {b.more} more, smaller contact{b.more === 1 ? '' : 's'}.
            </p>
          )}
        </section>
      ))}

      {reading.respect && <p className="font-medium">{reading.respect}</p>}

      <p className="border-t border-slate-200 pt-4 text-xs text-slate-600 dark:border-dusk dark:text-slate-400">
        For entertainment and self-reflection. Not relationship, psychological or professional
        advice.
      </p>

      <nav aria-label="Compatibility links" className="flex flex-wrap gap-4 text-sm">
        <button
          type="button"
          onClick={() => {
            setPartner(null);
            setConsent(false);
          }}
          className="text-gold-dark underline dark:text-gold"
        >
          Compare with someone else
        </button>
        <Link to="/chart" state={back} className="text-gold-dark underline dark:text-gold">
          Back to the chart
        </Link>
      </nav>
    </div>
  );
}
