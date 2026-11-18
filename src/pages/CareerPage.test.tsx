// @vitest-environment jsdom
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { BirthInput } from '../lib/astro/types.ts';
import { CAREER_TEXT } from '../lib/interpret/career.ts';
import { renderApp, signedOut } from '../test/fakeAuth.tsx';

// The page computes two years of transits on render; allow for a busy test machine.
const SLOW = { timeout: 5000 };

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
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-18T05:00:00Z'));
});
afterEach(() => vi.useRealTimers());

describe('CareerPage', () => {
  it('opens from the chart page, signed out, without network calls', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    render(renderApp(signedOut(), { pathname: '/chart', state: { input, name: '' } }));
    fireEvent.click(await screen.findByRole('link', { name: 'Your career reading' }));
    expect(
      await screen.findByRole('heading', { name: 'Your career reading' }, SLOW),
    ).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('shows direction, how you work, strengths and timing', async () => {
    render(renderApp(signedOut(), { pathname: '/career', state: { input, name: 'Mama' } }));
    expect(
      await screen.findByRole('heading', { name: 'Mama’s career reading' }, SLOW),
    ).toBeInTheDocument();
    const direction = screen.getByRole('region', { name: 'Your career direction' });
    expect(
      within(direction).getByRole('heading', { name: 'Midheaven in Leo' }),
    ).toBeInTheDocument();
    const style = screen.getByRole('region', { name: 'How you work' });
    expect(within(style).getByRole('list', { name: 'Element balance' })).toHaveTextContent(
      'Earth 6',
    );
    expect(within(style).getByRole('heading', { name: 'Mars in Aries' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Your strengths at work' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Timing in the next two years' })).toHaveTextContent(
      /Saturn|Pluto/,
    );
    expect(screen.getByText(/Not career, financial or professional advice/)).toBeInTheDocument();
  });

  it('shows career paths only once approved', async () => {
    render(renderApp(signedOut(), { pathname: '/career', state: { input, name: '' } }));
    await screen.findByRole('heading', { name: 'Your career reading' }, SLOW);
    const paths = screen.queryByRole('region', { name: 'Paths that may suit you' });
    expect(paths !== null).toBe(CAREER_TEXT.review === 'approved');
  });

  it('unknown birth time: no direction or timing, a note instead', async () => {
    render(
      renderApp(signedOut(), {
        pathname: '/career',
        state: { input: { ...input, time: null, timeAccuracy: 'unknown' }, name: '' },
      }),
    );
    expect(
      await screen.findByText(
        /your Midheaven, career houses and timing are left out/,
        undefined,
        SLOW,
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Your career direction' })).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'How you work' })).toBeInTheDocument();
  });
});
