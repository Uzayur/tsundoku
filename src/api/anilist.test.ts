import { AniListMedia, fetchSeries, normalizeMedia } from '~/src/api/anilist';

function makeMedia(overrides: Partial<AniListMedia> = {}): AniListMedia {
  return {
    id: 105778,
    format: 'MANGA',
    volumes: 24,
    chapters: 232,
    status: 'FINISHED',
    genres: ['Action', 'Comedy', 'Drama'],
    title: { romaji: 'Chainsaw Man', english: 'Chainsaw Man' },
    coverImage: { large: 'https://example.com/cover.jpg' },
    description: 'A boy and his chainsaw devil dog.',
    ...overrides,
  };
}

describe('normalizeMedia', () => {
  it('prefers english title over romaji', () => {
    const result = normalizeMedia(
      makeMedia({ title: { romaji: 'Chainsaw Man', english: 'Chainsaw Man EN' } }),
    );
    expect(result.series.title).toBe('Chainsaw Man EN');
  });

  it('falls back to romaji when english is null', () => {
    const result = normalizeMedia(
      makeMedia({ title: { romaji: 'Kimetsu no Yaiba', english: null } }),
    );
    expect(result.series.title).toBe('Kimetsu no Yaiba');
  });

  it('falls back to (sans titre) when both titles are null', () => {
    const result = normalizeMedia(makeMedia({ title: { romaji: null, english: null } }));
    expect(result.series.title).toBe('(sans titre)');
  });

  it('maps MANGA format to manga type', () => {
    expect(normalizeMedia(makeMedia({ format: 'MANGA' })).series.type).toBe('manga');
    expect(normalizeMedia(makeMedia({ format: 'MANHWA' })).series.type).toBe('manga');
    expect(normalizeMedia(makeMedia({ format: 'MANHUA' })).series.type).toBe('manga');
  });

  it('maps NOVEL and LIGHT_NOVEL formats to novel type', () => {
    expect(normalizeMedia(makeMedia({ format: 'NOVEL' })).series.type).toBe('novel');
    expect(normalizeMedia(makeMedia({ format: 'LIGHT_NOVEL' })).series.type).toBe('novel');
  });

  it('maps ONE_SHOT, unknown, and null formats to manga type', () => {
    expect(normalizeMedia(makeMedia({ format: 'ONE_SHOT' })).series.type).toBe('manga');
    expect(normalizeMedia(makeMedia({ format: 'SOMETHING_ELSE' })).series.type).toBe('manga');
    expect(normalizeMedia(makeMedia({ format: null })).series.type).toBe('manga');
  });

  it('maps null volumes to null totalVolumes', () => {
    expect(normalizeMedia(makeMedia({ volumes: null })).series.totalVolumes).toBeNull();
  });

  it('maps numeric volumes to totalVolumes', () => {
    expect(normalizeMedia(makeMedia({ volumes: 24 })).series.totalVolumes).toBe(24);
  });

  it('stores the anilist id in externalIds', () => {
    const result = normalizeMedia(makeMedia({ id: 105778 }));
    expect(result.series.externalIds).toEqual({ anilist: 105778 });
  });

  it('maps genres and cover image', () => {
    const result = normalizeMedia(
      makeMedia({
        genres: ['Action', 'Drama'],
        coverImage: { large: 'https://example.com/x.jpg' },
      }),
    );
    expect(result.series.genres).toEqual(['Action', 'Drama']);
    expect(result.series.coverUrl).toBe('https://example.com/x.jpg');
  });

  it('defaults genres to an empty array when missing', () => {
    const result = normalizeMedia(makeMedia({ genres: undefined as unknown as string[] }));
    expect(result.series.genres).toEqual([]);
  });

  it('maps null cover to null coverUrl', () => {
    const result = normalizeMedia(makeMedia({ coverImage: { large: null } }));
    expect(result.series.coverUrl).toBeNull();
  });

  it('sets status to reading', () => {
    expect(normalizeMedia(makeMedia()).series.status).toBe('reading');
  });

  it('exposes anilistId and description at the top level', () => {
    const result = normalizeMedia(makeMedia({ id: 42, description: 'hi' }));
    expect(result.anilistId).toBe(42);
    expect(result.description).toBe('hi');
  });

  it('maps null description to null', () => {
    expect(normalizeMedia(makeMedia({ description: null })).description).toBeNull();
  });
});

describe('fetchSeries', () => {
  it('posts to the AniList endpoint and returns normalized results', async () => {
    const fixture = {
      data: {
        Page: {
          media: [
            makeMedia(),
            makeMedia({
              id: 30002,
              title: { romaji: 'Berserk', english: null },
              format: 'MANGA',
              volumes: null,
            }),
          ],
        },
      },
    };
    const calls: { url: string; init?: unknown }[] = [];
    const fakeFetch = async (url: string, init?: unknown) => {
      calls.push({ url, init });
      return { ok: true, status: 200, json: async () => fixture };
    };

    const results = await fetchSeries('chainsaw', fakeFetch);

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe('https://graphql.anilist.co');
    expect(results).toHaveLength(2);
    expect(results[0].series.title).toBe('Chainsaw Man');
    expect(results[0].series.externalIds).toEqual({ anilist: 105778 });
    expect(results[1].series.title).toBe('Berserk');
    expect(results[1].series.totalVolumes).toBeNull();
  });

  it('sends the search query in the request body', async () => {
    let capturedBody: string | undefined;
    const fakeFetch = async (
      _url: string,
      init?: { method?: string; headers?: Record<string, string>; body?: string },
    ) => {
      capturedBody = init?.body;
      return {
        ok: true,
        status: 200,
        json: async () => ({ data: { Page: { media: [] } } }),
      };
    };

    await fetchSeries('berserk', fakeFetch);

    expect(capturedBody).toBeDefined();
    const parsed = JSON.parse(capturedBody as string);
    expect(parsed.variables).toEqual({ search: 'berserk' });
    expect(typeof parsed.query).toBe('string');
  });

  it('returns an empty array when media is missing', async () => {
    const fakeFetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({ data: {} }),
    });
    const results = await fetchSeries('nothing', fakeFetch);
    expect(results).toEqual([]);
  });

  it('rejects when the response is not ok', async () => {
    const fakeFetch = async () => ({
      ok: false,
      status: 429,
      json: async () => ({}),
    });
    await expect(fetchSeries('rate limited', fakeFetch)).rejects.toThrow(
      'AniList request failed: 429',
    );
  });
});
