import { CARRASCAL_RESPONSE, mockFetchJson } from '../test/openMeteoFixtures.ts';
import { GeocodingError, placeLabel, rankResults, searchPlaces, splitQuery } from './geo.ts';

afterEach(() => vi.unstubAllGlobals());

describe('placeLabel', () => {
  it('uses the province for Philippine places and strips "Province of"', () => {
    expect(placeLabel(CARRASCAL_RESPONSE.results[1] as never)).toBe(
      'Carrascal, Surigao del Sur, Philippines',
    );
  });
  it('uses admin1 elsewhere', () => {
    expect(placeLabel(CARRASCAL_RESPONSE.results[0] as never)).toBe(
      'Carrascal, Castille and León, Spain',
    );
  });
});

describe('splitQuery / rankResults', () => {
  it('splits name and hint at the first comma', () => {
    expect(splitQuery(' Carrascal, Surigao del Sur ')).toEqual({
      name: 'Carrascal',
      hint: 'surigao del sur',
    });
  });

  it('ranks Philippine results first', () => {
    const ranked = rankResults(CARRASCAL_RESPONSE.results, 'Carrascal');
    expect(ranked[0]?.country_code).toBe('PH');
  });

  it('uses the text after the comma to rank among non-PH results', () => {
    const ranked = rankResults(CARRASCAL_RESPONSE.results, 'Carrascal, Leiria');
    expect(ranked.map((r) => r.country_code)).toEqual(['PH', 'PT', 'ES']);
  });
});

describe('searchPlaces', () => {
  it('queries Open-Meteo with the name part only and returns mapped places', async () => {
    const fetchMock = mockFetchJson(CARRASCAL_RESPONSE);
    vi.stubGlobal('fetch', fetchMock);
    const results = await searchPlaces('Carrascal, Surigao del Sur', {
      baseUrl: 'https://geo.test/v1/search',
    });
    const url = new URL(String((fetchMock.mock.calls[0] as unknown[])[0]));
    expect(url.origin + url.pathname).toBe('https://geo.test/v1/search');
    expect(url.searchParams.get('name')).toBe('Carrascal');
    expect(url.searchParams.get('language')).toBe('en');
    expect(results[0]).toEqual({
      id: 1718262,
      name: 'Carrascal, Surigao del Sur, Philippines',
      label: 'Carrascal, Surigao del Sur, Philippines',
      lat: 9.37028,
      lon: 125.94917,
      tz: 'Asia/Manila',
      countryCode: 'PH',
    });
  });

  it('returns [] without calling the API for 1-character queries', async () => {
    const fetchMock = mockFetchJson(CARRASCAL_RESPONSE);
    vi.stubGlobal('fetch', fetchMock);
    expect(await searchPlaces('C')).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('handles "no results" (Open-Meteo omits the results key)', async () => {
    vi.stubGlobal('fetch', mockFetchJson({ generationtime_ms: 0.5 }));
    expect(await searchPlaces('Xyzzyville')).toEqual([]);
  });

  it('drops results without a timezone', async () => {
    const body = { results: [{ ...CARRASCAL_RESPONSE.results[1], timezone: undefined }] };
    vi.stubGlobal('fetch', mockFetchJson(body));
    expect(await searchPlaces('Carrascal')).toEqual([]);
  });

  it('throws GeocodingError on HTTP errors', async () => {
    vi.stubGlobal('fetch', mockFetchJson({}, { status: 503 }));
    await expect(searchPlaces('Carrascal')).rejects.toBeInstanceOf(GeocodingError);
  });
});
