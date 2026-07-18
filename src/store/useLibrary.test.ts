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

// Creating a tome resolves its length over the network, and a scan asks AniList
// to identify the work; keep the suite offline.
jest.mock('~/src/api/openlibrary', () => ({ lookupPagesByTitle: jest.fn() }));
jest.mock('~/src/api/googlebooks', () => ({ lookupMangaPages: jest.fn() }));
jest.mock('~/src/api/anilist', () => ({ fetchSeries: jest.fn() }));

// eslint-disable-next-line import/first -- must come after the jest.mock above
import { fetchSeries } from '~/src/api/anilist';
// eslint-disable-next-line import/first -- must come after the jest.mock above
import { lookupMangaPages } from '~/src/api/googlebooks';
// eslint-disable-next-line import/first -- must come after the jest.mock above
import { BookMetadata } from '~/src/api/isbn';
// eslint-disable-next-line import/first -- must come after the jest.mock above
import { lookupPagesByTitle } from '~/src/api/openlibrary';
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
    description: null,
    publisher: null,
    publishedYear: null,
    pagesPerTome: null,
    ...overrides,
  };
}

beforeEach(async () => {
  testDb = createTestDb();
  await migrate(testDb);
  jest.mocked(lookupPagesByTitle).mockReset();
  jest.mocked(lookupPagesByTitle).mockResolvedValue(null);
  jest.mocked(lookupMangaPages).mockReset();
  jest.mocked(lookupMangaPages).mockResolvedValue(null);
  jest.mocked(fetchSeries).mockReset();
  jest.mocked(fetchSeries).mockResolvedValue([]);
  useLibrary.setState({ series: [], volumesBySeriesId: {}, pendingPages: null });
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

describe('setVolumeState progression sync', () => {
  // A roman part-way through: known length, a page already reached.
  async function seedReading(pageCount: number, currentPage: number): Promise<number> {
    const seriesId = await useLibrary
      .getState()
      .addSeries(
        makeSeries({ id: 0, title: 'La Horde du Contrevent', type: 'novel', totalVolumes: 1 }),
      );
    await useLibrary.getState().setVolumeState(seriesId, 1, 'owned');
    const volume = useLibrary.getState().volumesBySeriesId[seriesId][0];
    await testDb.run('UPDATE volumes SET page_count = ? WHERE id = ?', [pageCount, volume.id]);
    await useLibrary.getState().load();
    await useLibrary.getState().setVolumeCurrentPage(seriesId, 1, currentPage);
    return seriesId;
  }

  function vol1(seriesId: number) {
    return useLibrary.getState().volumesBySeriesId[seriesId][0];
  }

  it('fills the progression to the last page when marked read', async () => {
    const seriesId = await seedReading(392, 80);

    await useLibrary.getState().setVolumeState(seriesId, 1, 'read');

    expect(vol1(seriesId).status).toBe('read');
    expect(vol1(seriesId).currentPage).toBe(392);
  });

  it('resets the progression to zero when marked possédé', async () => {
    const seriesId = await seedReading(392, 80);

    await useLibrary.getState().setVolumeState(seriesId, 1, 'owned');

    expect(vol1(seriesId).status).toBe('owned');
    expect(vol1(seriesId).currentPage).toBe(0);
  });

  it('resets the progression to zero when marked wishlist', async () => {
    const seriesId = await seedReading(392, 80);

    await useLibrary.getState().setVolumeState(seriesId, 1, 'wishlist');

    expect(vol1(seriesId).status).toBe('wishlist');
    expect(vol1(seriesId).currentPage).toBe(0);
  });

  it('keeps the page and stays in progress when marked en cours below the total', async () => {
    const seriesId = await seedReading(392, 80);

    await useLibrary.getState().setVolumeState(seriesId, 1, 'reading');

    expect(vol1(seriesId).status).toBe('reading');
    expect(vol1(seriesId).currentPage).toBe(80);
  });

  it('folds en cours to read when the last page was already reached', async () => {
    const seriesId = await seedReading(392, 392);

    await useLibrary.getState().setVolumeState(seriesId, 1, 'reading');

    expect(vol1(seriesId).status).toBe('read');
    expect(vol1(seriesId).currentPage).toBe(392);
    expect(vol1(seriesId).finishedAt).not.toBeNull();
  });

  it('persists the reset progression to the database, not just memory', async () => {
    const seriesId = await seedReading(392, 80);

    await useLibrary.getState().setVolumeState(seriesId, 1, 'owned');
    await useLibrary.getState().load();

    expect(vol1(seriesId).currentPage).toBe(0);
  });
});

describe('setVolumeState page count resolution', () => {
  async function seedSeries(overrides: Partial<Series> = {}): Promise<number> {
    return useLibrary.getState().addSeries(makeSeries({ id: 0, title: 'One Piece', ...overrides }));
  }

  it('keeps the standard manga length when Google Books finds nothing', async () => {
    jest.mocked(lookupMangaPages).mockResolvedValue(null);
    const seriesId = await seedSeries(); // makeSeries defaults to type 'manga'

    await useLibrary.getState().setVolumeState(seriesId, 1, 'read');

    expect(useLibrary.getState().volumesBySeriesId[seriesId][0].pageCount).toBe(192);
    expect(lookupPagesByTitle).not.toHaveBeenCalled(); // manga never hits OpenLibrary
    expect(useLibrary.getState().pendingPages).toBeNull(); // and never prompts
  });

  it('refines a manga tome to the real Google Books length when found', async () => {
    jest.mocked(lookupMangaPages).mockResolvedValue(208);
    const seriesId = await seedSeries();

    await useLibrary.getState().setVolumeState(seriesId, 2, 'read');

    const tome = useLibrary.getState().volumesBySeriesId[seriesId][0];
    expect(tome.pageCount).toBe(208);
    expect(lookupMangaPages).toHaveBeenCalledWith('One Piece', 2);
  });

  it('resolves a non-manga page count from the series title when a tome is created', async () => {
    jest.mocked(lookupPagesByTitle).mockResolvedValue(208);
    const seriesId = await seedSeries({ type: 'bd' });

    await useLibrary.getState().setVolumeState(seriesId, 1, 'read');

    expect(useLibrary.getState().volumesBySeriesId[seriesId][0].pageCount).toBe(208);
    expect(lookupPagesByTitle).toHaveBeenCalledWith('One Piece', 1);
  });

  it('flags a non-manga tome for manual entry when no source knows it', async () => {
    jest.mocked(lookupPagesByTitle).mockResolvedValue(null);
    const seriesId = await seedSeries({ type: 'bd', title: 'Série obscure' });

    await useLibrary.getState().setVolumeState(seriesId, 1, 'read');

    expect(useLibrary.getState().volumesBySeriesId[seriesId][0].pageCount).toBeNull();
    expect(useLibrary.getState().pendingPages).toEqual({ seriesId, number: 1 });
  });

  it('does not ask for pages when the tome is only marked owned', async () => {
    jest.mocked(lookupPagesByTitle).mockResolvedValue(null);
    const seriesId = await seedSeries({ type: 'bd' });

    await useLibrary.getState().setVolumeState(seriesId, 1, 'owned');

    expect(useLibrary.getState().pendingPages).toBeNull();
  });

  it('persists a manually entered page count', async () => {
    jest.mocked(lookupPagesByTitle).mockResolvedValue(null);
    const seriesId = await seedSeries({ type: 'bd' });
    await useLibrary.getState().setVolumeState(seriesId, 1, 'read');

    await useLibrary.getState().resolvePendingPages(180);

    expect(useLibrary.getState().volumesBySeriesId[seriesId][0].pageCount).toBe(180);
    expect(useLibrary.getState().pendingPages).toBeNull();
    // The value must survive a reload, not just live in memory.
    await useLibrary.getState().load();
    expect(useLibrary.getState().volumesBySeriesId[seriesId][0].pageCount).toBe(180);
  });

  it('clears the prompt without writing when the user skips', async () => {
    jest.mocked(lookupPagesByTitle).mockResolvedValue(null);
    const seriesId = await seedSeries({ type: 'bd' });
    await useLibrary.getState().setVolumeState(seriesId, 1, 'read');

    await useLibrary.getState().resolvePendingPages(null);

    expect(useLibrary.getState().pendingPages).toBeNull();
    expect(useLibrary.getState().volumesBySeriesId[seriesId][0].pageCount).toBeNull();
  });

  it('keeps the page count of an existing tome instead of looking it up again', async () => {
    jest.mocked(lookupPagesByTitle).mockResolvedValue(200);
    const seriesId = await seedSeries({ type: 'bd' });
    await useLibrary.getState().setVolumeState(seriesId, 1, 'owned');
    jest.mocked(lookupPagesByTitle).mockClear();

    await useLibrary.getState().setVolumeState(seriesId, 1, 'read');

    expect(lookupPagesByTitle).not.toHaveBeenCalled();
    expect(useLibrary.getState().volumesBySeriesId[seriesId][0].pageCount).toBe(200);
  });
});

describe('addBook', () => {
  function meta(overrides: Partial<BookMetadata> = {}): BookMetadata {
    return {
      isbn: '123',
      title: 'One Piece 3',
      pageCount: 200,
      coverUrl: null,
      authors: ['Oda'],
      genres: [],
      description: null,
      publisher: null,
      publishedYear: null,
      ...overrides,
    };
  }

  function volumesOf(seriesId: number) {
    return useLibrary.getState().volumesBySeriesId[seriesId];
  }

  it('attaches a scanned tome to the matching local series', async () => {
    const seriesId = await useLibrary
      .getState()
      .addSeries(makeSeries({ id: 0, title: 'One Piece' }));

    const returned = await useLibrary.getState().addBook(meta());

    expect(returned).toBe(seriesId);
    expect(useLibrary.getState().series).toHaveLength(1);
    expect(volumesOf(seriesId)).toHaveLength(1);
    expect(volumesOf(seriesId)[0]).toMatchObject({ number: 3, pageCount: 200, isbn: '123' });
  });

  it('backfills empty genres and synopsis on a matching series when rescanned', async () => {
    const seriesId = await useLibrary
      .getState()
      .addSeries(makeSeries({ id: 0, title: 'One Piece', genres: [], description: null }));

    await useLibrary.getState().addBook(
      meta({
        genres: ['Adventure', 'Fantasy'],
        description: 'Luffy wants to be king of the pirates.',
        publisher: 'Glénat',
        publishedYear: 2013,
      }),
    );

    const series = useLibrary.getState().series.find((s) => s.id === seriesId);
    expect(series?.genres).toEqual(['Adventure', 'Fantasy']);
    expect(series?.description).toBe('Luffy wants to be king of the pirates.');
    expect(series?.publisher).toBe('Glénat');
    expect(series?.publishedYear).toBe(2013);
  });

  it('does not overwrite existing genres or synopsis on rescan', async () => {
    const seriesId = await useLibrary.getState().addSeries(
      makeSeries({
        id: 0,
        title: 'One Piece',
        genres: ['Shonen'],
        description: 'Original synopsis.',
      }),
    );

    await useLibrary
      .getState()
      .addBook(meta({ genres: ['Adventure'], description: 'Google synopsis.' }));

    const series = useLibrary.getState().series.find((s) => s.id === seriesId);
    expect(series?.genres).toEqual(['Shonen']);
    expect(series?.description).toBe('Original synopsis.');
  });

  it('matches the local series regardless of case and accents', async () => {
    const seriesId = await useLibrary
      .getState()
      .addSeries(makeSeries({ id: 0, title: 'Asagiri Prêtresses Aube' }));

    const returned = await useLibrary
      .getState()
      .addBook(meta({ title: 'ASAGIRI PRETRESSES AUBE T04' }));

    expect(returned).toBe(seriesId);
    expect(volumesOf(seriesId)[0].number).toBe(4);
  });

  it('creates the series from AniList when it is not in the library yet', async () => {
    jest.mocked(fetchSeries).mockResolvedValue([
      {
        anilistId: 21,
        description: null,
        series: {
          title: 'One Piece',
          author: 'Oda',
          type: 'manga',
          totalVolumes: 105,
          externalIds: { anilist: 21 },
          coverUrl: null,
          genres: [],
          status: 'reading',
        },
      },
    ]);

    const seriesId = await useLibrary.getState().addBook(meta());

    expect(useLibrary.getState().series.find((s) => s.id === seriesId)).toMatchObject({
      title: 'One Piece',
      type: 'manga',
      totalVolumes: 105,
    });
    expect(volumesOf(seriesId)[0]).toMatchObject({ number: 3, pageCount: 200 });
  });

  it('falls back to a single-tome series when nothing identifies the scan', async () => {
    jest.mocked(fetchSeries).mockResolvedValue([]);

    const seriesId = await useLibrary.getState().addBook(meta({ title: 'Le Nom du vent' }));

    expect(useLibrary.getState().series.find((s) => s.id === seriesId)).toMatchObject({
      title: 'Le Nom du vent',
      totalVolumes: 1,
    });
    expect(volumesOf(seriesId)[0]).toMatchObject({ number: 1, pageCount: 200 });
  });

  it('falls back when AniList is unreachable', async () => {
    jest.mocked(fetchSeries).mockRejectedValue(new Error('offline'));

    const seriesId = await useLibrary.getState().addBook(meta());

    expect(useLibrary.getState().series.find((s) => s.id === seriesId)).toBeTruthy();
    expect(volumesOf(seriesId)[0]).toMatchObject({ number: 3, pageCount: 200 });
  });

  it('updates the existing tome rather than duplicating it', async () => {
    const seriesId = await useLibrary
      .getState()
      .addSeries(makeSeries({ id: 0, title: 'One Piece' }));
    await useLibrary.getState().setVolumeState(seriesId, 3, 'owned');

    await useLibrary.getState().addBook(meta());

    expect(volumesOf(seriesId)).toHaveLength(1);
    expect(volumesOf(seriesId)[0]).toMatchObject({ number: 3, pageCount: 200 });
  });

  it('defaults a page-less manga tome to a standard length', async () => {
    const seriesId = await useLibrary
      .getState()
      .addSeries(makeSeries({ id: 0, title: 'One Piece' }));

    await useLibrary.getState().addBook(meta({ pageCount: null }));

    expect(volumesOf(seriesId)[0]).toMatchObject({ number: 3, pageCount: 192 });
  });

  it('keeps a real page count over the manga default', async () => {
    const seriesId = await useLibrary
      .getState()
      .addSeries(makeSeries({ id: 0, title: 'One Piece' }));

    await useLibrary.getState().addBook(meta({ pageCount: 210 }));

    expect(volumesOf(seriesId)[0]).toMatchObject({ pageCount: 210 });
  });

  it('leaves a page-less roman without a length so the scan can flag it', async () => {
    jest.mocked(fetchSeries).mockResolvedValue([]);

    const seriesId = await useLibrary
      .getState()
      .addBook(meta({ title: 'Le Nom du vent', pageCount: null }));

    expect(volumesOf(seriesId)[0]).toMatchObject({ number: 1, pageCount: null });
  });
});

describe('setVolumePages', () => {
  it('creates an owned volume to hold the length when the book has none yet', async () => {
    const seriesId = await useLibrary
      .getState()
      .addSeries(makeSeries({ id: 0, title: 'Fondation', type: 'novel', totalVolumes: 1 }));

    await useLibrary.getState().setVolumePages(seriesId, 1, 250);

    const vols = useLibrary.getState().volumesBySeriesId[seriesId];
    expect(vols).toHaveLength(1);
    expect(vols[0]).toMatchObject({ number: 1, pageCount: 250, status: 'owned' });
  });

  it('corrects the length on an existing volume without changing its status', async () => {
    const seriesId = await useLibrary
      .getState()
      .addSeries(makeSeries({ id: 0, title: 'Fondation', type: 'novel', totalVolumes: 1 }));
    await useLibrary.getState().setVolumeState(seriesId, 1, 'read');

    await useLibrary.getState().setVolumePages(seriesId, 1, 300);

    const vol = useLibrary.getState().volumesBySeriesId[seriesId][0];
    expect(vol).toMatchObject({ number: 1, pageCount: 300, status: 'read' });
  });
});

describe('setSeriesTotal', () => {
  it('updates the tome total and persists it across a reload', async () => {
    const seriesId = await useLibrary
      .getState()
      .addSeries(makeSeries({ id: 0, title: 'One Piece', totalVolumes: 30 }));

    await useLibrary.getState().setSeriesTotal(seriesId, 31);

    expect(useLibrary.getState().series.find((s) => s.id === seriesId)?.totalVolumes).toBe(31);
    await useLibrary.getState().load();
    expect(useLibrary.getState().series.find((s) => s.id === seriesId)?.totalVolumes).toBe(31);
  });
});

describe('setSeriesPagesPerTome', () => {
  it('stamps the length onto every tome and persists it as the series default', async () => {
    const seriesId = await useLibrary
      .getState()
      .addSeries(makeSeries({ id: 0, title: 'One Piece', totalVolumes: 30 }));
    await useLibrary.getState().setVolumeState(seriesId, 1, 'read'); // manga → 192 by default
    await useLibrary.getState().setVolumeState(seriesId, 2, 'owned');

    await useLibrary.getState().setSeriesPagesPerTome(seriesId, 208);

    const vols = useLibrary.getState().volumesBySeriesId[seriesId];
    expect(vols.every((v) => v.pageCount === 208)).toBe(true);
    expect(useLibrary.getState().series.find((s) => s.id === seriesId)?.pagesPerTome).toBe(208);

    await useLibrary.getState().load();
    expect(useLibrary.getState().series.find((s) => s.id === seriesId)?.pagesPerTome).toBe(208);
    expect(
      useLibrary.getState().volumesBySeriesId[seriesId].every((v) => v.pageCount === 208),
    ).toBe(true);
  });

  it('uses the per-tome default for a tome added later, skipping any lookup', async () => {
    jest.mocked(lookupMangaPages).mockResolvedValue(999);
    const seriesId = await useLibrary
      .getState()
      .addSeries(makeSeries({ id: 0, title: 'One Piece', totalVolumes: 30 }));
    await useLibrary.getState().setSeriesPagesPerTome(seriesId, 208);

    await useLibrary.getState().setVolumeState(seriesId, 5, 'read');

    const tome = useLibrary.getState().volumesBySeriesId[seriesId].find((v) => v.number === 5);
    expect(tome?.pageCount).toBe(208);
    expect(lookupMangaPages).not.toHaveBeenCalled();
  });
});

describe('setSeriesGenres', () => {
  it('replaces the genres and persists them across a reload', async () => {
    const seriesId = await useLibrary
      .getState()
      .addSeries(makeSeries({ id: 0, title: 'Fondation', genres: ['sci-fi'] }));

    await useLibrary.getState().setSeriesGenres(seriesId, ['Science-fiction', 'Aventure']);

    expect(useLibrary.getState().series.find((s) => s.id === seriesId)?.genres).toEqual([
      'Science-fiction',
      'Aventure',
    ]);

    await useLibrary.getState().load();
    expect(useLibrary.getState().series.find((s) => s.id === seriesId)?.genres).toEqual([
      'Science-fiction',
      'Aventure',
    ]);
  });
});
