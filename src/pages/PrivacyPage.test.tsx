// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { PRIVACY, privacyPublished } from '../lib/privacy.ts';
import { PrivacyPage } from './PrivacyPage.tsx';

const page = (includeDraft: boolean) => (
  <MemoryRouter>
    <PrivacyPage includeDraft={includeDraft} />
  </MemoryRouter>
);

describe('PrivacyPage', () => {
  it('renders every section, with the date and the account-deletion steps', () => {
    render(page(true));
    expect(screen.getByRole('heading', { level: 1, name: 'Privacy' })).toBeInTheDocument();
    for (const s of PRIVACY.sections) {
      expect(screen.getByRole('heading', { level: 2, name: s.heading })).toBeInTheDocument();
    }
    expect(screen.getByText('Last updated November 22, 2026')).toBeInTheDocument();
    expect(screen.getByText(/tap “Delete my account”/)).toBeInTheDocument();
  });

  it('mentions Anthropic only when AI readings are on', () => {
    const { unmount } = render(page(true));
    expect(screen.queryByText(/Anthropic/)).toBeNull();
    unmount();
    vi.stubEnv('VITE_AI_READINGS', 'true');
    render(page(true));
    expect(screen.getByText(/never your name, email, birth date/)).toBeInTheDocument();
    vi.unstubAllEnvs();
  });

  it('stays hidden until the text is approved', () => {
    render(page(false));
    const heading = privacyPublished() ? 'Privacy' : 'Page not found';
    expect(screen.getByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
  });

  it('keeps to plain claims: no promises the app cannot keep', () => {
    const text = JSON.stringify(PRIVACY).toLowerCase();
    for (const banned of ['100%', 'guarantee', 'never be hacked', 'completely secure']) {
      expect(text).not.toContain(banned);
    }
  });
});
