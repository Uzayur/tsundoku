import { Db } from '~/src/db/database';
import { NewSeries, NewVolume } from '~/src/db/models';
import {
  deleteSeries,
  deleteVolume,
  getSeries,
  insertSeries,
  insertVolume,
  listSeries,
  listVolumes,
  setVolumeCurrentPage,
  setVolumeFinishedAt,
  setVolumeStatus,
  updateSeries,
} from '~/src/db/queries';
import { migrate } from '~/src/db/schema';
import { createTestDb } from '~/src/db/testDb';

const sampleSeries: NewSeries = {
  title: 'Chainsaw Man',
  author: 'Tatsuki Fujimoto',
  type: 'manga',
  totalVolumes: 17,
  externalIds: { anilist: 105778 },
  coverUrl: null,
  genres: ['Shonen', 'Action'],
  status: 'reading',
};

function sampleVolume(seriesId: number, number: number): NewVolume {
  return {
    seriesId,
    number,
    isbn: null,
    title: null,
    pageCount: 192,
    coverUrl: null,
    status: 'owned',
    currentPage: null,
    startedAt: null,
    finishedAt: null,
  };
}

async function freshDb(): Promise<Db> {
  const db = createTestDb();
  await migrate(db);
  return db;
}

describe('series queries', () => {
  it('inserts and reads back a series with JSON fields intact', async () => {
    const db = await freshDb();
    const id = await insertSeries(db, sampleSeries);
    const got = await getSeries(db, id);
    expect(got).toEqual({ id, ...sampleSeries });
  });

  it('getSeries returns null for a missing id', async () => {
    const db = await freshDb();
    expect(await getSeries(db, 999)).toBeNull();
  });

  it('listSeries returns all series ordered by title', async () => {
    const db = await freshDb();
    await insertSeries(db, { ...sampleSeries, title: 'Zebra' });
    await insertSeries(db, { ...sampleSeries, title: 'Alpha' });
    const titles = (await listSeries(db)).map((s) => s.title);
    expect(titles).toEqual(['Alpha', 'Zebra']);
  });

  it('updateSeries patches only provided fields', async () => {
    const db = await freshDb();
    const id = await insertSeries(db, sampleSeries);
    await updateSeries(db, id, { status: 'completed', genres: ['Shonen', 'Action', 'Horror'] });
    const got = await getSeries(db, id);
    expect(got?.status).toBe('completed');
    expect(got?.genres).toEqual(['Shonen', 'Action', 'Horror']);
    expect(got?.title).toBe('Chainsaw Man'); // untouched
  });

  it('deleteSeries removes the series and cascades to its volumes', async () => {
    const db = await freshDb();
    const id = await insertSeries(db, sampleSeries);
    await insertVolume(db, sampleVolume(id, 1));
    await deleteSeries(db, id);
    expect(await getSeries(db, id)).toBeNull();
    expect(await listVolumes(db, id)).toHaveLength(0);
  });
});

describe('volume queries', () => {
  it('inserts volumes and lists them ordered by number', async () => {
    const db = await freshDb();
    const sid = await insertSeries(db, sampleSeries);
    await insertVolume(db, sampleVolume(sid, 3));
    await insertVolume(db, sampleVolume(sid, 1));
    await insertVolume(db, sampleVolume(sid, 2));
    const numbers = (await listVolumes(db, sid)).map((v) => v.number);
    expect(numbers).toEqual([1, 2, 3]);
  });

  it('setVolumeStatus updates just the status', async () => {
    const db = await freshDb();
    const sid = await insertSeries(db, sampleSeries);
    const vid = await insertVolume(db, sampleVolume(sid, 1));
    await setVolumeStatus(db, vid, 'read');
    const vols = await listVolumes(db, sid);
    expect(vols[0].status).toBe('read');
  });

  it('setVolumeFinishedAt records and clears the finished date', async () => {
    const db = await freshDb();
    const sid = await insertSeries(db, sampleSeries);
    const vid = await insertVolume(db, sampleVolume(sid, 1));
    await setVolumeFinishedAt(db, vid, '2026-03-15');
    expect((await listVolumes(db, sid))[0].finishedAt).toBe('2026-03-15');
    await setVolumeFinishedAt(db, vid, null);
    expect((await listVolumes(db, sid))[0].finishedAt).toBeNull();
  });

  it('setVolumeCurrentPage records the current page', async () => {
    const db = await freshDb();
    const sid = await insertSeries(db, sampleSeries);
    const vid = await insertVolume(db, sampleVolume(sid, 1));
    await setVolumeCurrentPage(db, vid, 75);
    expect((await listVolumes(db, sid))[0].currentPage).toBe(75);
  });

  it('deleteVolume removes only that volume', async () => {
    const db = await freshDb();
    const sid = await insertSeries(db, sampleSeries);
    const v1 = await insertVolume(db, sampleVolume(sid, 1));
    await insertVolume(db, sampleVolume(sid, 2));
    await deleteVolume(db, v1);
    const numbers = (await listVolumes(db, sid)).map((v) => v.number);
    expect(numbers).toEqual([2]);
  });
});
