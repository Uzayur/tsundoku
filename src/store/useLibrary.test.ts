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
