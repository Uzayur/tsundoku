import { getCached, setCached } from '~/src/db/cache';
import { Db } from '~/src/db/database';
import { migrate, MIGRATIONS } from '~/src/db/schema';
import { createTestDb } from '~/src/db/testDb';

async function version(db: Db): Promise<number> {
  const row = await db.getFirst<{ user_version: number }>('PRAGMA user_version');
  return row?.user_version ?? 0;
}

describe('migration #2 (api_cache)', () => {
  it('creates the api_cache table and bumps user_version to the migration count', async () => {
    const db = createTestDb();
    await migrate(db);
    expect(await version(db)).toBe(MIGRATIONS.length);
    const tables = await db.all<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table'",
    );
    expect(tables.map((t) => t.name)).toContain('api_cache');
  });

  it('upgrades a v1 install without touching existing data', async () => {
    const db = createTestDb();
    // Simulate an existing v1 install: series/volumes exist, user_version = 1.
    await db.exec('CREATE TABLE series (id INTEGER PRIMARY KEY, title TEXT)');
    await db.exec('CREATE TABLE volumes (id INTEGER PRIMARY KEY)');
    await db.run('INSERT INTO series (title) VALUES (?)', ['Kept']);
    await db.exec('PRAGMA user_version = 1');

    await migrate(db);

    expect(await version(db)).toBe(MIGRATIONS.length);
    const rows = await db.all<{ title: string }>('SELECT title FROM series');
    expect(rows).toEqual([{ title: 'Kept' }]);
    const cache = await db.all('SELECT * FROM api_cache');
    expect(cache).toEqual([]);
  });
});

describe('cache get/set', () => {
  it('stores and reads back a value', async () => {
    const db = createTestDb();
    await migrate(db);
    expect(await getCached(db, 'k')).toBeNull();
    await setCached(db, 'k', '{"hello":1}');
    expect(await getCached(db, 'k')).toBe('{"hello":1}');
  });

  it('overwrites an existing key', async () => {
    const db = createTestDb();
    await migrate(db);
    await setCached(db, 'k', 'first');
    await setCached(db, 'k', 'second');
    expect(await getCached(db, 'k')).toBe('second');
  });
});
