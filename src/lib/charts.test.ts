import type { BirthInput } from './astro/types.ts';
import {
  ChartsError,
  birthInputToInsert,
  chartsErrorMessage,
  rowToBirthInput,
  type ChartRow,
} from './charts.ts';

const input: BirthInput = {
  date: '1990-05-31',
  time: '15:30',
  timeAccuracy: 'approximate',
  place: {
    name: 'Carrascal, Surigao del Sur, Philippines',
    lat: 9.37028,
    lon: 125.94917,
    tz: 'Asia/Manila',
  },
};

const row: ChartRow = {
  id: 'c1',
  user_id: 'u1',
  label: 'Me',
  birth_date: '1990-05-31',
  birth_time: '15:30:00',
  time_accuracy: 'approximate',
  place_name: input.place.name,
  lat: 9.37028,
  lon: 125.94917,
  tz: 'Asia/Manila',
  is_self: true,
  consent_confirmed: false,
  created_at: '2026-11-18T00:00:00Z',
};

describe('charts mapping', () => {
  it('maps a row back to engine input (HH:MM:SS → HH:mm)', () => {
    expect(rowToBirthInput(row)).toEqual(input);
  });

  it('maps unknown time to null', () => {
    expect(rowToBirthInput({ ...row, birth_time: null, time_accuracy: 'unknown' }).time).toBeNull();
  });

  it('builds an insert for my own chart (no consent flag needed)', () => {
    expect(
      birthInputToInsert(input, { label: ' Me ', isSelf: true, consentConfirmed: false }),
    ).toEqual({
      label: 'Me',
      birth_date: '1990-05-31',
      birth_time: '15:30',
      time_accuracy: 'approximate',
      place_name: input.place.name,
      lat: 9.37028,
      lon: 125.94917,
      tz: 'Asia/Manila',
      is_self: true,
      consent_confirmed: false,
    });
  });

  it('requires consent for another person’s chart', () => {
    expect(() =>
      birthInputToInsert(input, { label: 'Mama', isSelf: false, consentConfirmed: false }),
    ).toThrow(ChartsError);
    expect(
      birthInputToInsert(input, { label: 'Mama', isSelf: false, consentConfirmed: true })
        .consent_confirmed,
    ).toBe(true);
  });

  it('requires a 1–60 character label', () => {
    expect(() =>
      birthInputToInsert(input, { label: '  ', isSelf: true, consentConfirmed: false }),
    ).toThrow(ChartsError);
    expect(() =>
      birthInputToInsert(input, { label: 'x'.repeat(61), isSelf: true, consentConfirmed: false }),
    ).toThrow(ChartsError);
  });

  it('stores no time for unknown accuracy', () => {
    const r = birthInputToInsert(
      { ...input, time: null, timeAccuracy: 'unknown' },
      { label: 'Me', isSelf: true, consentConfirmed: false },
    );
    expect(r.birth_time).toBeNull();
    expect(r.time_accuracy).toBe('unknown');
  });

  it('gives friendly messages for expected database errors', () => {
    expect(chartsErrorMessage({ code: '23505' })).toMatch(
      /already have a chart marked as your own/,
    );
    expect(chartsErrorMessage({ code: '42501' })).toMatch(/sign in again/);
    expect(chartsErrorMessage({})).toMatch(/connection/);
  });
});
