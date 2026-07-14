import { Volume } from '~/src/db/models';
import { aggregate, periodKey, totalBooksRead, totalPagesRead } from '~/src/lib/stats';

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

describe('periodKey', () => {
  it('derives the month key', () => {
    expect(periodKey('2026-03-15', 'month')).toBe('2026-03');
    expect(periodKey('2026-08-01', 'month')).toBe('2026-08');
  });

  it('derives the quarter key', () => {
    expect(periodKey('2026-01-31', 'quarter')).toBe('2026-Q1');
    expect(periodKey('2026-03-15', 'quarter')).toBe('2026-Q1');
    expect(periodKey('2026-04-01', 'quarter')).toBe('2026-Q2');
    expect(periodKey('2026-06-30', 'quarter')).toBe('2026-Q2');
    expect(periodKey('2026-08-01', 'quarter')).toBe('2026-Q3');
    expect(periodKey('2026-09-30', 'quarter')).toBe('2026-Q3');
    expect(periodKey('2026-10-01', 'quarter')).toBe('2026-Q4');
    expect(periodKey('2026-12-31', 'quarter')).toBe('2026-Q4');
  });

  it('derives the semester key', () => {
    expect(periodKey('2026-01-15', 'semester')).toBe('2026-S1');
    expect(periodKey('2026-06-30', 'semester')).toBe('2026-S1');
    expect(periodKey('2026-07-01', 'semester')).toBe('2026-S2');
    expect(periodKey('2026-08-01', 'semester')).toBe('2026-S2');
    expect(periodKey('2026-12-31', 'semester')).toBe('2026-S2');
  });

  it('derives the year key', () => {
    expect(periodKey('2026-03-15', 'year')).toBe('2026');
    expect(periodKey('2025-12-31', 'year')).toBe('2025');
  });

  it('works with full ISO timestamps using only the date prefix', () => {
    expect(periodKey('2026-03-15T22:13:00.000Z', 'month')).toBe('2026-03');
    expect(periodKey('2026-08-01T00:00:00Z', 'quarter')).toBe('2026-Q3');
  });
});

describe('aggregate', () => {
  it('buckets read+finished volumes by month, sorted ascending, summing books and pages', () => {
    const volumes: Volume[] = [
      makeVolume({ id: 1, finishedAt: '2026-03-10', pageCount: 200 }),
      makeVolume({ id: 2, finishedAt: '2026-03-22', pageCount: 180 }),
      makeVolume({ id: 3, finishedAt: '2026-01-05', pageCount: 150 }),
      // read but WITHOUT finishedAt → excluded
      makeVolume({ id: 4, finishedAt: null, pageCount: 999 }),
      // not read → excluded
      makeVolume({ id: 5, status: 'reading', finishedAt: '2026-03-01', pageCount: 999 }),
      // null pageCount → treated as 0
      makeVolume({ id: 6, finishedAt: '2026-01-20', pageCount: null }),
    ];

    expect(aggregate(volumes, 'month')).toEqual([
      { key: '2026-01', books: 2, pages: 150 },
      { key: '2026-03', books: 2, pages: 380 },
    ]);
  });

  it('buckets by quarter', () => {
    const volumes: Volume[] = [
      makeVolume({ id: 1, finishedAt: '2026-02-10', pageCount: 100 }),
      makeVolume({ id: 2, finishedAt: '2026-05-10', pageCount: 100 }),
      makeVolume({ id: 3, finishedAt: '2026-08-10', pageCount: 100 }),
    ];

    expect(aggregate(volumes, 'quarter')).toEqual([
      { key: '2026-Q1', books: 1, pages: 100 },
      { key: '2026-Q2', books: 1, pages: 100 },
      { key: '2026-Q3', books: 1, pages: 100 },
    ]);
  });

  it('buckets by year across multiple years', () => {
    const volumes: Volume[] = [
      makeVolume({ id: 1, finishedAt: '2025-11-10', pageCount: 300 }),
      makeVolume({ id: 2, finishedAt: '2026-01-10', pageCount: 100 }),
      makeVolume({ id: 3, finishedAt: '2026-09-10', pageCount: 50 }),
    ];

    expect(aggregate(volumes, 'year')).toEqual([
      { key: '2025', books: 1, pages: 300 },
      { key: '2026', books: 2, pages: 150 },
    ]);
  });

  it('returns an empty array when nothing qualifies', () => {
    const volumes: Volume[] = [
      makeVolume({ id: 1, status: 'owned', finishedAt: null }),
      makeVolume({ id: 2, status: 'read', finishedAt: null }),
    ];
    expect(aggregate(volumes, 'month')).toEqual([]);
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
