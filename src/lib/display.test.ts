import {
  aspectTone,
  formatDay,
  formatDegMin,
  formatOrb,
  formatWindow,
  signGlyph,
  splitLongitude,
} from './display.ts';

describe('display helpers', () => {
  it('splits and formats longitudes with carry into the next sign', () => {
    expect(splitLongitude(69.6)).toEqual({ sign: 2, deg: 9, min: 36 });
    expect(splitLongitude(29.9995)).toEqual({ sign: 1, deg: 0, min: 0 });
    expect(splitLongitude(359.9999)).toEqual({ sign: 0, deg: 0, min: 0 });
    expect(formatDegMin(69.6)).toBe('9°36′');
  });

  it('formats orbs', () => {
    expect(formatOrb(0.4)).toBe('0°24′');
    expect(formatOrb(7.9999)).toBe('8°00′');
  });

  it('uses text-presentation zodiac glyphs (no emoji)', () => {
    expect(signGlyph(0)).toBe('♈︎');
  });

  it('classifies aspect tone', () => {
    expect(aspectTone('trine')).toBe('flowing');
    expect(aspectTone('square')).toBe('challenging');
    expect(aspectTone('conjunction')).toBe('blending');
  });
});

describe('forecast dates', () => {
  it('formats UTC days without shifting them', () => {
    expect(formatDay('2027-02-25')).toBe('Feb 25, 2027');
    expect(formatDay('2028-01-01')).toBe('Jan 1, 2028');
  });

  it('formats windows, including ones that run past either end of the scan', () => {
    const w = {
      start: '2027-02-06',
      end: '2027-03-14',
      startsBeforeScan: false,
      endsAfterScan: false,
    };
    expect(formatWindow(w)).toBe('Feb 6, 2027 – Mar 14, 2027');
    expect(formatWindow({ ...w, startsBeforeScan: true })).toBe('Now – Mar 14, 2027');
    expect(formatWindow({ ...w, endsAfterScan: true })).toBe('Feb 6, 2027 – beyond this forecast');
  });
});
