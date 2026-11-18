import { SIGN_NAMES } from './zodiac.ts';

/**
 * Display a longitude as `15°12' Taurus`. Rounds to the nearest arcminute at display
 * time only, carrying into the next degree/sign (29°59.7' Aries → 0°00' Taurus).
 */
export function formatLongitude(longitude: number): string {
  const totalMinutes = ((Math.round(longitude * 60) % 21600) + 21600) % 21600;
  const sign = Math.floor(totalMinutes / 1800);
  const inSign = totalMinutes % 1800;
  const deg = Math.floor(inSign / 60);
  const min = inSign % 60;
  return `${deg}°${String(min).padStart(2, '0')}' ${SIGN_NAMES[sign] ?? ''}`;
}
