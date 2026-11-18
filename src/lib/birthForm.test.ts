import { validateBirthForm, type BirthFormValues } from './birthForm.ts';

const place = {
  name: 'Carrascal, Surigao del Sur, Philippines',
  lat: 9.37,
  lon: 125.95,
  tz: 'Asia/Manila',
};
const valid: BirthFormValues = {
  name: '',
  date: '1990-05-31',
  time: '15:30',
  accuracy: 'exact',
  place,
};

describe('validateBirthForm', () => {
  it('accepts the PRD example', () => {
    expect(validateBirthForm(valid)).toEqual({
      ok: true,
      input: { date: '1990-05-31', time: '15:30', timeAccuracy: 'exact', place },
    });
  });

  it('requires date, time and place', () => {
    const r = validateBirthForm({ ...valid, date: '', time: '', place: null });
    expect(r).toEqual({
      ok: false,
      errors: {
        date: 'Enter your birth date.',
        time: 'Enter your birth time, or choose “Unknown”.',
        place: 'Choose your birth place from the list.',
      },
    });
  });

  it('does not require a time when it is Unknown, and drops any typed time', () => {
    const r = validateBirthForm({ ...valid, accuracy: 'unknown', time: '' });
    expect(r.ok && r.input.time).toBeNull();
    const r2 = validateBirthForm({ ...valid, accuracy: 'unknown', time: '15:30' });
    expect(r2.ok && r2.input.time).toBeNull();
  });

  it.each(['1899-12-31', '2101-01-01'])('rejects out-of-range date %s', (date) => {
    const r = validateBirthForm({ ...valid, date });
    expect(!r.ok && r.errors.date).toBe('Birth date must be between 1900 and 2100.');
  });

  it('rejects an impossible calendar date via the engine', () => {
    const r = validateBirthForm({ ...valid, date: '1990-02-30' });
    expect(r.ok).toBe(false);
  });

  it.each(['24:00', '7:30', 'abc'])('rejects invalid time %s', (time) => {
    expect(validateBirthForm({ ...valid, time }).ok).toBe(false);
  });

  it('requires a time for Approximate', () => {
    expect(validateBirthForm({ ...valid, accuracy: 'approximate', time: '' }).ok).toBe(false);
  });
});
