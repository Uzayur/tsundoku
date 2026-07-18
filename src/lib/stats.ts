import { Series, SeriesType, Volume } from '~/src/db/models';

/**
 * Chart windows. Month-based windows show a fixed number of trailing months
 * (including empty ones); `'all'` collapses the whole history into year bars so
 * it stays readable no matter how much history there is.
 */
export type Period = '3m' | '6m' | 'year' | 'all';

/** Number of trailing month buckets for each month-based period. */
const MONTH_COUNTS: Record<Exclude<Period, 'all'>, number> = {
  '3m': 3,
  '6m': 6,
  year: 12,
};

export interface PeriodBucket {
  key: string; // month key '2026-03' for month windows, year '2026' for 'all'
  books: number; // number of read volumes finished in that bucket
  pages: number; // sum of pageCount (treat null as 0) for those volumes
}

/**
 * A volume counts as "read" for stats only when its status is 'read'
 * and it has a non-null finishedAt ISO date.
 */
function isRead(volume: Volume): volume is Volume & { finishedAt: string } {
  return volume.status === 'read' && volume.finishedAt !== null;
}

/**
 * The trailing `count` month keys ending at `now`'s month, oldest first,
 * e.g. `['2026-01', … , '2026-06']`.
 */
function trailingMonthKeys(now: Date, count: number): string[] {
  const keys: string[] = [];
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-based
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(year, month - i, 1);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return keys;
}

/**
 * Aggregate read volumes into chart buckets. Month windows (`3m`/`6m`/`year`)
 * return exactly N trailing month buckets, filling gaps with zeros so the axis
 * stays continuous; `all` returns one bucket per year that has data, ascending.
 * `now` is injected so callers stay testable.
 */
export function aggregate(
  volumes: Volume[],
  period: Period,
  now: Date = new Date(),
): PeriodBucket[] {
  if (period === 'all') {
    const yearly = new Map<string, PeriodBucket>();
    for (const volume of volumes) {
      if (!isRead(volume)) {
        continue;
      }
      const key = volume.finishedAt.slice(0, 4);
      const bucket = yearly.get(key) ?? { key, books: 0, pages: 0 };
      bucket.books += 1;
      bucket.pages += volume.pageCount ?? 0;
      yearly.set(key, bucket);
    }
    return Array.from(yearly.values()).sort((a, b) => a.key.localeCompare(b.key));
  }

  return monthWindow(volumes, now, MONTH_COUNTS[period]);
}

/** The `count` trailing month buckets ending at `end`'s month, zero-filled. */
function monthWindow(volumes: Volume[], end: Date, count: number): PeriodBucket[] {
  const keys = trailingMonthKeys(end, count);
  const buckets = new Map<string, PeriodBucket>(
    keys.map((key) => [key, { key, books: 0, pages: 0 }]),
  );
  for (const volume of volumes) {
    if (!isRead(volume)) {
      continue;
    }
    const bucket = buckets.get(volume.finishedAt.slice(0, 7));
    if (bucket) {
      bucket.books += 1;
      bucket.pages += volume.pageCount ?? 0;
    }
  }
  return keys.map((key) => buckets.get(key)!);
}

/**
 * Split a month-based window into pages of N trailing months so the chart can be
 * swiped a whole block at a time. Pages run oldest-first, so the last entry is
 * the current block; there are exactly enough pages to reach the earliest read
 * month (at least one, all-zero, when nothing has been read). `all` has no blocks
 * to page through, so it returns its single year-bar chart as one page.
 */
export function aggregatePages(
  volumes: Volume[],
  period: Period,
  now: Date = new Date(),
): PeriodBucket[][] {
  if (period === 'all') {
    return [aggregate(volumes, 'all', now)];
  }

  const size = MONTH_COUNTS[period];
  let earliest: string | null = null;
  for (const volume of volumes) {
    if (!isRead(volume)) {
      continue;
    }
    const month = volume.finishedAt.slice(0, 7);
    if (earliest === null || month < earliest) {
      earliest = month;
    }
  }

  let pageCount = 1;
  if (earliest !== null) {
    const [year, month] = earliest.split('-').map(Number);
    const span = (now.getFullYear() - year) * 12 + (now.getMonth() + 1 - month) + 1;
    pageCount = Math.max(1, Math.ceil(span / size));
  }

  const pages: PeriodBucket[][] = [];
  for (let page = pageCount - 1; page >= 0; page--) {
    const end = new Date(now.getFullYear(), now.getMonth() - page * size, 1);
    pages.push(monthWindow(volumes, end, size));
  }
  return pages;
}

/** Count of read volumes with a finishedAt date. */
export function totalBooksRead(volumes: Volume[]): number {
  return volumes.filter(isRead).length;
}

/**
 * Count of volumes currently being read. Unlike the other counters this is a
 * snapshot of right now, not a lifetime total, so it needs no finishedAt.
 */
export function booksInProgress(volumes: Volume[]): number {
  return volumes.filter((volume) => volume.status === 'reading').length;
}

/** Sum of pageCount (null treated as 0) over read volumes with a finishedAt date. */
export function totalPagesRead(volumes: Volume[]): number {
  return volumes.filter(isRead).reduce((sum, volume) => sum + (volume.pageCount ?? 0), 0);
}

/**
 * Count series per type, keeping only types with a count > 0, sorted by
 * count descending.
 */
export function typeDistribution(series: Series[]): { type: SeriesType; count: number }[] {
  const counts = new Map<SeriesType, number>();
  for (const s of series) {
    counts.set(s.type, (counts.get(s.type) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([type, count]) => ({ type, count }))
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.count - a.count);
}

export interface CompletedSeries {
  id: number;
  title: string;
  type: SeriesType;
  coverUrl: string | null;
  /** Latest finishedAt among the series' read volumes. */
  completedAt: string;
  /** Read volume count — the subline for manga/bd/comic. */
  tomes: number;
  /** Sum of read pageCount — the subline for novels. */
  pages: number;
}

/**
 * Completed series, most recently finished first, limited to `limit`. A series
 * counts as completed when its status is 'completed'; its completion date is
 * derived as the latest finishedAt across its read volumes. Completed series
 * with no dated read volume are omitted, since they can't be placed on the
 * timeline.
 */
export function recentlyCompleted(
  series: Series[],
  volumesBySeriesId: Record<number, Volume[]>,
  limit = 5,
): CompletedSeries[] {
  const rows: CompletedSeries[] = [];
  for (const s of series) {
    if (s.status !== 'completed') {
      continue;
    }
    const read = (volumesBySeriesId[s.id] ?? []).filter(isRead);
    if (read.length === 0) {
      continue;
    }
    const completedAt = read.reduce(
      (latest, v) => (v.finishedAt > latest ? v.finishedAt : latest),
      read[0].finishedAt,
    );
    rows.push({
      id: s.id,
      title: s.title,
      type: s.type,
      coverUrl: s.coverUrl,
      completedAt,
      tomes: read.length,
      pages: read.reduce((sum, v) => sum + (v.pageCount ?? 0), 0),
    });
  }
  return rows.sort((a, b) => b.completedAt.localeCompare(a.completedAt)).slice(0, limit);
}

/**
 * Average pages per read book, rounded to the nearest integer. Returns 0 when
 * no books have been read.
 */
export function pagesPerBook(volumes: Volume[]): number {
  const books = totalBooksRead(volumes);
  if (books === 0) {
    return 0;
  }
  return Math.round(totalPagesRead(volumes) / books);
}
