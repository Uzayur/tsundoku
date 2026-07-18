import { Db } from '~/src/db/database';

const MIGRATION_1 = `
CREATE TABLE series (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  title         TEXT    NOT NULL,
  type          TEXT    NOT NULL,
  total_volumes INTEGER,
  external_ids  TEXT    NOT NULL DEFAULT '{}',
  cover_url     TEXT,
  genres        TEXT    NOT NULL DEFAULT '[]',
  status        TEXT    NOT NULL DEFAULT 'reading'
);
CREATE TABLE volumes (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  series_id    INTEGER NOT NULL REFERENCES series(id) ON DELETE CASCADE,
  number       INTEGER NOT NULL,
  isbn         TEXT,
  title        TEXT,
  page_count   INTEGER,
  cover_url    TEXT,
  status       TEXT    NOT NULL DEFAULT 'wishlist',
  current_page INTEGER,
  started_at   TEXT,
  finished_at  TEXT,
  UNIQUE (series_id, number)
);
CREATE INDEX idx_volumes_series ON volumes(series_id);
`;

const MIGRATION_2 = `
CREATE TABLE api_cache (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  fetched_at TEXT NOT NULL
);
`;

const MIGRATION_3 = `
ALTER TABLE series ADD COLUMN author TEXT;
`;

const MIGRATION_4 = `
ALTER TABLE series ADD COLUMN added_at TEXT;
`;

const MIGRATION_5 = `
ALTER TABLE series ADD COLUMN description TEXT;
ALTER TABLE series ADD COLUMN publisher TEXT;
ALTER TABLE series ADD COLUMN published_year INTEGER;
`;

const MIGRATION_6 = `
ALTER TABLE series ADD COLUMN pages_per_tome INTEGER;
`;

export const MIGRATIONS: string[] = [
  MIGRATION_1,
  MIGRATION_2,
  MIGRATION_3,
  MIGRATION_4,
  MIGRATION_5,
  MIGRATION_6,
];

export async function migrate(db: Db): Promise<void> {
  const row = await db.getFirst<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;
  for (let v = current; v < MIGRATIONS.length; v++) {
    await db.exec(MIGRATIONS[v]);
    await db.exec(`PRAGMA user_version = ${v + 1}`);
  }
}
