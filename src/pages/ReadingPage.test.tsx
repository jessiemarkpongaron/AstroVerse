// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useLocation } from 'react-router';
import { SECTION_TITLES } from '../../supabase/functions/_shared/reading.ts';
import { sampleReading } from '../../supabase/functions/_shared/readingFixtures.ts';
import type { ChartRow } from '../lib/charts.ts';
import { ReadingError } from '../lib/readings.ts';
import { renderApp, signedIn, signedOut } from '../test/fakeAuth.tsx';

const charts = vi.hoisted(() => ({ getChart: vi.fn(), listCharts: vi.fn() }));
vi.mock('../lib/charts.ts', async (orig) => ({
  ...(await orig<typeof import('../lib/charts.ts')>()),
  ...charts,
}));
const readings = vi.hoisted(() => ({ findCachedReading: vi.fn(), requestNatalReading: vi.fn() }));
vi.mock('../lib/readings.ts', async (orig) => ({
  ...(await orig<typeof import('../lib/readings.ts')>()),
  ...readings,
}));

const row: ChartRow = {
  id: 'chart-1',
  user_id: 'user-1',
  label: 'Mama',
  birth_date: '1990-05-31',
  birth_time: '15:30:00',
  time_accuracy: 'exact',
  place_name: 'Carrascal, Surigao del Sur, Philippines',
  lat: 9.37028,
  lon: 125.94917,
  tz: 'Asia/Manila',
  is_self: false,
  consent_confirmed: true,
  created_at: '2026-11-18T00:00:00Z',
};

const loaded = { reading: sampleReading(), createdAt: '2026-11-18T00:00:00Z', cached: false };

function Where() {
  return <output data-testid="where">{useLocation().pathname}</output>;
}

beforeEach(() => {
  vi.clearAllMocks();
  // The AI reading route exists only when the owner turns it on.
  vi.stubEnv('VITE_AI_READINGS', 'true');
  charts.getChart.mockResolvedValue(row);
  readings.findCachedReading.mockResolvedValue(null);
});

const open = (auth = signedIn()) => render(renderApp(auth, '/charts/chart-1/reading', <Where />));

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('ReadingPage (AI)', () => {
  it('is not routed while AI readings are switched off', async () => {
    vi.stubEnv('VITE_AI_READINGS', '');
    open();
    expect(await screen.findByRole('heading', { name: /not found/i })).toBeInTheDocument();
    expect(charts.getChart).not.toHaveBeenCalled();
  });

  it('sends signed-out visitors to sign in', async () => {
    open(signedOut());
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/login'));
  });

  it('shows a cached reading straight away, without asking for a new one', async () => {
    readings.findCachedReading.mockResolvedValue({ ...loaded, cached: true });
    open();
    expect(await screen.findByRole('heading', { name: 'Mama’s full reading' })).toBeInTheDocument();
    expect(await screen.findByRole('region', { name: 'Summary' })).toHaveTextContent(
      /curious, quick and warm/,
    );
    for (const title of Object.values(SECTION_TITLES)) {
      expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
    }
    expect(screen.getAllByRole('list', { name: 'Based on' })).toHaveLength(8);
    expect(screen.getByText(/Not professional advice/)).toBeInTheDocument();
    expect(readings.requestNatalReading).not.toHaveBeenCalled();
  });

  it('offers to write a reading, shows progress, then the reading', async () => {
    let resolve: (v: typeof loaded) => void = () => {};
    readings.requestNatalReading.mockReturnValue(new Promise((r) => (resolve = r)));
    open();
    fireEvent.click(await screen.findByRole('button', { name: 'Write my reading' }));

    const writing = screen.getByRole('region', { name: 'Writing your reading' });
    expect(writing).toHaveAttribute('aria-busy', 'true');
    expect(within(writing).getByRole('status')).toHaveTextContent(/Writing your reading/);

    const [, chartId, payload] = readings.requestNatalReading.mock.calls[0] as [
      unknown,
      string,
      unknown,
    ];
    expect(chartId).toBe('chart-1');
    // Only placements leave the browser — no name, date, time or place.
    const sent = JSON.stringify(payload);
    for (const s of ['Mama', '1990', '15:30', 'Carrascal']) expect(sent).not.toContain(s);
    expect(sent).toContain('"kind":"natal"');

    resolve(loaded);
    expect(
      await screen.findByRole('heading', { name: 'Love & Relationships' }),
    ).toBeInTheDocument();
  });

  it('explains the daily limit without a retry button', async () => {
    readings.requestNatalReading.mockRejectedValue(
      new ReadingError('rate-limited', 'You’ve reached today’s limit of 20 new readings.'),
    );
    open();
    fireEvent.click(await screen.findByRole('button', { name: 'Write my reading' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/today’s limit/);
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
  });

  it('lets the user retry after a failure', async () => {
    readings.requestNatalReading
      .mockRejectedValueOnce(
        new ReadingError('generation-failed', 'We couldn’t write your reading this time.'),
      )
      .mockResolvedValueOnce(loaded);
    open();
    fireEvent.click(await screen.findByRole('button', { name: 'Write my reading' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { name: 'Life Lessons' })).toBeInTheDocument();
    expect(readings.requestNatalReading).toHaveBeenCalledTimes(2);
  });

  it('mentions what an unknown birth time leaves out', async () => {
    charts.getChart.mockResolvedValue({ ...row, birth_time: null, time_accuracy: 'unknown' });
    open();
    expect(await screen.findByText(/leaves out your Rising sign and houses/)).toBeInTheDocument();
  });

  it('says so when the chart is not in the account', async () => {
    charts.getChart.mockResolvedValue(null);
    open();
    expect(await screen.findByRole('heading', { name: 'Chart not found' })).toBeInTheDocument();
  });

  it('links back to the chart and My charts', async () => {
    open();
    const nav = await screen.findByRole('navigation', { name: 'Reading links' });
    fireEvent.click(within(nav).getByRole('link', { name: 'View the chart' }));
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/chart'));
  });
});
