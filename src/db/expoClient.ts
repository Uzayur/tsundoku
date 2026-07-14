import * as SQLite from 'expo-sqlite';

import { Db } from '~/src/db/database';
import { migrate } from '~/src/db/schema';
import { seedIfEmpty } from '~/src/db/seed';

function wrap(sdb: SQLite.SQLiteDatabase): Db {
  return {
    exec: (sql) => sdb.execAsync(sql),
    all: <T>(sql: string, params: unknown[] = []) =>
      sdb.getAllAsync<T>(sql, params as SQLite.SQLiteBindValue[]),
    getFirst: async <T>(sql: string, params: unknown[] = []) =>
      (await sdb.getFirstAsync<T>(sql, params as SQLite.SQLiteBindValue[])) ?? null,
    run: async (sql, params: unknown[] = []) => {
      const r = await sdb.runAsync(sql, params as SQLite.SQLiteBindValue[]);
      return { lastInsertRowId: r.lastInsertRowId, changes: r.changes };
    },
  };
}

let dbPromise: Promise<Db> | null = null;

/** Opens the on-device database, migrates, and seeds. Memoized. */
export function openDatabase(): Promise<Db> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const sdb = await SQLite.openDatabaseAsync('tsundoku.db');
      const db = wrap(sdb);
      await db.exec('PRAGMA foreign_keys = ON;');
      await migrate(db);
      await seedIfEmpty(db);
      return db;
    })();
  }
  return dbPromise;
}
