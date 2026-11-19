// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { App } from '../App.tsx';

const SLOW = { timeout: 5000 };
const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-19T04:00:00Z')); // Thursday noon in Manila
});
afterEach(() => vi.useRealTimers());

describe('horoscope pages', () => {
  it('/horoscope/gemini shows today and this week for Gemini', async () => {
    renderAt('/horoscope/gemini');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Gemini horoscope');
    expect(
      await screen.findByRole('heading', { name: 'Today · Thursday, November 19' }, SLOW),
    ).toBeVisible();
    expect(
      screen.getByText('The Moon is in Pisces, the 10th house counted from Gemini.'),
    ).toBeVisible();
    expect(screen.getByRole('heading', { name: 'This week · Nov 16 – Nov 22' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Venus in Libra' })).toBeVisible();
    expect(document.title).toBe('Gemini Horoscope Today & This Week | AstroVerse');
    expect(screen.getByRole('link', { name: 'Gemini Sun meaning' })).toHaveAttribute(
      'href',
      '/signs/gemini',
    );
  });

  it('unknown signs show the not-found page', () => {
    renderAt('/horoscope/ophiuchus');
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeVisible();
  });

  it('/horoscope links to all 12 signs', () => {
    renderAt('/horoscope');
    expect(
      screen.getAllByRole('link').filter((a) => a.getAttribute('href')?.startsWith('/horoscope/')),
    ).toHaveLength(12);
  });

  it('sign pages link to the horoscope (Sun and Rising, not Moon)', () => {
    renderAt('/rising/scorpio');
    expect(screen.getByRole('link', { name: 'Today’s Scorpio horoscope' })).toHaveAttribute(
      'href',
      '/horoscope/scorpio',
    );
  });
});
