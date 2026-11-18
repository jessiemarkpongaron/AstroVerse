// @vitest-environment jsdom
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { BirthInput } from '../lib/astro/types.ts';
import { FORECAST_TEXT } from '../lib/interpret/forecast.ts';
import { renderApp, signedOut } from '../test/fakeAuth.tsx';

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

beforeEach(() => {
  // Fixed "today" so the forecast is deterministic.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-18T05:00:00Z'));
});
afterEach(() => vi.useRealTimers());

describe('ForecastPage', () => {
  it('opens from the chart page, signed out, without network calls', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    render(renderApp(signedOut(), { pathname: '/chart', state: { input, name: '' } }));
    fireEvent.click(await screen.findByRole('link', { name: 'See your next two years' }));
    expect(await screen.findByRole('heading', { name: 'Your next two years' })).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('shows what is happening now, themed periods with dates, and house changes', async () => {
    render(renderApp(signedOut(), { pathname: '/forecast', state: { input, name: 'Mama' } }));
    expect(
      await screen.findByRole('heading', { name: 'Mama’s next two years' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Nov 18, 2026 – Nov 18, 2028/)).toBeInTheDocument();

    const now = screen.getByRole('region', { name: 'Happening now' });
    expect(now).toHaveTextContent(/Pluto opposite your Midheaven · Career & Direction · until/);
    // Two passes: now → Feb 2027 (exact Jan 10) and a near miss later in 2027.
    const pluto = screen.getAllByRole('heading', { name: 'Pluto opposite your Midheaven' });
    expect(pluto[0]?.closest('article')).toHaveTextContent(/Now – .* · exact Jan 10, 2027/);

    const career = screen.getByRole('region', { name: 'Career & Direction' });
    // Three separate passes (direct, retrograde, direct) → three periods.
    expect(
      within(career).getAllByRole('heading', { name: 'Saturn square your Saturn' }),
    ).toHaveLength(3);
    expect(screen.getByRole('region', { name: 'Love & Relationships' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Planets changing house' })).toHaveTextContent(
      /Jan 10, 2027: .*Pluto/,
    );
    expect(
      screen.getAllByText(/Transits describe themes and timing, not fixed events/).length,
    ).toBeGreaterThan(0);
  });

  it('shows meanings and tips only once the texts are approved', async () => {
    render(renderApp(signedOut(), { pathname: '/forecast', state: { input, name: '' } }));
    await screen.findByRole('heading', { name: 'Your next two years' });
    const tips = screen.queryAllByText(/How to use this time/);
    expect(tips.length > 0).toBe(FORECAST_TEXT.review === 'approved');
  });

  it('notes what an unknown birth time leaves out', async () => {
    render(
      renderApp(signedOut(), {
        pathname: '/forecast',
        state: { input: { ...input, time: null, timeAccuracy: 'unknown' }, name: '' },
      }),
    );
    expect(
      await screen.findByText(/transits to your Moon, Rising and Midheaven/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('region', { name: 'Planets changing house' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/your Rising/)).not.toBeInTheDocument();
  });

  it('flags Rising/Midheaven periods for approximate birth times', async () => {
    render(
      renderApp(signedOut(), {
        pathname: '/forecast',
        state: { input: { ...input, timeAccuracy: 'approximate' }, name: '' },
      }),
    );
    await screen.findByRole('heading', { name: 'Your next two years' });
    expect(screen.getAllByText(/Depends on your exact birth time/).length).toBeGreaterThan(0);
  });
});
