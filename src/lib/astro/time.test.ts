import { Settings } from 'luxon';
import { REFERENCE_CHARTS } from './__tests__/fixtures.ts';
import { BirthInputError, birthToUtc } from './time.ts';

const manila = { name: 'Manila', lat: 14.6, lon: 121, tz: 'Asia/Manila' };
const newYork = { name: 'New York', lat: 40.7, lon: -74, tz: 'America/New_York' };

describe('birthToUtc', () => {
  it('converts Manila standard time (UTC+8)', () => {
    const r = birthToUtc({ date: '2001-11-12', time: '05:20', place: manila });
    expect(r.utc.toISOString()).toBe('2001-11-11T21:20:00.000Z');
    expect(r.offsetMinutes).toBe(480);
    expect(r.flags).toEqual([]);
  });

  it('uses UTC+8 for Philippine births even where tzdb lists DST (1990-05-21..07-28)', () => {
    const r = birthToUtc({ date: '1990-05-31', time: '15:30', place: manila });
    expect(r.offsetMinutes).toBe(480);
    expect(r.utc.toISOString()).toBe('1990-05-31T07:30:00.000Z');
    expect(r.dstIgnored).toBe(true);
    expect(r.tzdbOffsetMinutes).toBe(540);
    expect(r.flags).toEqual([]);
  });

  it.each([
    ['1936-12-01', 'pre-war DST'],
    ['1954-05-01', '1954 DST'],
    ['1977-06-01', '1977 DST'],
  ])('ignores tzdb DST for Manila on %s (%s)', (date) => {
    const r = birthToUtc({ date, time: '10:00', place: manila });
    expect(r.offsetMinutes).toBe(480);
    expect(r.dstIgnored).toBe(true);
  });

  it('keeps the 1942–45 Japanese occupation time (UTC+9) from tzdb', () => {
    const r = birthToUtc({ date: '1943-06-01', time: '10:00', place: manila });
    expect(r.offsetMinutes).toBe(540);
    expect(r.dstIgnored).toBe(false);
  });

  it('honours tzdb Philippine DST when observedDst is set', () => {
    const r = birthToUtc(
      { date: '1990-05-31', time: '15:30', place: manila },
      { observedDst: true },
    );
    expect(r.offsetMinutes).toBe(540);
    expect(r.utc.toISOString()).toBe('1990-05-31T06:30:00.000Z');
    expect(r.dstIgnored).toBe(false);
  });

  it('still applies DST for other countries (New York, July → UTC−4)', () => {
    const r = birthToUtc({ date: '1990-07-04', time: '12:00', place: newYork });
    expect(r.offsetMinutes).toBe(-240);
    expect(r.dstIgnored).toBe(false);
  });

  it.each(REFERENCE_CHARTS.map((c) => [c.id, c] as const))(
    'matches the hand-entered tzdb offset for fixture %s',
    (_id, c) => {
      const r = birthToUtc(c.input);
      expect(r.offsetMinutes).toBe(c.expectedOffsetMinutes);
      expect(r.utc.toISOString()).toBe(c.utc);
    },
  );

  it('uses 12:00 local when the time is unknown', () => {
    const r = birthToUtc({ date: '2001-11-12', time: null, place: manila });
    expect(r.assumedNoon).toBe(true);
    expect(r.localTime).toBe('12:00');
    expect(r.utc.toISOString()).toBe('2001-11-12T04:00:00.000Z');
  });

  it('ignores the device/default timezone', () => {
    const prev = Settings.defaultZone;
    try {
      Settings.defaultZone = 'America/Los_Angeles';
      const r = birthToUtc({ date: '2001-11-12', time: '05:20', place: manila });
      expect(r.utc.toISOString()).toBe('2001-11-11T21:20:00.000Z');
    } finally {
      Settings.defaultZone = prev;
    }
  });

  it('picks the earlier instant for a repeated local time (fall back) and flags it', () => {
    // 2021-11-07 01:30 happened at EDT (05:30Z) and again at EST (06:30Z).
    const r = birthToUtc({ date: '2021-11-07', time: '01:30', place: newYork });
    expect(r.utc.toISOString()).toBe('2021-11-07T05:30:00.000Z');
    expect(r.flags).toHaveLength(1);
    expect(r.flags[0]).toMatchObject({ kind: 'dst-ambiguous', point: null });
    expect(r.flags[0]?.message).toMatch(/happened twice/);
  });

  it('picks the earlier candidate for a skipped local time (spring forward) and flags it', () => {
    // 2021-03-14 02:30 never existed in New York. Candidates: 02:30 read as EST (07:30Z)
    // or as EDT (06:30Z); the earlier instant is 06:30Z.
    const r = birthToUtc({ date: '2021-03-14', time: '02:30', place: newYork });
    expect(r.utc.toISOString()).toBe('2021-03-14T06:30:00.000Z');
    expect(r.flags[0]).toMatchObject({ kind: 'dst-ambiguous' });
    expect(r.flags[0]?.message).toMatch(/did not exist/);
  });

  it.each([
    ['bad date format', { date: '31/05/1990', time: '15:30' }],
    ['impossible date', { date: '1990-02-30', time: '15:30' }],
    ['year before 1900', { date: '1899-12-31', time: '15:30' }],
    ['year after 2100', { date: '2101-01-01', time: '15:30' }],
    ['bad time', { date: '1990-05-31', time: '24:00' }],
    ['bad time format', { date: '1990-05-31', time: '3:30 PM' }],
  ])('rejects %s', (_label, v) => {
    expect(() => birthToUtc({ ...v, place: manila })).toThrow(BirthInputError);
  });

  it('rejects an unknown timezone', () => {
    expect(() =>
      birthToUtc({ date: '1990-05-31', time: '15:30', place: { ...manila, tz: 'Mars/Olympus' } }),
    ).toThrow(BirthInputError);
  });
});
