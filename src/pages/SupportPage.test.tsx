// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { App } from '../App.tsx';

describe('SupportPage', () => {
  it('shows the QR with the account name, a save button and the steps', () => {
    render(
      <MemoryRouter initialEntries={['/support']}>
        <App />
      </MemoryRouter>,
    );
    const img = screen.getByRole('img', {
      name: 'InstaPay QR code for AstroVerse DigitalVersePH',
    });
    expect(img).toHaveAttribute('src', '/images/gcash-qr.png');
    expect(screen.getByRole('link', { name: 'Save QR image' })).toHaveAttribute(
      'download',
      'astroverse-gcash-qr.png',
    );
    expect(screen.getByText(/Open GCash and tap “Pay QR”, then “Upload QR”/)).toBeVisible();
    expect(screen.getByText(/they don’t unlock anything/)).toBeVisible();
    expect(document.title).toBe('Support AstroVerse');
  });

  it('is linked from the footer', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: 'Support AstroVerse' })).toHaveAttribute(
      'href',
      '/support',
    );
  });
});
