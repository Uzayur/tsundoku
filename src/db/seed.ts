import { Db } from '~/src/db/database';
import { NewSeries, NewVolume } from '~/src/db/models';
import { insertSeries, insertVolume } from '~/src/db/queries';

type SeedVolume = Omit<NewVolume, 'seriesId'>;

function vol(
  number: number,
  status: NewVolume['status'],
  pageCount: number,
  finishedAt: string | null = null,
): SeedVolume {
  return {
    number,
    status,
    pageCount,
    isbn: null,
    title: null,
    coverUrl: null,
    currentPage: null,
    startedAt: null,
    finishedAt,
  };
}

const SEED: { series: NewSeries; volumes: SeedVolume[] }[] = [
  {
    series: {
      title: 'Chainsaw Man',
      author: 'Tatsuki Fujimoto',
      type: 'manga',
      totalVolumes: 17,
      externalIds: { anilist: 105778 },
      coverUrl: null,
      genres: ['Shonen', 'Action', 'Horror'],
      status: 'reading',
    },
    volumes: [
      vol(1, 'read', 192, '2026-01-12'),
      vol(2, 'read', 192, '2026-02-08'),
      vol(3, 'owned', 200),
    ],
  },
  {
    series: {
      title: 'Berserk',
      author: 'Kentaro Miura',
      type: 'manga',
      totalVolumes: 42,
      externalIds: { anilist: 30002 },
      coverUrl: null,
      genres: ['Seinen', 'Dark Fantasy'],
      status: 'reading',
    },
    volumes: [vol(1, 'read', 224, '2026-03-20'), vol(2, 'owned', 224), vol(3, 'wishlist', 224)],
  },
  {
    series: {
      title: 'Frieren',
      author: 'Kanehito Yamada',
      type: 'manga',
      totalVolumes: 13,
      externalIds: { anilist: 118586 },
      coverUrl: null,
      genres: ['Shonen', 'Fantasy', 'Adventure'],
      status: 'reading',
    },
    volumes: [vol(1, 'read', 192, '2026-04-05'), vol(2, 'wishlist', 192)],
  },
];

/** Inserts sample data only if the series table is empty. Returns number of series inserted. */
export async function seedIfEmpty(db: Db): Promise<number> {
  const row = await db.getFirst<{ count: number }>('SELECT COUNT(*) AS count FROM series');
  if ((row?.count ?? 0) > 0) return 0;
  for (const entry of SEED) {
    const seriesId = await insertSeries(db, entry.series);
    for (const v of entry.volumes) {
      await insertVolume(db, { ...v, seriesId });
    }
  }
  return SEED.length;
}
