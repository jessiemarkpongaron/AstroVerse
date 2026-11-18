// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { BirthInput } from '../lib/astro/types.ts';
import type { ChartRow } from '../lib/charts.ts';
import { SYNASTRY_TEXT } from '../lib/interpret/synastry.ts';
import { CARRASCAL_RESPONSE, mockFetchJson } from '../test/openMeteoFixtures.ts';
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

const ana: ChartRow = {
  id: 'chart-2',
  user_id: 'user-1',
  label: 'Ana',
  birth_date: '1992-11-08',
  birth_time: '08:15:00',
  time_accuracy: 'exact',
  place_name: 'Manila, Philippines',
  lat: 14.5995,
  lon: 120.9842,
  tz: 'Asia/Manila',
  is_self: false,
  consent_confirmed: true,
  created_at: '2026-11-18T00:00:00Z',
};

beforeEach(() => vi.clearAllMocks());

describe('CompatibilityPage', () => {
  it('opens from the chart page and asks for the other person', async () => {
    render(renderApp(signedOut(), { pathname: '/chart', state: { input, name: '' } }));
    fireEvent.click(await screen.findByRole('link', { name: 'Check compatibility' }));
    expect(await screen.findByRole('heading', { name: 'Compatibility' })).toBeInTheDocument();
    expect(screen.getByText(/Nothing is sent or saved/)).toBeInTheDocument();
  });

  it('requires permission before comparing with someone entered by hand', async () => {
    render(renderApp(signedOut(), { pathname: '/compatibility', state: { input, name: '' } }));
    const submit = await screen.findByRole('button', { name: 'Compare charts' });
    expect(submit).toBeDisabled();
    fireEvent.click(
      screen.getByLabelText('I have this person’s permission to use their birth details.'),
    );
    expect(submit).toBeEnabled();
  });

  it('compares with someone entered by hand, without saving anything', async () => {
    const fetchMock = mockFetchJson(CARRASCAL_RESPONSE);
    vi.stubGlobal('fetch', fetchMock);
    render(renderApp(signedOut(), { pathname: '/compatibility', state: { input, name: '' } }));
    fireEvent.change(await screen.findByLabelText(/Their name/), { target: { value: 'Ana' } });
    fireEvent.change(screen.getByLabelText('Birth date'), { target: { value: '1992-11-08' } });
    fireEvent.change(screen.getByLabelText('Birth time'), { target: { value: '08:15' } });
    const place = screen.getByRole('combobox', { name: 'Birth place' });
    fireEvent.focus(place);
    fireEvent.change(place, { target: { value: 'Carrascal' } });
    fireEvent.click((await screen.findAllByRole('option'))[0] as HTMLElement);
    fireEvent.click(
      screen.getByLabelText('I have this person’s permission to use their birth details.'),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Compare charts' }));

    expect(await screen.findByRole('heading', { name: 'You & Ana' })).toBeInTheDocument();
    const overview = screen.getByRole('list', { name: 'Overview' });
    expect(within(overview).getAllByRole('listitem')).toHaveLength(3);
    expect(overview).toHaveTextContent(/Harmony(Strong|Some|Light)/);
    expect(screen.getByRole('region', { name: /^Harmony · / })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /^Challenges · / })).toBeInTheDocument();
    expect(
      screen.getAllByRole('heading', {
        name: /^Your \w+ (conjunct|sextile|square|trine|opposite) Ana’s \w+$/,
      }).length,
    ).toBeGreaterThan(0);
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
    // Only the place lookup went out; nothing about the comparison.
    expect(
      fetchMock.mock.calls.every((c) => String((c as unknown[])[0]).includes('geocoding')),
    ).toBe(true);
    vi.unstubAllGlobals();
  });

  it('signed in: compares with a saved chart in one tap', async () => {
    charts.listCharts.mockResolvedValue([ana]);
    render(
      renderApp(signedIn(), {
        pathname: '/compatibility',
        state: { input, name: '', savedChartId: 'chart-1' },
      }),
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Ana' }));
    expect(await screen.findByRole('heading', { name: 'You & Ana' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Compare with someone else' }));
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Compatibility' })).toBeInTheDocument(),
    );
    expect(screen.getByRole('button', { name: 'Compare charts' })).toBeDisabled();
  });

  it('shows texts and the respect note only once approved', async () => {
    charts.listCharts.mockResolvedValue([ana]);
    render(renderApp(signedIn(), { pathname: '/compatibility', state: { input, name: '' } }));
    fireEvent.click(await screen.findByRole('button', { name: 'Ana' }));
    await screen.findByRole('heading', { name: 'You & Ana' });
    expect(screen.queryByText(/built on respect, trust and free choice/) !== null).toBe(
      SYNASTRY_TEXT.review === 'approved',
    );
  });

  it('asks for your own chart first when opened directly', async () => {
    render(renderApp(signedOut(), '/compatibility'));
    expect(
      await screen.findByRole('heading', { name: 'Start with your own chart' }),
    ).toBeInTheDocument();
  });
});
