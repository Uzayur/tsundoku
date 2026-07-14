import { Db } from '~/src/db/database';

export async function getCached(db: Db, key: string): Promise<string | null> {
  const row = await db.getFirst<{ value: string }>('SELECT value FROM api_cache WHERE key = ?', [
    key,
  ]);
  return row ? row.value : null;
}

export async function setCached(db: Db, key: string, value: string): Promise<void> {
  await db.run('INSERT OR REPLACE INTO api_cache (key, value, fetched_at) VALUES (?, ?, ?)', [
    key,
    value,
    new Date().toISOString(),
  ]);
}
