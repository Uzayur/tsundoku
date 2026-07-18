import { Series, Volume } from '~/src/db/models';
import {
  aggregate,
  booksInProgress,
  pagesPerBook,
  recentlyCompleted,
  totalBooksRead,
  totalPagesRead,
  typeDistribution,
} from '~/src/lib/stats';

function makeSeries(overrides: Partial<Series> = {}): Series {
  return {
    id: 1,
    title: 'Série',
    author: null,
    type: 'manga',
    totalVolumes: null,
    externalIds: {},
    coverUrl: null,
    genres: [],
    status: 'reading',
    addedAt: null,
    description: null,
    publisher: null,
    publishedYear: null,
    ...overrides,
  };
}

function makeVolume(overrides: Partial<Volume> = {}): Volume {
  return {
    id: 1,
    seriesId: 1,
    number: 1,
    isbn: null,
    title: null,
    pageCount: null,
    coverUrl: null,
    status: 'read',
    currentPage: null,
    startedAt: null,
    finishedAt: '2026-01-15',
    ...overrides,
  };
}

describe('aggregate', () => {
  // A fixed "now" so the trailing-month windows are deterministic.
  const now = new Date(2026, 5, 15); // June 2026 (month is 0-based)

  it('returns the trailing 6 months, filling empty months with zeros', () => {
    const volumes: Volume[] = [
      makeVolume({ id: 1, finishedAt: '2026-03-10', pageCount: 200 }),
      makeVolume({ id: 2, finishedAt: '2026-03-22', pageCount: 180 }),
      makeVolume({ id: 3, finishedAt: '2026-06-05', pageCount: 150 }),
      // read but WITHOUT finishedAt → excluded
      makeVolume({ id: 4, finishedAt: null, pageCount: 999 }),
      // not read → excluded
      makeVolume({ id: 5, status: 'reading', finishedAt: '2026-06-01', pageCount: 999 }),
      // null pageCount → treated as 0
      makeVolume({ id: 6, finishedAt: '2026-06-20', pageCount: null }),
    ];

    expect(aggregate(volumes, '6m', now)).toEqual([
      { key: '2026-01', books: 0, pages: 0 },
      { key: '2026-02', books: 0, pages: 0 },
      { key: '2026-03', books: 2, pages: 380 },
      { key: '2026-04', books: 0, pages: 0 },
      { key: '2026-05', books: 0, pages: 0 },
      { key: '2026-06', books: 2, pages: 150 },
    ]);
  });

  it('returns exactly the trailing 3 months for 3m, spanning a year boundary', () => {
    const start = new Date(2026, 1, 10); // February 2026
    const volumes: Volume[] = [
      makeVolume({ id: 1, finishedAt: '2025-12-31', pageCount: 100 }),
      makeVolume({ id: 2, finishedAt: '2026-02-01', pageCount: 50 }),
      // outside the 3-month window (Dec, Jan, Feb) → excluded
      makeVolume({ id: 3, finishedAt: '2025-11-30', pageCount: 999 }),
    ];

    expect(aggregate(volumes, '3m', start)).toEqual([
      { key: '2025-12', books: 1, pages: 100 },
      { key: '2026-01', books: 0, pages: 0 },
      { key: '2026-02', books: 1, pages: 50 },
    ]);
  });

  it('returns 12 trailing months for year', () => {
    const buckets = aggregate([], 'year', now);
    expect(buckets).toHaveLength(12);
    expect(buckets[0].key).toBe('2025-07');
    expect(buckets[11].key).toBe('2026-06');
  });

  it('buckets by year across multiple years for all, ascending', () => {
    const volumes: Volume[] = [
      makeVolume({ id: 1, finishedAt: '2025-11-10', pageCount: 300 }),
      makeVolume({ id: 2, finishedAt: '2026-01-10', pageCount: 100 }),
      makeVolume({ id: 3, finishedAt: '2026-09-10', pageCount: 50 }),
    ];

    expect(aggregate(volumes, 'all', now)).toEqual([
      { key: '2025', books: 1, pages: 300 },
      { key: '2026', books: 2, pages: 150 },
    ]);
  });

  it('returns an empty array for all when nothing qualifies', () => {
    const volumes: Volume[] = [
      makeVolume({ id: 1, status: 'owned', finishedAt: null }),
      makeVolume({ id: 2, status: 'read', finishedAt: null }),
    ];
    expect(aggregate(volumes, 'all', now)).toEqual([]);
  });
});

describe('totalBooksRead', () => {
  it('counts only read volumes with a finishedAt date', () => {
    const volumes: Volume[] = [
      makeVolume({ id: 1, finishedAt: '2026-01-01' }),
      makeVolume({ id: 2, finishedAt: '2026-02-01' }),
      makeVolume({ id: 3, finishedAt: null }),
      makeVolume({ id: 4, status: 'reading', finishedAt: '2026-02-01' }),
    ];
    expect(totalBooksRead(volumes)).toBe(2);
  });
});

describe('booksInProgress', () => {
  it('counts volumes currently being read, whatever their page or date', () => {
    const volumes: Volume[] = [
      makeVolume({ id: 1, status: 'reading', currentPage: 80, finishedAt: null }),
      makeVolume({ id: 2, status: 'reading', currentPage: null, finishedAt: null }),
      makeVolume({ id: 3, status: 'read', finishedAt: '2026-01-01' }),
      makeVolume({ id: 4, status: 'owned', finishedAt: null }),
      makeVolume({ id: 5, status: 'wishlist', finishedAt: null }),
    ];
    expect(booksInProgress(volumes)).toBe(2);
  });

  it('returns 0 when nothing is being read', () => {
    expect(booksInProgress([makeVolume({ id: 1, status: 'owned' })])).toBe(0);
    expect(booksInProgress([])).toBe(0);
  });
});

