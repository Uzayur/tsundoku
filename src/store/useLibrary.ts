import { create } from 'zustand';

import { fetchSeries, SeriesSearchResult } from '~/src/api/anilist';
import { BookMetadata } from '~/src/api/isbn';
import { lookupPagesByTitle } from '~/src/api/openlibrary';
import { BackupData } from '~/src/lib/backup';
import { getCached, setCached } from '~/src/db/cache';
import { openDatabase } from '~/src/db/expoClient';
import { NewSeries, Series, SeriesType, Volume, VolumeStatus } from '~/src/db/models';
import {
  deleteSeries,
  deleteVolume,
  insertSeries,
  insertVolume,
  listSeries,
  listVolumes,
  setVolumeCurrentPage,
  setVolumeFinishedAt,
  setVolumePageCount,
  setVolumeStatus,
  updateSeries,
} from '~/src/db/queries';
import { normalizeTitle, parseVolumeTitle } from '~/src/lib/volumeTitle';
import { SlotState } from '~/src/lib/volumeStatus';

const now = () => new Date().toISOString();

// A scanned manga rarely carries a page count in either catalogue, yet its tomes
// are near-uniform, so a sensible default keeps it out of the "unknown length"
// warning and lets it count towards the page stats. Romans vary too much to guess.
const MANGA_DEFAULT_PAGES = 192;

function newVolume(
  seriesId: number,
  number: number,
  status: VolumeStatus,
  pageCount: number | null = null,
): Volume {
  return {
    id: 0,
    seriesId,
    number,
    isbn: null,
    title: null,
    pageCount,
    coverUrl: null,
    status,
    currentPage: null,
    startedAt: null,
    finishedAt: status === 'read' ? now() : null,
  };
}

interface LibraryState {
  series: Series[];
  volumesBySeriesId: Record<number, Volume[]>;
  loaded: boolean;
  searchResults: SeriesSearchResult[];
  searching: boolean;
  searchError: string | null;
  /** Set when a tome was marked read but no source knew its length. */
  pendingPages: { seriesId: number; number: number } | null;
  resolvePendingPages: (pages: number | null) => Promise<void>;
  load: () => Promise<void>;
  setVolumeState: (
    seriesId: number,
    number: number,
    target: SlotState,
    applyToPrevious?: boolean,
  ) => Promise<void>;
  setVolumeCurrentPage: (seriesId: number, number: number, page: number) => Promise<void>;
  setVolumePages: (seriesId: number, number: number, pages: number) => Promise<void>;
  search: (query: string) => Promise<void>;
  addSeries: (input: NewSeries) => Promise<number>;
  addBook: (meta: BookMetadata, status?: VolumeStatus, currentPage?: number) => Promise<number>;
  updateSeriesType: (id: number, type: SeriesType) => Promise<void>;
  removeSeries: (id: number) => Promise<void>;
  importBackup: (data: BackupData) => Promise<void>;
}

