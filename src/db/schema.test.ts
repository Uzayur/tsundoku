import { Db } from '~/src/db/database';
import { migrate, MIGRATIONS } from '~/src/db/schema';
import { createTestDb } from '~/src/db/testDb';

async function version(db: Db): Promise<number> {
  const row = await db.getFirst<{ user_version: number }>('PRAGMA user_version');
  return row?.user_version ?? 0;
}

describe('migrate', () => {
  it('creates the series and volumes tables', async () => {
    const db = createTestDb();
    await migrate(db);
    const tables = await db.all<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
    );
    expect(tables.map((t) => t.name)).toEqual(expect.arrayContaining(['series', 'volumes']));
  });

  it('bumps user_version to the migration count', async () => {
    const db = createTestDb();
    await migrate(db);
    expect(await version(db)).toBe(MIGRATIONS.length);
  });

  it('is idempotent — running twice does not throw or re-create', async () => {
    const db = createTestDb();
    await migrate(db);
    await migrate(db); // would throw "table already exists" if it re-ran a migration
    expect(await version(db)).toBe(MIGRATIONS.length);
  });

  it('enforces UNIQUE(series_id, number) on volumes', async () => {
    const db = createTestDb();
    await migrate(db);
    const s = await db.run('INSERT INTO series (title, type) VALUES (?, ?)', ['S', 'manga']);
    await db.run('INSERT INTO volumes (series_id, number) VALUES (?, ?)', [s.lastInsertRowId, 1]);
    await expect(
      db.run('INSERT INTO volumes (series_id, number) VALUES (?, ?)', [s.lastInsertRowId, 1]),
    ).rejects.toThrow();
  });

  it('cascade-deletes volumes when a series is deleted', async () => {
    const db = createTestDb();
    await migrate(db);
    const s = await db.run('INSERT INTO series (title, type) VALUES (?, ?)', ['S', 'manga']);
    await db.run('INSERT INTO volumes (series_id, number) VALUES (?, ?)', [s.lastInsertRowId, 1]);
    await db.run('DELETE FROM series WHERE id = ?', [s.lastInsertRowId]);
    const vols = await db.all('SELECT * FROM volumes');
    expect(vols).toHaveLength(0);
  });
});
