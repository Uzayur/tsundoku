import { Db } from '~/src/db/database';
import { Series } from '~/src/db/models';
import { migrate } from '~/src/db/schema';
import { createTestDb } from '~/src/db/testDb';
import { BackupData } from '~/src/lib/backup';

// useLibrary calls openDatabase() from ~/src/db/expoClient internally (an
// expo-sqlite wrapper that doesn't run under jest). Point it at an in-memory
// test DB instead, so the store's actions hit real SQL without touching
// expo-sqlite.
let testDb: Db;
jest.mock('~/src/db/expoClient', () => ({
  openDatabase: () => Promise.resolve(testDb),
}));

// eslint-disable-next-line import/first -- must come after the jest.mock above
import { useLibrary } from '~/src/store/useLibrary';

function makeSeries(overrides: Partial<Series> & { id: number; title: string }): Series {
  return {
    author: null,
    type: 'manga',
    totalVolumes: 17,
    externalIds: {},
    coverUrl: null,
    genres: [],
    status: 'reading',
    addedAt: null,
    ...overrides,
  };
}

beforeEach(async () => {
  testDb = createTestDb();
  await migrate(testDb);
});

describe('importBackup', () => {
  it('preserves a known addedAt and nulls one that is absent from the backup entirely', async () => {
    const dated = makeSeries({
      id: 1,
      title: 'Chainsaw Man',
      addedAt: '2026-01-12T00:00:00.000Z',
    });
    // A backup exported before this feature existed has no addedAt key at
    // all — not null, absent — even though the Series type claims
    // `string | null`. Build the object without the key to match runtime
    // reality rather than the type.
    const legacy = makeSeries({ id: 2, title: 'Berserk' }) as Partial<Series>;
    delete legacy.addedAt;

    const data: BackupData = {
      series: [dated, legacy as Series],
      volumesBySeriesId: { 1: [], 2: [] },
    };

    await useLibrary.getState().importBackup(data);

    const restored = useLibrary.getState().series;
    expect(restored.find((s) => s.title === 'Chainsaw Man')?.addedAt).toBe(
      '2026-01-12T00:00:00.000Z',
    );
    expect(restored.find((s) => s.title === 'Berserk')?.addedAt).toBeNull();
  });
});

describe('setVolumeCurrentPage', () => {
  /** A scanned roman: one tome, page count known from the ISBN lookup. */
  async function seedRoman(pageCount: number | null): Promise<number> {
    const seriesId = await useLibrary
      .getState()
      .addSeries(
        makeSeries({ id: 0, title: 'La Horde du Contrevent', type: 'novel', totalVolumes: 1 }),
      );
    await useLibrary.getState().setVolumeState(seriesId, 1, 'owned');
    const volume = useLibrary.getState().volumesBySeriesId[seriesId][0];
    await testDb.run('UPDATE volumes SET page_count = ? WHERE id = ?', [pageCount, volume.id]);
    await useLibrary.getState().load();
    return seriesId;
  }

  function vol1(seriesId: number) {
    return useLibrary.getState().volumesBySeriesId[seriesId][0];
  }

  it('marks the tome read when the current page reaches the total', async () => {
    const seriesId = await seedRoman(392);
    await useLibrary.getState().setVolumeCurrentPage(seriesId, 1, 392);

    expect(vol1(seriesId).status).toBe('read');
    expect(vol1(seriesId).finishedAt).not.toBeNull();
  });

  it('marks the tome read when the current page overshoots the total', async () => {
    const seriesId = await seedRoman(392);
    await useLibrary.getState().setVolumeCurrentPage(seriesId, 1, 400);

    expect(vol1(seriesId).status).toBe('read');
  });

  it('leaves a partial read in progress with no finish date', async () => {
    const seriesId = await seedRoman(392);
    await useLibrary.getState().setVolumeCurrentPage(seriesId, 1, 80);

    expect(vol1(seriesId).status).toBe('reading');
    expect(vol1(seriesId).finishedAt).toBeNull();
  });

  it('reopens a finished tome when the page is corrected back below the total', async () => {
    const seriesId = await seedRoman(392);
    await useLibrary.getState().setVolumeCurrentPage(seriesId, 1, 392);
    await useLibrary.getState().setVolumeCurrentPage(seriesId, 1, 80);

    expect(vol1(seriesId).status).toBe('reading');
    expect(vol1(seriesId).finishedAt).toBeNull();
  });

  it('never auto-finishes when the page count is unknown', async () => {
    const seriesId = await seedRoman(null);
    await useLibrary.getState().setVolumeCurrentPage(seriesId, 1, 999);

    expect(vol1(seriesId).status).toBe('reading');
  });

  it('persists the finish to the database, not just the in-memory state', async () => {
    const seriesId = await seedRoman(392);
    await useLibrary.getState().setVolumeCurrentPage(seriesId, 1, 392);
    await useLibrary.getState().load();

    expect(vol1(seriesId).status).toBe('read');
    expect(vol1(seriesId).finishedAt).not.toBeNull();
  });
});
