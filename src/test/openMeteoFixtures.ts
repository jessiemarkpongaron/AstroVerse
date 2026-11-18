/** Trimmed real Open-Meteo responses (captured 2026-11-18) for offline tests. */
export const CARRASCAL_RESPONSE = {
  results: [
    {
      id: 3126210,
      name: 'Carrascal',
      latitude: 41.48478,
      longitude: -5.8121,
      country_code: 'ES',
      country: 'Spain',
      admin1: 'Castille and León',
      admin2: 'Zamora',
      timezone: 'Europe/Madrid',
      population: null,
    },
    {
      id: 1718262,
      name: 'Carrascal',
      latitude: 9.37028,
      longitude: 125.94917,
      country_code: 'PH',
      country: 'Philippines',
      admin1: 'Caraga',
      admin2: 'Province of Surigao del Sur',
      timezone: 'Asia/Manila',
      population: 4385,
    },
    {
      id: 2270110,
      name: 'Carrascal',
      latitude: 39.88776,
      longitude: -8.51999,
      country_code: 'PT',
      country: 'Portugal',
      admin1: 'Leiria District',
      admin2: 'Pombal Municipality',
      timezone: 'Europe/Lisbon',
      population: null,
    },
  ],
};

export function mockFetchJson(body: unknown, init: { status?: number } = {}) {
  return vi.fn(async () => new Response(JSON.stringify(body), { status: init.status ?? 200 }));
}
