import { Volume } from '~/src/db/models';

export type Period = 'month' | 'quarter' | 'semester' | 'year';

export interface PeriodBucket {
  key: string; // e.g. '2026-03', '2026-Q1', '2026-S1', '2026'
  books: number; // number of read volumes finished in that bucket
  pages: number; // sum of pageCount (treat null as 0) for those volumes
}

/**
 * Derive a period bucket key from an ISO date. Only the leading
 * `YYYY-MM-DD` prefix is used, so full ISO timestamps are accepted too.
 */
export function periodKey(isoDate: string, period: Period): string {
  const year = isoDate.slice(0, 4);
  const month = Number(isoDate.slice(5, 7));

  switch (period) {
    case 'month':
      return isoDate.slice(0, 7);
    case 'quarter':
      return `${year}-Q${Math.floor((month - 1) / 3) + 1}`;
    case 'semester':
      return `${year}-S${month <= 6 ? 1 : 2}`;
    case 'year':
      return year;
  }
}

/**
 * A volume counts as "read" for stats only when its status is 'read'
 * and it has a non-null finishedAt ISO date.
 */
function isRead(volume: Volume): volume is Volume & { finishedAt: string } {
  return volume.status === 'read' && volume.finishedAt !== null;
}

/**
 * Aggregate read volumes into period buckets, sorted ascending by key.
 */
export function aggregate(volumes: Volume[], period: Period): PeriodBucket[] {
  const buckets = new Map<string, PeriodBucket>();

  for (const volume of volumes) {
    if (!isRead(volume)) {
      continue;
    }
    const key = periodKey(volume.finishedAt, period);
    const bucket = buckets.get(key) ?? { key, books: 0, pages: 0 };
    bucket.books += 1;
    bucket.pages += volume.pageCount ?? 0;
    buckets.set(key, bucket);
  }

  return Array.from(buckets.values()).sort((a, b) => a.key.localeCompare(b.key));
}

/** Count of read volumes with a finishedAt date. */
export function totalBooksRead(volumes: Volume[]): number {
  return volumes.filter(isRead).length;
}

/** Sum of pageCount (null treated as 0) over read volumes with a finishedAt date. */
export function totalPagesRead(volumes: Volume[]): number {
  return volumes.filter(isRead).reduce((sum, volume) => sum + (volume.pageCount ?? 0), 0);
}
