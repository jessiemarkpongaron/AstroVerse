// @vitest-environment jsdom
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { App } from '../App.tsx';
import { encodeBirthHash } from '../lib/shareLink.ts';
import { CARRASCAL_RESPONSE, mockFetchJson } from '../test/openMeteoFixtures.ts';

afterEach(() => vi.unstubAllGlobals());

function renderAt(entry: string | { pathname: string; hash?: string }) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <App />
    </MemoryRouter>,
  );
}

async function fillCarrascal(accuracy: 'Exact' | 'Approximate' | 'Unknown' = 'Exact') {
  fireEvent.change(screen.getByLabelText('Birth date'), { target: { value: '1990-05-31' } });
  fireEvent.click(screen.getByLabelText(new RegExp(`^${accuracy}`)));
  if (accuracy !== 'Unknown') {
    fireEvent.change(screen.getByLabelText('Birth time'), { target: { value: '15:30' } });
  }
  const place = screen.getByRole('combobox', { name: 'Birth place' });
  fireEvent.focus(place);
  fireEvent.change(place, { target: { value: 'Carrascal' } });
  const option = await screen.findByRole('option', {
    name: 'Carrascal, Surigao del Sur, Philippines',
  });
  fireEvent.click(option);
}

describe('Birth form → chart (PRD F1 acceptance)', () => {
  beforeEach(() => vi.stubGlobal('fetch', mockFetchJson(CARRASCAL_RESPONSE)));

  it('May 31 1990, 3:30 PM, Carrascal → Sun Gemini, Moon Virgo, Rising Scorpio', async () => {
    renderAt('/');
    await fillCarrascal();
    fireEvent.click(screen.getByRole('button', { name: 'See my chart' }));

    expect(await screen.findByRole('heading', { name: 'Your Big Three' })).toBeInTheDocument();
    const bigThree = screen.getByRole('region', { name: 'Big Three' });
    const cards = [...bigThree.querySelectorAll(':scope > ul > li')];
    expect(cards).toHaveLength(3);
    expect(within(cards[0] as HTMLElement).getByText(/Gemini/)).toBeInTheDocument();
    expect(within(cards[1] as HTMLElement).getByText(/Virgo/)).toBeInTheDocument();
    expect(within(cards[2] as HTMLElement).getByText(/Scorpio/)).toBeInTheDocument();
  });

  it('lists Philippine results first and shows the chosen place details', async () => {
    renderAt('/');
    const place = screen.getByRole('combobox', { name: 'Birth place' });
    fireEvent.focus(place);
    fireEvent.change(place, { target: { value: 'Carrascal' } });
    const options = await screen.findAllByRole('option');
    expect(options[0]).toHaveTextContent('Philippines');
    fireEvent.click(options[0] as HTMLElement);
    expect(screen.getByText(/Asia\/Manila/)).toBeInTheDocument();
  });

  it('supports keyboard selection in the place list', async () => {
    renderAt('/');
    const place = screen.getByRole('combobox', { name: 'Birth place' });
    fireEvent.focus(place);
    fireEvent.change(place, { target: { value: 'Carrascal' } });
    await screen.findAllByRole('option');
    fireEvent.keyDown(place, { key: 'ArrowDown' });
    expect(place).toHaveAttribute('aria-activedescendant');
    fireEvent.keyDown(place, { key: 'Enter' });
    expect(place).toHaveValue('Carrascal, Surigao del Sur, Philippines');
  });

  it('shows the approximate-time Rising warning', async () => {
    renderAt('/');
    await fillCarrascal('Approximate');
    fireEvent.click(screen.getByRole('button', { name: 'See my chart' }));
    expect(
      await screen.findByText(
        'Your Rising is Scorpio, but would be Libra if you were born before about 3:02 PM.',
      ),
    ).toBeInTheDocument();
  });

  it('hides Rising when the time is unknown', async () => {
    renderAt('/');
    await fillCarrascal('Unknown');
    expect(screen.queryByLabelText('Birth time')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'See my chart' }));
    expect(
      await screen.findByText('Add your birth time to see your Rising sign.'),
    ).toBeInTheDocument();
  });

  it('shows validation errors and does not navigate', () => {
    renderAt('/');
    fireEvent.click(screen.getByRole('button', { name: 'See my chart' }));
    expect(screen.getByText('Enter your birth date.')).toBeInTheDocument();
    expect(screen.getByText('Enter your birth time, or choose “Unknown”.')).toBeInTheDocument();
    expect(screen.getByText('Choose your birth place from the list.')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Your Big Three' })).not.toBeInTheDocument();
  });
});

describe('Chart page from a share link', () => {
  it('renders from the URL fragment without the person’s name', async () => {
    const hash = encodeBirthHash({
      date: '1990-05-31',
      time: '15:30',
      timeAccuracy: 'exact',
      place: { name: 'Carrascal', lat: 9.37028, lon: 125.94917, tz: 'Asia/Manila' },
    });
    renderAt({ pathname: '/chart', hash: `#${hash}` });
    expect(await screen.findByRole('heading', { name: 'Your Big Three' })).toBeInTheDocument();
    expect(screen.getAllByText('Scorpio').length).toBeGreaterThan(0);
  });

  it('asks for birth details when there are none', async () => {
    renderAt('/chart');
    expect(
      await screen.findByRole('heading', { name: 'No birth details yet' }),
    ).toBeInTheDocument();
  });
});
