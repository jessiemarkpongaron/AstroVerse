import '@testing-library/jest-dom/vitest';

// jsdom doesn't implement scrolling; AppLayout scrolls to the top on navigation.
if (typeof window !== 'undefined') {
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
}
