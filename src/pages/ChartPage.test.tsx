// @vitest-environment jsdom
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { App } from '../App.tsx';
import type { BirthInput } from '../lib/astro/types.ts';
import { encodeBirthHash } from '../lib/shareLink.ts';

const carrascal: BirthInput = {
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

async function renderChart(input: BirthInput) {
  render(
    <MemoryRouter initialEntries={[{ pathname: '/chart', hash: `#${encodeBirthHash(input)}` }]}>
      <App />
    </MemoryRouter>,
  );
  await screen.findByRole('heading', { name: 'Your Big Three' });
}

const row = (label: string) =>
  screen.getByRole('rowheader', { name: new RegExp(label) }).closest('tr') as HTMLElement;

describe('ChartPage', () => {
  it('shows all 13 placements with houses and retrograde markers', async () => {
    await renderChart(carrascal);
    const table = screen.getByRole('table', { name: 'Planet and point positions' });
    expect(within(table).getAllByRole('row')).toHaveLength(14); // header + 13
    expect(within(row('Saturn')).getByText('(retrograde)')).toBeInTheDocument();
    expect(within(row('Sun')).queryByText('(retrograde)')).not.toBeInTheDocument();
    expect(within(row('Ascendant')).getByText('1')).toBeInTheDocument();
  });

  it('shows Big Three meanings and keywords from static text', async () => {
    await renderChart(carrascal);
    const bigThree = screen.getByRole('region', { name: 'Big Three' });
    expect(
      within(bigThree).getByText(/Your core self is curious, quick and full of questions/),
    ).toBeInTheDocument();
    expect(
      within(bigThree).getByText(/You may come across as calm, intense and a bit mysterious/),
    ).toBeInTheDocument();
    expect(within(bigThree).getAllByRole('list', { name: 'Keywords' })).toHaveLength(3);
  });

  it('shows the Mercury snippet in the short reading, with the disclaimer', async () => {
    await renderChart(carrascal);
    const heading = screen.getByRole('heading', { name: 'Your short reading' });
    const section = heading.closest('section') as HTMLElement;
    expect(within(section).getByRole('heading', { name: /Mercury in Taurus/ })).toBeInTheDocument();
    expect(
      within(section).getByText(/You tend to think things through slowly and carefully/),
    ).toBeInTheDocument();
    expect(within(section).getByText(/Not professional advice/)).toBeInTheDocument();
    expect(within(section).getByRole('heading', { name: /Venus in Taurus/ })).toBeInTheDocument();
    expect(within(section).getByText(/You tend to love in a steady, loyal/)).toBeInTheDocument();
    expect(within(section).getByRole('heading', { name: /Mars in Aries/ })).toBeInTheDocument();
    expect(within(section).getByRole('heading', { name: /Jupiter in Cancer/ })).toBeInTheDocument();
    expect(
      within(section).getByRole('heading', { name: /Saturn in Capricorn/ }),
    ).toBeInTheDocument();
  });

  it('renders the wheel with a text summary', async () => {
    await renderChart(carrascal);
    const wheel = screen.getByRole('img', { name: /Birth chart wheel/ });
    expect(wheel.querySelector('desc')?.textContent).toContain('Sun in Gemini');
  });

  it('lists aspects sorted by orb', async () => {
    await renderChart(carrascal);
    const heading = screen.getByRole('heading', { name: 'Aspects' });
    const list = heading.closest('section')?.querySelector('ul') as HTMLElement;
    const orbs = within(list)
      .getAllByText(/applying|separating/)
      .map((el) => {
        const m = /(\d+)°(\d+)′/.exec(el.textContent ?? '');
        return Number(m?.[1]) + Number(m?.[2]) / 60;
      });
    expect(orbs).toHaveLength(8);
    expect([...orbs].sort((a, b) => a - b)).toEqual(orbs);
    fireEvent.click(screen.getByRole('button', { name: /Show all \d+ aspects/ }));
    expect(within(list).getAllByText(/applying|separating/).length).toBeGreaterThan(8);
  });

  it('switches house systems', async () => {
    await renderChart(carrascal);
    const toggle = screen.getByRole('radiogroup', { name: 'House system' });
    expect(within(toggle).getByRole('radio', { name: 'Placidus' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    // Venus is in Placidus house 6 but Whole Sign house 7 (ASC in Scorpio, Venus in Taurus).
    expect(within(row('Venus')).getByText('6')).toBeInTheDocument();
    fireEvent.click(within(toggle).getByRole('radio', { name: 'Whole Sign' }));
    expect(within(row('Venus')).getByText('7')).toBeInTheDocument();
  });

  it('shows the Mars sign-edge note in the grouped notes', async () => {
    await renderChart(carrascal);
    expect(screen.getByText(/Mars is at 0°01' Aries/)).toBeInTheDocument();
  });

  it('hides houses, the toggle and Rising when the time is unknown', async () => {
    await renderChart({ ...carrascal, time: null, timeAccuracy: 'unknown' });
    expect(screen.queryByRole('radiogroup', { name: 'House system' })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'House' })).not.toBeInTheDocument();
    expect(screen.getByText('Add your birth time to see your Rising sign.')).toBeInTheDocument();
    expect(screen.getByText(/Birth time unknown/)).toBeInTheDocument();
  });
});
