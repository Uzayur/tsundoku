import Database from 'better-sqlite3';

import { Db } from '~/src/db/database';

/** In-memory SQLite for tests. Fresh per call; vanishes when GC'd. */
export function createTestDb(): Db {
  const sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = ON');
  return {
    async exec(sql) {
      sqlite.exec(sql);
    },
    async all<T>(sql: string, params: unknown[] = []): Promise<T[]> {
      return sqlite.prepare(sql).all(...params) as T[];
    },
    async getFirst<T>(sql: string, params: unknown[] = []): Promise<T | null> {
      return (sqlite.prepare(sql).get(...params) as T | undefined) ?? null;
    },
    async run(sql: string, params: unknown[] = []) {
      const info = sqlite.prepare(sql).run(...params);
      return { lastInsertRowId: Number(info.lastInsertRowid), changes: info.changes };
    },
  };
}
