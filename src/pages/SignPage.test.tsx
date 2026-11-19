// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { App } from '../App.tsx';
import { BIG_THREE_TEXT } from '../lib/interpret/staticText.ts';

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );

describe('sign pages', () => {
  it('/signs/gemini shows the Sun text, dates, strengths and sets the title', () => {
    renderAt('/signs/gemini');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Gemini Sun');
    expect(screen.getByText(/Usually May 21 – June 20 \(Philippine time\)/)).toBeVisible();
    expect(screen.getByText(BIG_THREE_TEXT.sun.Gemini.meaning)).toBeVisible();
    const strengths = screen.getByRole('region', { name: 'Strengths' });
    expect(within(strengths).getAllByRole('listitem')).toHaveLength(
      BIG_THREE_TEXT.sun.Gemini.strengths.length,
    );
    expect(document.title).toBe('Gemini Sun Sign: Traits, Strengths & Dates | AstroVerse');
    expect(screen.getByRole('link', { name: 'Get your free birth chart' })).toHaveAttribute(
      'href',
      '/',
    );
    expect(screen.getByRole('link', { name: 'Gemini Moon' })).toHaveAttribute(
      'href',
      '/moon/gemini',
    );
  });

  it('/rising/scorpio uses the Rising text and explains it needs a birth time', () => {
    renderAt('/rising/scorpio');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Scorpio Rising');
    expect(screen.getByText(BIG_THREE_TEXT.rising.Scorpio.meaning)).toBeVisible();
    expect(screen.getByText(/needs your exact birth time and place/)).toBeVisible();
    expect(screen.queryByText(/Usually/)).toBeNull();
  });

  it('unknown signs show the not-found page', () => {
    renderAt('/moon/ophiuchus');
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeVisible();
  });

  it('/signs links to all 36 pages', () => {
    renderAt('/signs');
    for (const name of ['Sun signs', 'Moon signs', 'Rising signs']) {
      const section = screen.getByRole('region', { name });
      expect(within(section).getAllByRole('link')).toHaveLength(12);
    }
  });
});
