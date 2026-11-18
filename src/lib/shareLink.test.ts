import type { BirthInput } from './astro/types.ts';
import { buildShareUrl, decodeBirthHash, encodeBirthHash } from './shareLink.ts';

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

describe('share link', () => {
  it('round-trips through the URL fragment', () => {
    expect(decodeBirthHash(`#${encodeBirthHash(input)}`)).toEqual(input);
  });

  it('puts birth data only in the fragment', () => {
    const url = new URL(buildShareUrl('https://astroverse.example', input));
    expect(url.pathname).toBe('/chart');
    expect(url.search).toBe('');
    expect(url.hash).toContain('d=1990-05-31');
  });

  it('omits the time for unknown accuracy', () => {
    const unknown = { ...input, time: null, timeAccuracy: 'unknown' as const };
    const hash = encodeBirthHash(unknown);
    expect(new URLSearchParams(hash).has('t')).toBe(false);
    expect(decodeBirthHash(hash)).toEqual(unknown);
  });

  it.each([
    ['empty', ''],
    ['missing tz', 'd=1990-05-31&t=15:30&a=exact&p=X&lat=1&lon=2'],
    ['bad accuracy', 'd=1990-05-31&t=15:30&a=maybe&p=X&lat=1&lon=2&tz=Asia/Manila'],
    ['bad lat', 'd=1990-05-31&t=15:30&a=exact&p=X&lat=abc&lon=2&tz=Asia/Manila'],
    ['exact without time', 'd=1990-05-31&a=exact&p=X&lat=1&lon=2&tz=Asia/Manila'],
  ])('rejects %s', (_l, hash) => {
    expect(decodeBirthHash(hash)).toBeNull();
  });
});
