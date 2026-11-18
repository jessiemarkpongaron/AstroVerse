// @vitest-environment jsdom
import type { BirthInput } from './astro/types.ts';
import { setPendingChart, takePendingChart } from './pendingChart.ts';

const input: BirthInput = {
  date: '1990-05-31',
  time: '15:30',
  timeAccuracy: 'exact',
  place: { name: 'Carrascal', lat: 9.37, lon: 125.95, tz: 'Asia/Manila' },
};

describe('pending chart', () => {
  beforeEach(() => window.localStorage.clear());

  it('round-trips once, then is gone', () => {
    setPendingChart(input, 'Mama', 1000);
    expect(takePendingChart(2000)).toEqual({ input, name: 'Mama' });
    expect(takePendingChart(2000)).toBeNull();
  });

  it('expires after an hour and is removed', () => {
    setPendingChart(input, '', 0);
    expect(takePendingChart(60 * 60 * 1000 + 1)).toBeNull();
    expect(window.localStorage.length).toBe(0);
  });

  it('ignores corrupt data', () => {
    window.localStorage.setItem('astroverse-pending-chart', '{not json');
    expect(takePendingChart()).toBeNull();
  });
});
