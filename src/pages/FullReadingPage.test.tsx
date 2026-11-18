// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useLocation } from 'react-router';
import type { BirthInput } from '../lib/astro/types.ts';
import type { ChartRow } from '../lib/charts.ts';
import { encodeBirthHash } from '../lib/shareLink.ts';
import { renderApp, signedIn, signedOut } from '../test/fakeAuth.tsx';

const charts = vi.hoisted(() => ({ listCharts: vi.fn() }));
vi.mock('../lib/charts.ts', async (orig) => ({
  ...(await orig<typeof import('../lib/charts.ts')>()),
  ...charts,
}));

const input: BirthInput = {
  date: '1990-05-31',
  time: '15:30',
  timeAccuracy: 'exact',
  place: {
    name: 'Carrascal, Surigao del Sur, Philippines',
    lat: 9.37028,
    lon: 125.94917,
    tz: 'Asia/Manila',
  },
};

const row: ChartRow = {
  id: 'chart-1',
  user_id: 'user-1',
  label: 'Mama',
  birth_date: '1990-05-31',
  birth_time: '15:30:00',
  time_accuracy: 'exact',
  place_name: input.place.name,
  lat: 9.37028,
  lon: 125.94917,
  tz: 'Asia/Manila',
  is_self: false,
  consent_confirmed: true,
  created_at: '2026-11-18T00:00:00Z',
};

function Where() {
  return <output data-testid="where">{useLocation().pathname}</output>;
}

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.unstubAllEnvs());

describe('FullReadingPage (free, static text)', () => {
  it('works signed out, with no network, from the chart page link', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    render(renderApp(signedOut(), { pathname: '/chart', state: { input, name: '' } }, <Where />));
    fireEvent.click(await screen.findByRole('link', { name: 'Read your full reading' }));
    expect(await screen.findByRole('heading', { name: 'Your full reading' })).toBeInTheDocument();
    expect(screen.getByTestId('where')).toHaveTextContent('/reading');
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('shows themed sections built from the chart’s placements', async () => {
    render(renderApp(signedOut(), { pathname: '/reading', state: { input, name: 'Mama' } }));
    expect(await screen.findByRole('heading', { name: 'Mama’s full reading' })).toBeInTheDocument();
    const personality = screen.getByRole('region', { name: 'Personality' });
    expect(within(personality).getByRole('heading', { name: 'Sun in Gemini' })).toBeInTheDocument();
    expect(
      within(personality).getByRole('heading', { name: 'Scorpio Rising' }),
    ).toBeInTheDocument();
    const mind = screen.getByRole('region', { name: 'Mind & Communication' });
    expect(within(mind).getByText(/think things through slowly/)).toBeInTheDocument();
    // Sign and house paragraphs for Mercury, each with strengths.
    expect(
      within(mind).getByRole('heading', { name: /^Mercury in the \d+(st|nd|rd|th) house$/ }),
    ).toBeInTheDocument();
    expect(within(mind).getAllByText('Strengths')).toHaveLength(2);
    expect(screen.getByRole('region', { name: 'Life Lessons' })).toHaveTextContent(
      /Pluto in Scorpio/,
    );
    expect(screen.getByText(/Not professional advice/)).toBeInTheDocument();
  });

  it('opens from a share link too', async () => {
    render(renderApp(signedOut(), { pathname: '/reading', hash: `#${encodeBirthHash(input)}` }));
    expect(await screen.findByRole('heading', { name: 'Your full reading' })).toBeInTheDocument();
  });

  it('says what an unknown birth time leaves out', async () => {
    render(
      renderApp(signedOut(), {
        pathname: '/reading',
        state: { input: { ...input, time: null, timeAccuracy: 'unknown' }, name: '' },
      }),
    );
    expect(await screen.findByText(/leaves out your Rising sign and houses/)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Rising/ })).not.toBeInTheDocument();
  });

  it('asks for birth details when opened directly', async () => {
    render(renderApp(signedOut(), '/reading'));
    expect(
      await screen.findByRole('heading', { name: 'No birth details yet' }),
    ).toBeInTheDocument();
  });

  it('hides the AI upsell unless AI readings are switched on', async () => {
    const state = { input, name: '', savedChartId: 'chart-1' };
    const { unmount } = render(renderApp(signedIn(), { pathname: '/reading', state }));
    await screen.findByRole('heading', { name: 'Your full reading' });
    expect(screen.queryByRole('link', { name: 'Get the AI reading' })).not.toBeInTheDocument();
    unmount();

    vi.stubEnv('VITE_AI_READINGS', 'true');
    render(renderApp(signedIn(), { pathname: '/reading', state }));
    expect(await screen.findByRole('link', { name: 'Get the AI reading' })).toHaveAttribute(
      'href',
      '/charts/chart-1/reading',
    );
  });

  it('My charts opens the free reading for a saved chart', async () => {
    charts.listCharts.mockResolvedValue([row]);
    render(renderApp(signedIn(), '/charts', <Where />));
    fireEvent.click(await screen.findByRole('link', { name: 'Full reading for Mama' }));
    expect(await screen.findByRole('heading', { name: 'Mama’s full reading' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/reading'));
  });
});
