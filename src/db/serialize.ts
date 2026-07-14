import { NewSeries, NewVolume, Series, Volume } from '~/src/db/models';

export interface SeriesRow {
  id: number;
  title: string;
  type: string;
  total_volumes: number | null;
  external_ids: string;
  cover_url: string | null;
  genres: string;
  status: string;
}

export interface VolumeRow {
  id: number;
  series_id: number;
  number: number;
  isbn: string | null;
  title: string | null;
  page_count: number | null;
  cover_url: string | null;
  status: string;
  current_page: number | null;
  started_at: string | null;
  finished_at: string | null;
}

export function rowToSeries(r: SeriesRow): Series {
  return {
    id: r.id,
    title: r.title,
    type: r.type as Series['type'],
    totalVolumes: r.total_volumes,
    externalIds: JSON.parse(r.external_ids) as Record<string, string | number>,
    coverUrl: r.cover_url,
    genres: JSON.parse(r.genres) as string[],
    status: r.status as Series['status'],
  };
}

export function rowToVolume(r: VolumeRow): Volume {
  return {
    id: r.id,
    seriesId: r.series_id,
    number: r.number,
    isbn: r.isbn,
    title: r.title,
    pageCount: r.page_count,
    coverUrl: r.cover_url,
    status: r.status as Volume['status'],
    currentPage: r.current_page,
    startedAt: r.started_at,
    finishedAt: r.finished_at,
  };
}

/** Column order: title, type, total_volumes, external_ids, cover_url, genres, status */
export function seriesInsertParams(s: NewSeries): unknown[] {
  return [
    s.title,
    s.type,
    s.totalVolumes ?? null,
    JSON.stringify(s.externalIds ?? {}),
    s.coverUrl ?? null,
    JSON.stringify(s.genres ?? []),
    s.status,
  ];
}

/** Column order: series_id, number, isbn, title, page_count, cover_url, status, current_page, started_at, finished_at */
export function volumeInsertParams(v: NewVolume): unknown[] {
  return [
    v.seriesId,
    v.number,
    v.isbn ?? null,
    v.title ?? null,
    v.pageCount ?? null,
    v.coverUrl ?? null,
    v.status,
    v.currentPage ?? null,
    v.startedAt ?? null,
    v.finishedAt ?? null,
  ];
}
