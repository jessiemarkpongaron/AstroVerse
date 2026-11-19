import starts from './sunSignStarts.json';
import { signDateRange, sunIngressDates, typicalSunSignStarts } from './signDates.ts';

describe('Sun sign dates', () => {
  it('2026 ingresses in Manila time: March equinox, June solstice, December solstice', () => {
    const d = sunIngressDates(2026, 'Asia/Manila');
    expect(d[0]).toEqual({ month: 3, day: 20 });
    expect(d[3]).toEqual({ month: 6, day: 21 });
    expect(d[9]).toEqual({ month: 12, day: 22 });
  });

  it('sunSignStarts.json matches astronomy-engine over 2000–2039', () => {
    expect(starts.starts).toEqual(typicalSunSignStarts(2000, 2039, 'Asia/Manila'));
  });

  it('ranges end the day before the next sign starts, wrapping Pisces → Aries', () => {
    expect(signDateRange(starts.starts, 2)).toEqual({
      start: { month: 5, day: 21 },
      end: { month: 6, day: 20 },
    });
    expect(signDateRange(starts.starts, 11).end).toEqual({ month: 3, day: 19 });
    expect(signDateRange(starts.starts, 0).start).toEqual({ month: 3, day: 20 });
  });
});
