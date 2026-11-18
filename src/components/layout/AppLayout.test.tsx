// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { App } from '../../App.tsx';
import { DISCLAIMER } from './Footer.tsx';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

describe('AppLayout', () => {
  beforeEach(() => {
    document.documentElement.classList.remove('dark');
    window.localStorage.clear();
  });

  it('shows header and the disclaimer footer on every page', () => {
    renderAt('/');
    expect(screen.getByRole('link', { name: /astroverse/i })).toBeInTheDocument();
    expect(screen.getByText(DISCLAIMER)).toBeInTheDocument();
  });

  it('scrolls to the top when the page changes', () => {
    renderAt('/nope');
    vi.mocked(window.scrollTo).mockClear();
    fireEvent.click(screen.getByRole('link', { name: 'Go home' }));
    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
  });

  it('renders a not-found page for unknown routes', () => {
    renderAt('/nope');
    expect(screen.getByRole('heading', { name: /page not found/i })).toBeInTheDocument();
    expect(screen.getByText(DISCLAIMER)).toBeInTheDocument();
  });

  it('toggles dark theme and remembers the choice', () => {
    renderAt('/');
    fireEvent.click(screen.getByRole('button', { name: /switch to dark theme/i }));
    expect(document.documentElement).toHaveClass('dark');
    expect(window.localStorage.getItem('astroverse-theme')).toBe('dark');
    fireEvent.click(screen.getByRole('button', { name: /switch to light theme/i }));
    expect(document.documentElement).not.toHaveClass('dark');
  });
});
