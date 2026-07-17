import { Series, Volume } from '~/src/db/models';

export interface RecentRead {
  series: Series;
  /** Max finishedAt across the series' read tomes. Never null. */
  lastReadAt: string;
}

/**
 * Same rule as stats.ts: a tome counts as read only when its status says so
 * AND it carries a date.
 */
function isRead(volume: Volume): volume is Volume & { finishedAt: string } {
  return volume.status === 'read' && volume.finishedAt !== null;
}

/**
 * The `limit` most recently added series, newest first. Series added before
 * migration 4 have no addedAt and sort last, newest id first — they cannot be
 * placed on the timeline, so they go behind anything that can.
 */
export function recentlyAdded(series: Series[], limit = 3): Series[] {
  return [...series]
    .sort((a, b) => {
      if (a.addedAt === null && b.addedAt === null) return b.id - a.id;
      if (a.addedAt === null) return 1;
      if (b.addedAt === null) return -1;
      // ISO timestamps sort correctly as strings.
      return b.addedAt.localeCompare(a.addedAt) || b.id - a.id;
    })
    .slice(0, limit);
}

/**
 * The `limit` series whose most recent tome was finished last — regardless of
 * whether the series itself is finished. Series without a single dated read
 * tome are excluded.
 */
export function recentlyRead(
  series: Series[],
  volumesBySeriesId: Record<number, Volume[]>,
  limit = 3,
): RecentRead[] {
  const entries: RecentRead[] = [];

  for (const item of series) {
    const dates = (volumesBySeriesId[item.id] ?? []).filter(isRead).map((v) => v.finishedAt);
    if (dates.length === 0) continue;
    // A legacy date-only value is a prefix of a same-day timestamp, so string
    // comparison keeps it earlier — the chronologically correct order.
    const lastReadAt = dates.reduce((max, d) => (d > max ? d : max));
    entries.push({ series: item, lastReadAt });
  }

  return entries
    .sort((a, b) => b.lastReadAt.localeCompare(a.lastReadAt) || b.series.id - a.series.id)
    .slice(0, limit);
}