export const useLibrary = create<LibraryState>()((set, get) => ({
  series: [],
  volumesBySeriesId: {},
  loaded: false,
  searchResults: [],
  searching: false,
  searchError: null,
  pendingPages: null,

  resolvePendingPages: async (pages) => {
    const pending = get().pendingPages;
    if (!pending) {
      return;
    }
    set({ pendingPages: null });
    if (pages == null) {
      return;
    }

    const db = await openDatabase();
    const volumes = get().volumesBySeriesId[pending.seriesId] ?? [];
    const target = volumes.find((v) => v.number === pending.number);
    if (!target) {
      return;
    }

    await setVolumePageCount(db, target.id, pages);
    set({
      volumesBySeriesId: {
        ...get().volumesBySeriesId,
        [pending.seriesId]: volumes.map((v) =>
          v.id === target.id ? { ...v, pageCount: pages } : v,
        ),
      },
    });
  },

  load: async () => {
    const db = await openDatabase();
    const series = await listSeries(db);
    const map: Record<number, Volume[]> = {};
    for (const s of series) {
      map[s.id] = await listVolumes(db, s.id);
    }
    set({ series, volumesBySeriesId: map, loaded: true });
  },

  // Set a specific tome to a target state (create / update / delete as needed).
  // When applyToPrevious is true, apply the same target to every tome 1..number.
  setVolumeState: async (seriesId, number, target, applyToPrevious = false) => {
    const db = await openDatabase();
    const numbers = applyToPrevious ? Array.from({ length: number }, (_, i) => i + 1) : [number];
    let volumes = [...(get().volumesBySeriesId[seriesId] ?? [])];

    for (const n of numbers) {
      const existing = volumes.find((v) => v.number === n);
      if (target === 'missing') {
        if (existing) {
          await deleteVolume(db, existing.id);
          volumes = volumes.filter((v) => v.id !== existing.id);
        }
        continue;
      }
      const status = target as VolumeStatus;
      const finishedAt = status === 'read' ? now() : null;
      if (existing) {
        await setVolumeStatus(db, existing.id, status);
        await setVolumeFinishedAt(db, existing.id, finishedAt);
        volumes = volumes.map((v) => (v.id === existing.id ? { ...v, status, finishedAt } : v));
      } else {
        // A tome born from the grid never saw an ISBN, so its length has to be
        // resolved from the series title — and asked for when nothing knows it,
        // otherwise it would silently count as 0 pages towards the stats.
        const series = get().series.find((s) => s.id === seriesId);
        const pages = series ? await lookupPagesByTitle(series.title, n) : null;
        const draft = newVolume(seriesId, n, status, pages);
        const id = await insertVolume(db, draft);
        volumes = [...volumes, { ...draft, id }];
        if (pages == null && status === 'read') {
          set({ pendingPages: { seriesId, number: n } });
        }
      }
    }

    volumes.sort((a, b) => a.number - b.number);
    set({ volumesBySeriesId: { ...get().volumesBySeriesId, [seriesId]: volumes } });
  },

  setVolumeCurrentPage: async (seriesId, number, page) => {
    const db = await openDatabase();
    let volumes = [...(get().volumesBySeriesId[seriesId] ?? [])];
    const existing = volumes.find((v) => v.number === number);
    if (existing) {
      // Reaching the last page finishes the tome: for single-tome works the
      // page card is the only control, so nothing else would ever mark it read
      // and it could never count towards the stats. Correcting the page back
      // down reopens it.
      const done = existing.pageCount != null && page >= existing.pageCount;
      const status: VolumeStatus = done ? 'read' : 'reading';
      const finishedAt = done ? now() : null;
      await setVolumeStatus(db, existing.id, status);
      await setVolumeFinishedAt(db, existing.id, finishedAt);
      await setVolumeCurrentPage(db, existing.id, page);
      volumes = volumes.map((v) =>
        v.id === existing.id ? { ...v, status, finishedAt, currentPage: page } : v,
      );
    } else {
      const draft: Volume = { ...newVolume(seriesId, number, 'reading'), currentPage: page };
      const id = await insertVolume(db, draft);
      volumes = [...volumes, { ...draft, id }];
    }
    volumes.sort((a, b) => a.number - b.number);
    set({ volumesBySeriesId: { ...get().volumesBySeriesId, [seriesId]: volumes } });
  },

  // Set (or correct) a tome's page count directly, e.g. from the book's page when
  // no source knew its length or catalogued the wrong one. A book added by title
  // search carries no volume row yet, so entering a length creates one — marked
  // owned, since the book is in the library but not read.
  setVolumePages: async (seriesId, number, pages) => {
    const db = await openDatabase();
    let volumes = [...(get().volumesBySeriesId[seriesId] ?? [])];
    const existing = volumes.find((v) => v.number === number);
    if (existing) {
      await setVolumePageCount(db, existing.id, pages);
      volumes = volumes.map((v) => (v.id === existing.id ? { ...v, pageCount: pages } : v));
    } else {
      const draft = newVolume(seriesId, number, 'owned', pages);
      const id = await insertVolume(db, draft);
      volumes = [...volumes, { ...draft, id }];
    }
    volumes.sort((a, b) => a.number - b.number);
    set({ volumesBySeriesId: { ...get().volumesBySeriesId, [seriesId]: volumes } });
  },

  search: async (query) => {
    const q = query.trim();
    if (!q) {
      set({ searchResults: [], searchError: null, searching: false });
      return;
    }
    set({ searching: true, searchError: null });
    try {
      const db = await openDatabase();
      const key = `anilist:search:${q.toLowerCase()}`;
      const cached = await getCached(db, key);
      let results: SeriesSearchResult[];
      if (cached) {
        results = JSON.parse(cached) as SeriesSearchResult[];
      } else {
        results = await fetchSeries(q);
        await setCached(db, key, JSON.stringify(results));
      }
      set({ searchResults: results, searching: false });
    } catch {
      set({ searching: false, searchError: 'Recherche échouée', searchResults: [] });
    }
  },

  addSeries: async (input) => {
    const db = await openDatabase();
    const addedAt = now();
    const stamped: NewSeries = { ...input, addedAt };
    const id = await insertSeries(db, stamped);
    // `id` last: the row id SQLite just assigned must win over any stale id
    // riding along on the input, otherwise lookups by id miss the series.
    // The optional halves of NewSeries settle to null, matching what a reload
    // would read back from SQLite.
    const row: Series = {
      ...stamped,
      description: stamped.description ?? null,
      publisher: stamped.publisher ?? null,
      publishedYear: stamped.publishedYear ?? null,
      addedAt,
      id,
    };
    const series = [...get().series, row].sort((a, b) => a.title.localeCompare(b.title));
    set({
      series,
      volumesBySeriesId: { ...get().volumesBySeriesId, [id]: [] },
    });
    return id;
  },

  addBook: async (meta, status = 'owned', currentPage) => {
    const db = await openDatabase();
    const { baseTitle, number } = parseVolumeTitle(meta.title ?? meta.isbn);
    const volumeNumber = number ?? 1;
    const key = normalizeTitle(baseTitle);

    // 1. A series already in the library wins: the scan fills one of its tomes
    //    rather than standing up a duplicate alongside it.
    const existingSeries = get().series.find((s) => normalizeTitle(s.title) === key);
    let seriesId = existingSeries?.id ?? null;
    // Track the resolved type so a page-less manga can fall back to a default
    // length. Defaults to 'novel', matching the untyped-scan fallback below.
    let seriesType: SeriesType = existingSeries?.type ?? 'novel';

    // Series created before this metadata existed (or scanned back when we only
    // kept page counts) carry empty genres and no synopsis. A rescan is the
    // natural moment to backfill them — but only gaps, so AniList genres and an
    // edited synopsis are never overwritten by sparser Google Books data.
    if (existingSeries) {
      const patch: Partial<NewSeries> = {};
      if (existingSeries.genres.length === 0 && meta.genres.length > 0) patch.genres = meta.genres;
      if (!existingSeries.description && meta.description) patch.description = meta.description;
      if (!existingSeries.publisher && meta.publisher) patch.publisher = meta.publisher;
      if (existingSeries.publishedYear == null && meta.publishedYear != null)
        patch.publishedYear = meta.publishedYear;
      if (Object.keys(patch).length > 0) await updateSeries(db, existingSeries.id, patch);
    }

    // 2. Otherwise let AniList identify the work, so a scanned manga lands as a
    //    manga with its real tome count instead of a one-tome "novel".
    if (seriesId == null && number != null) {
      let candidate: SeriesSearchResult | undefined;
      try {
        candidate = (await fetchSeries(baseTitle)).find(
          (r) => normalizeTitle(r.series.title) === key,
        );
      } catch {
        candidate = undefined;
      }
      if (candidate) {
        seriesType = candidate.series.type;
        seriesId = await insertSeries(db, {
          ...candidate.series,
          description: candidate.description,
          addedAt: now(),
        });
      }
    }

    // 3. Nothing identified it: keep the single-tome fallback.
    if (seriesId == null) {
      seriesId = await insertSeries(db, {
        title: baseTitle,
        author: meta.authors[0] ?? null,
        // ISBN scans have no reliable manga/novel signal; default to novel and let
        // the user correct it on the series page.
        type: 'novel',
        totalVolumes: 1,
        externalIds: {},
        coverUrl: meta.coverUrl,
        genres: meta.genres,
        status: 'reading',
        addedAt: now(),
        description: meta.description,
        publisher: meta.publisher,
        publishedYear: meta.publishedYear,
      });
    }

    const existing = (get().volumesBySeriesId[seriesId] ?? []).find(
      (v) => v.number === volumeNumber,
    );
    const mangaDefault = seriesType === 'manga' ? MANGA_DEFAULT_PAGES : null;
    if (existing) {
      // The tome is already tracked: the scan contributes its real length, and
      // the status the user just chose overrides whatever it held before. Keep
      // any length already known when neither the scan nor the manga default has
      // one, rather than blanking it.
      const pages = meta.pageCount ?? existing.pageCount ?? mangaDefault;
      await setVolumePageCount(db, existing.id, pages);
      await setVolumeStatus(db, existing.id, status);
      await setVolumeFinishedAt(db, existing.id, status === 'read' ? now() : null);
      if (currentPage != null) await setVolumeCurrentPage(db, existing.id, currentPage);
    } else {
      await insertVolume(db, {
        seriesId,
        number: volumeNumber,
        isbn: meta.isbn,
        title: meta.title,
        pageCount: meta.pageCount ?? mangaDefault,
        coverUrl: meta.coverUrl,
        status,
        currentPage: currentPage ?? null,
        startedAt: null,
        finishedAt: status === 'read' ? now() : null,
      });
    }

    await get().load();
    return seriesId;
  },

  updateSeriesType: async (id, type) => {
    const db = await openDatabase();
    await updateSeries(db, id, { type });
    set({ series: get().series.map((s) => (s.id === id ? { ...s, type } : s)) });
  },

  removeSeries: async (id) => {
    const db = await openDatabase();
    await deleteSeries(db, id);
    const rest = { ...get().volumesBySeriesId };
    delete rest[id];
    set({ series: get().series.filter((s) => s.id !== id), volumesBySeriesId: rest });
  },

  importBackup: async (data) => {
    const db = await openDatabase();
    // Replace-all restore (device migration semantics).
    await db.exec('DELETE FROM volumes; DELETE FROM series;');
    for (const s of data.series) {
      const newId = await insertSeries(db, {
        title: s.title,
        author: s.author,
        type: s.type,
        totalVolumes: s.totalVolumes,
        externalIds: s.externalIds,
        coverUrl: s.coverUrl,
        genres: s.genres,
        status: s.status,
        // Preserve the original add date — stamping now() would destroy the real order.
        addedAt: s.addedAt ?? null,
        // Backups written before migration 5 carry none of these.
        description: s.description ?? null,
        publisher: s.publisher ?? null,
        publishedYear: s.publishedYear ?? null,
      });
      for (const v of data.volumesBySeriesId[s.id] ?? []) {
        await insertVolume(db, {
          seriesId: newId,
          number: v.number,
          isbn: v.isbn,
          title: v.title,
          pageCount: v.pageCount,
          coverUrl: v.coverUrl,
          status: v.status,
          currentPage: v.currentPage,
          startedAt: v.startedAt,
          finishedAt: v.finishedAt,
        });
      }
    }
    await get().load();
  },
}));