describe('totalPagesRead', () => {
  it('sums pageCount over read+finished volumes, treating null as 0', () => {
    const volumes: Volume[] = [
      makeVolume({ id: 1, finishedAt: '2026-01-01', pageCount: 200 }),
      makeVolume({ id: 2, finishedAt: '2026-02-01', pageCount: null }),
      makeVolume({ id: 3, finishedAt: '2026-02-01', pageCount: 120 }),
      makeVolume({ id: 4, finishedAt: null, pageCount: 999 }),
      makeVolume({ id: 5, status: 'owned', finishedAt: '2026-02-01', pageCount: 999 }),
    ];
    expect(totalPagesRead(volumes)).toBe(320);
  });
});

describe('typeDistribution', () => {
  it('counts series per type, omits zero-count types, sorts by count desc', () => {
    const series: Series[] = [
      makeSeries({ id: 1, type: 'manga' }),
      makeSeries({ id: 2, type: 'manga' }),
      makeSeries({ id: 3, type: 'manga' }),
      makeSeries({ id: 4, type: 'novel' }),
      makeSeries({ id: 5, type: 'novel' }),
      makeSeries({ id: 6, type: 'bd' }),
    ];
    expect(typeDistribution(series)).toEqual([
      { type: 'manga', count: 3 },
      { type: 'novel', count: 2 },
      { type: 'bd', count: 1 },
    ]);
  });

  it('returns an empty array when there are no series', () => {
    expect(typeDistribution([])).toEqual([]);
  });
});

describe('recentlyCompleted', () => {
  it('lists completed series by derived completion date desc, with type-appropriate tallies', () => {
    const series: Series[] = [
      makeSeries({ id: 1, title: 'Death Note', type: 'manga', status: 'completed' }),
      makeSeries({ id: 2, title: 'Fondation', type: 'novel', status: 'completed' }),
      // not completed → excluded
      makeSeries({ id: 3, title: 'En cours', type: 'manga', status: 'reading' }),
    ];
    const volumesBySeriesId: Record<number, Volume[]> = {
      1: [
        makeVolume({ id: 10, seriesId: 1, finishedAt: '2026-07-01', pageCount: 190 }),
        makeVolume({ id: 11, seriesId: 1, finishedAt: '2026-07-14', pageCount: 200 }),
        // owned but unread → not counted in tomes/date
        makeVolume({ id: 12, seriesId: 1, status: 'owned', finishedAt: null }),
      ],
      2: [makeVolume({ id: 20, seriesId: 2, finishedAt: '2026-07-02', pageCount: 504 })],
      3: [makeVolume({ id: 30, seriesId: 3, finishedAt: '2026-07-20' })],
    };

    expect(recentlyCompleted(series, volumesBySeriesId)).toEqual([
      {
        id: 1,
        title: 'Death Note',
        type: 'manga',
        coverUrl: null,
        completedAt: '2026-07-14',
        tomes: 2,
        pages: 390,
      },
      {
        id: 2,
        title: 'Fondation',
        type: 'novel',
        coverUrl: null,
        completedAt: '2026-07-02',
        tomes: 1,
        pages: 504,
      },
    ]);
  });

  it('omits completed series with no dated read volume', () => {
    const series: Series[] = [makeSeries({ id: 1, status: 'completed' })];
    const volumesBySeriesId: Record<number, Volume[]> = {
      1: [makeVolume({ id: 10, seriesId: 1, status: 'read', finishedAt: null })],
    };
    expect(recentlyCompleted(series, volumesBySeriesId)).toEqual([]);
  });

  it('respects the limit and keeps the most recent', () => {
    const series: Series[] = [1, 2, 3].map((id) =>
      makeSeries({ id, title: `S${id}`, status: 'completed' }),
    );
    const volumesBySeriesId: Record<number, Volume[]> = {
      1: [makeVolume({ id: 10, seriesId: 1, finishedAt: '2026-01-01' })],
      2: [makeVolume({ id: 20, seriesId: 2, finishedAt: '2026-02-01' })],
      3: [makeVolume({ id: 30, seriesId: 3, finishedAt: '2026-03-01' })],
    };
    const result = recentlyCompleted(series, volumesBySeriesId, 2);
    expect(result.map((r) => r.title)).toEqual(['S3', 'S2']);
  });

  it('returns an empty array when nothing is completed', () => {
    expect(recentlyCompleted([makeSeries({ status: 'reading' })], {})).toEqual([]);
  });
});

describe('pagesPerBook', () => {
  it('rounds total pages divided by total books read', () => {
    const volumes: Volume[] = [
      makeVolume({ id: 1, finishedAt: '2026-01-01', pageCount: 200 }),
      makeVolume({ id: 2, finishedAt: '2026-02-01', pageCount: 150 }),
      makeVolume({ id: 3, finishedAt: '2026-03-01', pageCount: 100 }),
    ];
    // (200 + 150 + 100) / 3 = 150
    expect(pagesPerBook(volumes)).toBe(150);
  });

  it('rounds to the nearest integer', () => {
    const volumes: Volume[] = [
      makeVolume({ id: 1, finishedAt: '2026-01-01', pageCount: 100 }),
      makeVolume({ id: 2, finishedAt: '2026-02-01', pageCount: 101 }),
    ];
    // 201 / 2 = 100.5 → 101
    expect(pagesPerBook(volumes)).toBe(101);
  });

  it('returns 0 when there are no read books', () => {
    const volumes: Volume[] = [makeVolume({ id: 1, status: 'owned', finishedAt: null })];
    expect(pagesPerBook(volumes)).toBe(0);
  });
});
