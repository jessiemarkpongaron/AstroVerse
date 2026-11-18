import { MakeTime } from 'astronomy-engine';
import {
  ascendantFromRamc,
  computeAngles,
  midheavenFromRamc,
  obliquityAt,
  ramcAt,
} from './angles.ts';
import { findAspects, type AspectPoint } from './aspects.ts';
import { computeHouses, houseOf } from './houses.ts';
import { BODIES, bodyLongitude, computePositions } from './positions.ts';
import { BirthInputError, birthToUtc } from './time.ts';
import type {
  BirthInput,
  Chart,
  ChartPoint,
  HouseSystemChoice,
  PointName,
  UncertaintyFlag,
} from './types.ts';
import {
  approximateTimeFlags,
  signCuspFlags,
  unknownTimeFlags,
  uncertaintyWindowMinutes,
  type Snapshot,
} from './uncertainty.ts';
import { degreeInSign, signOf } from './zodiac.ts';

export interface BuildChartOptions {
  /** Default 'placidus' (falls back to Porphyry above 66° latitude). */
  houseSystem?: HouseSystemChoice;
  /** Honour tzdb DST for zones where we default to standard time (see time.ts). */
  observedDst?: boolean;
}

function validatePlace(input: BirthInput) {
  const { lat, lon } = input.place;
  if (!Number.isFinite(lat) || lat <= -90 || lat >= 90) {
    throw new BirthInputError('Latitude must be between −90 and 90');
  }
  if (!Number.isFinite(lon) || lon < -180 || lon > 180) {
    throw new BirthInputError('Longitude must be between −180 and 180');
  }
}

/** Lightweight recompute (no speeds) used by the uncertainty scans. */
function makeSnapshotFn(input: BirthInput, system: HouseSystemChoice) {
  const { lat, lon } = input.place;
  return (utcMs: number): Snapshot => {
    const time = MakeTime(new Date(utcMs));
    const longitudes: Partial<Record<PointName, number>> = {};
    for (const b of BODIES) longitudes[b] = bodyLongitude(b, time);
    const ramc = ramcAt(time, lon);
    const obliquity = obliquityAt(time);
    longitudes.Ascendant = ascendantFromRamc(ramc, obliquity, lat);
    longitudes.Midheaven = midheavenFromRamc(ramc, obliquity);
    const { cusps } = computeHouses({ ramc, obliquity, latitude: lat }, system);
    const houses: Partial<Record<PointName, number>> = {};
    for (const [name, l] of Object.entries(longitudes) as [PointName, number][]) {
      houses[name] = houseOf(l, cusps);
    }
    return { longitudes, houses };
  };
}

function toPoint(
  name: PointName,
  longitude: number,
  speed: number,
  retrograde: boolean,
  house: number | null,
): ChartPoint {
  return {
    name,
    longitude,
    sign: signOf(longitude),
    degreeInSign: degreeInSign(longitude),
    house,
    retrograde,
    speed,
  };
}

/**
 * Single entry point: birth input → full chart (positions, angles, houses, aspects, flags).
 * Pure and deterministic; throws BirthInputError on invalid input.
 */
export function buildChart(input: BirthInput, options: BuildChartOptions = {}): Chart {
  validatePlace(input);
  const system = options.houseSystem ?? 'placidus';
  const timeKnown = input.time !== null && input.timeAccuracy !== 'unknown';
  const effective: BirthInput = timeKnown
    ? input
    : { ...input, time: null, timeAccuracy: 'unknown' };

  const conv = birthToUtc(effective, { observedDst: options.observedDst ?? false });
  const utcMs = conv.utc.getTime();
  const flags: UncertaintyFlag[] = [...conv.flags];
  const positions = computePositions(conv.utc);

  let houses: Chart['houses'] = null;
  const points: ChartPoint[] = [];

  if (timeKnown) {
    const { lat, lon } = input.place;
    const angles = computeAngles(conv.utc, lat, lon);
    const hr = computeHouses(
      { ramc: angles.ramc, obliquity: angles.obliquity, latitude: lat },
      system,
    );
    houses = { system: hr.system, cusps: hr.cusps };
    if (hr.fellBack) {
      flags.push({
        point: null,
        kind: 'house-system-fallback',
        message: `Placidus houses can't be calculated this close to the poles (latitude ${Math.abs(lat).toFixed(1)}°${lat >= 0 ? 'N' : 'S'}), so Porphyry houses are used instead.`,
      });
    }
    for (const p of positions) {
      points.push(
        toPoint(p.name, p.longitude, p.speed, p.retrograde, houseOf(p.longitude, hr.cusps)),
      );
    }
    points.push(
      toPoint(
        'Ascendant',
        angles.ascendant,
        angles.ascendantSpeed,
        false,
        houseOf(angles.ascendant, hr.cusps),
      ),
      toPoint(
        'Midheaven',
        angles.midheaven,
        angles.midheavenSpeed,
        false,
        houseOf(angles.midheaven, hr.cusps),
      ),
    );
  } else {
    for (const p of positions) {
      points.push(toPoint(p.name, p.longitude, p.speed, p.retrograde, null));
    }
  }

  const aspects = findAspects(
    points.map<AspectPoint>((p) => ({ name: p.name, longitude: p.longitude, speed: p.speed })),
  );

  // Uncertainty flags (ASTRO_ENGINE §8, CLAUDE.md rule 4).
  const moonSpeed = positions.find((p) => p.name === 'Moon')?.speed ?? 0;
  const longitudes = Object.fromEntries(points.map((p) => [p.name, p.longitude])) as Partial<
    Record<PointName, number>
  >;

  if (!timeKnown) {
    // Moon sign change across the local birth day (00:00 → 23:59), same offset policy.
    const dayStart = birthToUtc(
      { ...effective, time: '00:00' },
      { observedDst: options.observedDst ?? false },
    );
    const dayEnd = birthToUtc(
      { ...effective, time: '23:59' },
      { observedDst: options.observedDst ?? false },
    );
    flags.push(
      ...unknownTimeFlags(
        (ms) => bodyLongitude('Moon', MakeTime(new Date(ms))),
        dayStart.utc.getTime(),
        dayEnd.utc.getTime(),
        conv.offsetMinutes,
      ),
    );
    // Other bodies near a sign edge (the Moon is covered by the day scan above).
    flags.push(
      ...signCuspFlags(longitudes, { moonSpeed, windowMinutes: 0, skip: new Set(['Moon']) }),
    );
  } else if (input.timeAccuracy === 'approximate') {
    const approx = approximateTimeFlags(makeSnapshotFn(input, system), utcMs, conv.offsetMinutes);
    flags.push(...approx);
    const alreadySign = new Set(
      approx.filter((f) => f.kind === 'sign-cusp' && f.point).map((f) => f.point as PointName),
    );
    flags.push(
      ...signCuspFlags(longitudes, {
        moonSpeed,
        windowMinutes: uncertaintyWindowMinutes('approximate'),
        skip: alreadySign,
      }),
    );
  } else {
    flags.push(...signCuspFlags(longitudes, { moonSpeed, windowMinutes: 0 }));
  }

  return {
    input: effective,
    utc: conv.utc.toISOString(),
    points,
    houses,
    aspects,
    flags,
  };
}
