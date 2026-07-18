import { Db } from '~/src/db/database';
import { NewSeries, NewVolume, Series, Volume, VolumeStatus } from '~/src/db/models';
import {
  rowToSeries,
  rowToVolume,
  SeriesRow,
  seriesInsertParams,
  VolumeRow,
  volumeInsertParams,
} from '~/src/db/serialize';

const SERIES_COLS =
  'title, author, type, total_volumes, external_ids, cover_url, genres, status, added_at, description, publisher, published_year, pages_per_tome';
const VOLUME_COLS =
  'series_id, number, isbn, title, page_count, cover_url, status, current_page, started_at, finished_at';

export async function insertSeries(db: Db, input: NewSeries): Promise<number> {
  const res = await db.run(
    `INSERT INTO series (${SERIES_COLS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    seriesInsertParams(input),
  );
  return res.lastInsertRowId;
}

export async function getSeries(db: Db, id: number): Promise<Series | null> {
  const row = await db.getFirst<SeriesRow>('SELECT * FROM series WHERE id = ?', [id]);
  return row ? rowToSeries(row) : null;
}

export async function listSeries(db: Db): Promise<Series[]> {
  const rows = await db.all<SeriesRow>('SELECT * FROM series ORDER BY title');
  return rows.map(rowToSeries);
}

export async function updateSeries(db: Db, id: number, patch: Partial<NewSeries>): Promise<void> {
  const sets: string[] = [];
  const params: unknown[] = [];
  const push = (col: string, value: unknown) => {
    sets.push(`${col} = ?`);
    params.push(value);
  };
  if (patch.title !== undefined) push('title', patch.title);
  if (patch.author !== undefined) push('author', patch.author);
  if (patch.type !== undefined) push('type', patch.type);
  if (patch.totalVolumes !== undefined) push('total_volumes', patch.totalVolumes);
  if (patch.externalIds !== undefined) push('external_ids', JSON.stringify(patch.externalIds));
  if (patch.coverUrl !== undefined) push('cover_url', patch.coverUrl);
  if (patch.genres !== undefined) push('genres', JSON.stringify(patch.genres));
  if (patch.status !== undefined) push('status', patch.status);
  if (patch.description !== undefined) push('description', patch.description);
  if (patch.publisher !== undefined) push('publisher', patch.publisher);
  if (patch.publishedYear !== undefined) push('published_year', patch.publishedYear);
  if (patch.pagesPerTome !== undefined) push('pages_per_tome', patch.pagesPerTome);
  if (sets.length === 0) return;
  params.push(id);
  await db.run(`UPDATE series SET ${sets.join(', ')} WHERE id = ?`, params);
}

export async function deleteSeries(db: Db, id: number): Promise<void> {
  await db.run('DELETE FROM series WHERE id = ?', [id]);
}

export async function insertVolume(db: Db, input: NewVolume): Promise<number> {
  const res = await db.run(
    `INSERT INTO volumes (${VOLUME_COLS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    volumeInsertParams(input),
  );
  return res.lastInsertRowId;
}

export async function listVolumes(db: Db, seriesId: number): Promise<Volume[]> {
  const rows = await db.all<VolumeRow>(
    'SELECT * FROM volumes WHERE series_id = ? ORDER BY number',
    [seriesId],
  );
  return rows.map(rowToVolume);
}

export async function setVolumeStatus(db: Db, id: number, status: VolumeStatus): Promise<void> {
  await db.run('UPDATE volumes SET status = ? WHERE id = ?', [status, id]);
}

export async function setVolumeFinishedAt(
  db: Db,
  id: number,
  finishedAt: string | null,
): Promise<void> {
  await db.run('UPDATE volumes SET finished_at = ? WHERE id = ?', [finishedAt, id]);
}

export async function setVolumePageCount(db: Db, id: number, pages: number | null): Promise<void> {
  await db.run('UPDATE volumes SET page_count = ? WHERE id = ?', [pages, id]);
}

export async function setVolumeCurrentPage(db: Db, id: number, page: number | null): Promise<void> {
  await db.run('UPDATE volumes SET current_page = ? WHERE id = ?', [page, id]);
}

export async function deleteVolume(db: Db, id: number): Promise<void> {
  await db.run('DELETE FROM volumes WHERE id = ?', [id]);
}
