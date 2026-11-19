// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useLocation } from 'react-router';
import type { BirthInput } from '../lib/astro/types.ts';
import type { ChartRow } from '../lib/charts.ts';
import { fakeClient, renderApp, signedIn, signedOut } from '../test/fakeAuth.tsx';

const charts = vi.hoisted(() => ({
  saveChart: vi.fn(),
  listCharts: vi.fn(),
  deleteChart: vi.fn(),
}));
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
  const l = useLocation();
  return <output data-testid="where">{l.pathname}</output>;
}

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
});

describe('Header', () => {
  it('shows Sign in when signed out, My charts + Sign out when signed in', () => {
    const { unmount } = render(renderApp(signedOut(), '/'));
    expect(screen.getByRole('link', { name: 'Sign in' })).toBeInTheDocument();
    unmount();
    const client = fakeClient();
    render(renderApp(signedIn(client), '/'));
    expect(screen.getByRole('link', { name: 'My charts' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(client.auth.signOut).toHaveBeenCalled();
  });

  it('hides account links when accounts are not configured', () => {
    render(renderApp({ status: 'unavailable', client: null, user: null, session: null }, '/'));
    expect(screen.queryByRole('link', { name: 'Sign in' })).not.toBeInTheDocument();
  });
});

describe('Landing (/)', () => {
  it('sends signed-out visitors to the login page, which lets them skip to the form', () => {
    render(renderApp(signedOut(), '/'));
    expect(screen.getByRole('heading', { name: 'Welcome to AstroVerse' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: 'Continue without an account' }));
    expect(screen.getByRole('heading', { name: 'Discover your Big Three' })).toBeInTheDocument();
  });

  it('shows the birth form to signed-in users and when accounts are off', () => {
    const { unmount } = render(renderApp(signedIn(), '/'));
    expect(screen.getByRole('heading', { name: 'Discover your Big Three' })).toBeInTheDocument();
    unmount();
    render(renderApp({ status: 'unavailable', client: null, user: null, session: null }, '/'));
    expect(screen.getByRole('heading', { name: 'Discover your Big Three' })).toBeInTheDocument();
  });
});

describe('LoginPage', () => {
  it('sends a magic link to the callback URL', async () => {
    const client = fakeClient();
    render(renderApp(signedOut(client), '/login'));
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'me@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Email me a sign-in link' }));
    expect(await screen.findByText('Check your email')).toBeInTheDocument();
    expect(client.auth.signInWithOtp).toHaveBeenCalledWith({
      email: 'me@example.com',
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
  });

  it('validates the email before sending', () => {
    const client = fakeClient();
    render(renderApp(signedOut(client), '/login'));
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'nope' } });
    fireEvent.click(screen.getByRole('button', { name: 'Email me a sign-in link' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid email address.');
    expect(client.auth.signInWithOtp).not.toHaveBeenCalled();
  });

  it('explains rate limits', async () => {
    const client = fakeClient({
      signInWithOtp: vi.fn(async () => ({ data: {}, error: { status: 429, message: 'rate' } })),
    });
    render(renderApp(signedOut(client), '/login'));
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'me@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Email me a sign-in link' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/Too many sign-in emails/);
  });

  it('starts Google sign-in with the callback URL', () => {
    const client = fakeClient();
    render(renderApp(signedOut(client), '/login'));
    fireEvent.click(screen.getByRole('button', { name: 'Continue with Google' }));
    expect(client.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  });
});

describe('Saving a chart', () => {
  it('signed out: stores the chart for after sign-in and goes to /login', async () => {
    render(renderApp(signedOut(), { pathname: '/chart', state: { input, name: '' } }, <Where />));
    fireEvent.click(await screen.findByRole('button', { name: 'Sign in to save this chart' }));
    expect(screen.getByTestId('where')).toHaveTextContent('/login');
    expect(window.localStorage.getItem('astroverse-pending-chart')).toContain('1990-05-31');
  });

  it('signed in: saves my own chart', async () => {
    charts.saveChart.mockResolvedValue(row);
    render(renderApp(signedIn(), { pathname: '/chart', state: { input, name: '' } }));
    fireEvent.click(await screen.findByRole('button', { name: 'Save this chart' }));
    expect(screen.getByLabelText('This is my own chart')).toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText(/Saved in/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Get the full reading' })).toHaveAttribute(
      'href',
      '/reading',
    );
    expect(charts.saveChart).toHaveBeenCalledWith(expect.anything(), input, {
      label: 'My chart',
      isSelf: true,
      consentConfirmed: false,
    });
  });

  it('another person’s chart needs the consent checkbox before Save is enabled', async () => {
    charts.saveChart.mockResolvedValue(row);
    render(renderApp(signedIn(), { pathname: '/chart', state: { input, name: 'Mama' } }));
    fireEvent.click(await screen.findByRole('button', { name: 'Save this chart' }));
    expect(screen.getByLabelText('This is my own chart')).not.toBeChecked();
    const save = screen.getByRole('button', { name: 'Save' });
    expect(save).toBeDisabled();
    fireEvent.click(screen.getByLabelText(/I have this person’s permission/));
    expect(save).toBeEnabled();
    fireEvent.click(save);
    await waitFor(() =>
      expect(charts.saveChart).toHaveBeenCalledWith(expect.anything(), input, {
        label: 'Mama',
        isSelf: false,
        consentConfirmed: true,
      }),
    );
  });

  it('opens the save form automatically after returning from sign-in', async () => {
    render(
      renderApp(signedIn(), { pathname: '/chart', state: { input, name: '', openSave: true } }),
    );
    expect(await screen.findByRole('heading', { name: 'Save this chart' })).toBeInTheDocument();
  });
});

describe('Auth callback', () => {
  it('returns to the pending chart with the save form open', async () => {
    window.localStorage.setItem(
      'astroverse-pending-chart',
      JSON.stringify({ input, name: '', savedAt: Date.now() }),
    );
    render(renderApp(signedIn(), '/auth/callback', <Where />));
    expect(await screen.findByRole('heading', { name: 'Save this chart' })).toBeInTheDocument();
    expect(screen.getByTestId('where')).toHaveTextContent('/chart');
  });

  it('goes to My charts when nothing is pending', async () => {
    charts.listCharts.mockResolvedValue([]);
    render(renderApp(signedIn(), '/auth/callback', <Where />));
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/charts'));
  });
});

describe('MyChartsPage', () => {
  it('redirects to sign-in when signed out', () => {
    render(renderApp(signedOut(), '/charts', <Where />));
    expect(screen.getByTestId('where')).toHaveTextContent('/login');
  });

  it('lists charts, opens one, and deletes after confirmation', async () => {
    charts.listCharts.mockResolvedValueOnce([row]).mockResolvedValueOnce([]);
    charts.deleteChart.mockResolvedValue(undefined);
    const { unmount } = render(renderApp(signedIn(), '/charts'));
    const item = (await screen.findByRole('heading', { name: 'Mama' })).closest(
      'li',
    ) as HTMLElement;
    expect(within(item).getByText(/1990-05-31 · 15:30/)).toBeInTheDocument();

    fireEvent.click(within(item).getByRole('button', { name: 'Delete Mama' }));
    const dialog = screen.getByRole('alertdialog', { name: 'Delete Mama?' });
    expect(dialog).toHaveTextContent('all its readings');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    await waitFor(() =>
      expect(charts.deleteChart).toHaveBeenCalledWith(expect.anything(), 'chart-1'),
    );
    expect(await screen.findByText(/No saved charts yet/)).toBeInTheDocument();
    unmount();

    charts.listCharts.mockResolvedValueOnce([row]);
    render(renderApp(signedIn(), '/charts'));
    fireEvent.click(await screen.findByRole('button', { name: 'Open' }));
    expect(await screen.findByRole('heading', { name: "Mama's Big Three" })).toBeInTheDocument();
    expect(screen.getByText(/Saved in/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Get the full reading' })).toBeInTheDocument();
  });

  it('Cancel keeps the chart', async () => {
    charts.listCharts.mockResolvedValue([row]);
    render(renderApp(signedIn(), '/charts'));
    fireEvent.click(await screen.findByRole('button', { name: 'Delete Mama' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(charts.deleteChart).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Open' })).toBeInTheDocument();
  });
});
