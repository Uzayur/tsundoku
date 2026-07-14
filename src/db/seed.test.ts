import { listSeries, listVolumes } from '~/src/db/queries';
import { migrate } from '~/src/db/schema';
import { seedIfEmpty } from '~/src/db/seed';
import { createTestDb } from '~/src/db/testDb';

describe('seedIfEmpty', () => {
  it('seeds series with volumes into an empty database', async () => {
    const db = createTestDb();
    await migrate(db);
    const inserted = await seedIfEmpty(db);
    expect(inserted).toBeGreaterThanOrEqual(2);

    const series = await listSeries(db);
    expect(series.length).toBe(inserted);

    // every seeded series has at least one volume
    for (const s of series) {
      expect((await listVolumes(db, s.id)).length).toBeGreaterThan(0);
    }
  });

  it('is a no-op when the database already has series', async () => {
    const db = createTestDb();
    await migrate(db);
    await seedIfEmpty(db);
    const countAfterFirst = (await listSeries(db)).length;

    const secondResult = await seedIfEmpty(db);
    expect(secondResult).toBe(0);
    expect((await listSeries(db)).length).toBe(countAfterFirst);
  });
});
