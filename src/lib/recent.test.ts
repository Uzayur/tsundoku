import { Series, Volume } from '~/src/db/models';
import { recentlyAdded, recentlyRead } from '~/src/lib/recent';

function makeSeries(id: number, addedAt: string | null, title = `S${id}`): Series {
  return {
    id,
    title,
    author: null,
    type: 'manga',
    totalVolumes: 10,
    externalIds: {},
    coverUrl: null,
    genres: [],
    status: 'reading',
    addedAt,
    description: null,
    publisher: null,
    publishedYear: null,
  };
}

function makeVolume(overrides: Partial<Volume> & { id: number; seriesId: number }): Volume {
  return {
    number: 1,
    isbn: null,
    title: null,
    pageCount: 192,
    coverUrl: null,
    status: 'read',
    currentPage: null,
    startedAt: null,
    finishedAt: null,
    ...overrides,
  };
}

describe('recentlyAdded', () => {
  it('sorts by addedAt descending and caps at the limit', () => {
    const series = [
      makeSeries(1, '2026-07-01T00:00:00.000Z'),
      makeSeries(2, '2026-07-15T00:00:00.000Z'),
      makeSeries(3, '2026-07-10T00:00:00.000Z'),
      makeSeries(4, '2026-07-05T00:00:00.000Z'),
    ];
    expect(recentlyAdded(series).map((s) => s.id)).toEqual([2, 3, 4]);
  });

  it('orders series added the same day by timestamp, not by id', () => {
    const series = [
      makeSeries(1, '2026-07-17T18:00:00.000Z'),
      makeSeries(2, '2026-07-17T09:00:00.000Z'),
    ];
    expect(recentlyAdded(series).map((s) => s.id)).toEqual([1, 2]);
  });

  it('puts series with a null addedAt last, newest id first among them', () => {
    const series = [
      makeSeries(1, null),
      makeSeries(2, null),
      makeSeries(3, '2026-01-01T00:00:00.000Z'),
    ];
    expect(recentlyAdded(series).map((s) => s.id)).toEqual([3, 2, 1]);
  });

  it('does not mutate its input', () => {
    const series = [
      makeSeries(1, '2026-07-01T00:00:00.000Z'),
      makeSeries(2, '2026-07-15T00:00:00.000Z'),
    ];
    recentlyAdded(series);
    expect(series.map((s) => s.id)).toEqual([1, 2]);
  });

  it('returns an empty array for an empty library', () => {
    expect(recentlyAdded([])).toEqual([]);
  });

  it('honours a custom limit', () => {
    const series = [
      makeSeries(1, '2026-07-01T00:00:00.000Z'),
      makeSeries(2, '2026-07-15T00:00:00.000Z'),
    ];
    expect(recentlyAdded(series, 1).map((s) => s.id)).toEqual([2]);
  });
});

describe('recentlyRead', () => {
  it('ranks series by their most recently finished tome', () => {
    const series = [makeSeries(1, null), makeSeries(2, null), makeSeries(3, null)];
    const volumes = {
      1: [
        makeVolume({ id: 1, seriesId: 1, number: 1, finishedAt: '2026-07-01T00:00:00.000Z' }),
        makeVolume({ id: 2, seriesId: 1, number: 2, finishedAt: '2026-07-16T00:00:00.000Z' }),
      ],
      2: [makeVolume({ id: 3, seriesId: 2, number: 1, finishedAt: '2026-07-10T00:00:00.000Z' })],
      3: [makeVolume({ id: 4, seriesId: 3, number: 1, finishedAt: '2026-07-17T00:00:00.000Z' })],
    };
    const result = recentlyRead(series, volumes);
    expect(result.map((r) => r.series.id)).toEqual([3, 1, 2]);
    expect(result[0].lastReadAt).toBe('2026-07-17T00:00:00.000Z');
    // The max across the series' tomes, not the last one in the array.
    expect(result[1].lastReadAt).toBe('2026-07-16T00:00:00.000Z');
  });

  it('includes unfinished series — recency of reading, not completion', () => {
    const series = [makeSeries(1, null)];
    const volumes = {
      1: [
        makeVolume({ id: 1, seriesId: 1, number: 1, finishedAt: '2026-07-16T00:00:00.000Z' }),
        makeVolume({ id: 2, seriesId: 1, number: 2, status: 'owned' }),
      ],
    };
    expect(recentlyRead(series, volumes).map((r) => r.series.id)).toEqual([1]);
  });

  it('excludes series with no finished tome', () => {
    const series = [makeSeries(1, null), makeSeries(2, null), makeSeries(3, null)];
    const volumes = {
      1: [makeVolume({ id: 1, seriesId: 1, finishedAt: '2026-07-16T00:00:00.000Z' })],
      2: [makeVolume({ id: 2, seriesId: 2, status: 'owned' })],
      // series 3 has no volumes at all — absent from the map
    };
    expect(recentlyRead(series, volumes).map((r) => r.series.id)).toEqual([1]);
  });

  it('ignores tomes that are read but have no finishedAt, and dated tomes that are not read', () => {
    const series = [makeSeries(1, null), makeSeries(2, null)];
    const volumes = {
      1: [makeVolume({ id: 1, seriesId: 1, status: 'read', finishedAt: null })],
      2: [
        makeVolume({
          id: 2,
          seriesId: 2,
          status: 'reading',
          finishedAt: '2026-07-16T00:00:00.000Z',
        }),
      ],
    };
    expect(recentlyRead(series, volumes)).toEqual([]);
  });

  it('orders a legacy date-only value before a same-day full timestamp', () => {
    const series = [makeSeries(1, null), makeSeries(2, null)];
    const volumes = {
      1: [makeVolume({ id: 1, seriesId: 1, finishedAt: '2026-07-17' })],
      2: [makeVolume({ id: 2, seriesId: 2, finishedAt: '2026-07-17T10:00:00.000Z' })],
    };
    expect(recentlyRead(series, volumes).map((r) => r.series.id)).toEqual([2, 1]);
  });

  it('breaks ties on identical timestamps by newest series id', () => {
    const series = [makeSeries(1, null), makeSeries(2, null)];
    const volumes = {
      1: [makeVolume({ id: 1, seriesId: 1, finishedAt: '2026-07-17T10:00:00.000Z' })],
      2: [makeVolume({ id: 2, seriesId: 2, finishedAt: '2026-07-17T10:00:00.000Z' })],
    };
    expect(recentlyRead(series, volumes).map((r) => r.series.id)).toEqual([2, 1]);
  });

  it('caps at the limit', () => {
    const series = [1, 2, 3, 4].map((id) => makeSeries(id, null));
    const volumes: Record<number, Volume[]> = {
      1: [makeVolume({ id: 1, seriesId: 1, finishedAt: '2026-07-01T00:00:00.000Z' })],
      2: [makeVolume({ id: 2, seriesId: 2, finishedAt: '2026-07-02T00:00:00.000Z' })],
      3: [makeVolume({ id: 3, seriesId: 3, finishedAt: '2026-07-03T00:00:00.000Z' })],
      4: [makeVolume({ id: 4, seriesId: 4, finishedAt: '2026-07-04T00:00:00.000Z' })],
    };
    expect(recentlyRead(series, volumes).map((r) => r.series.id)).toEqual([4, 3, 2]);
  });

  it('returns an empty array for an empty library', () => {
    expect(recentlyRead([], {})).toEqual([]);
  });
});
