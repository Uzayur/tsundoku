import { create } from 'zustand';

import { fetchSeries, SeriesSearchResult } from '~/src/api/anilist';
import { BookMetadata } from '~/src/api/isbn';
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
  setVolumeStatus,
  updateSeries,
} from '~/src/db/queries';
import { SlotState } from '~/src/lib/volumeStatus';

const today = () => new Date().toISOString().slice(0, 10);
const now = () => new Date().toISOString();

function newVolume(seriesId: number, number: number, status: VolumeStatus): Volume {
  return {
    id: 0,
    seriesId,
    number,
    isbn: null,
    title: null,
    pageCount: null,
    coverUrl: null,
    status,
    currentPage: null,
    startedAt: null,
    finishedAt: status === 'read' ? today() : null,
  };
}

interface LibraryState {
  series: Series[];
  volumesBySeriesId: Record<number, Volume[]>;
  loaded: boolean;
  searchResults: SeriesSearchResult[];
  searching: boolean;
  searchError: string | null;
  load: () => Promise<void>;
  setVolumeState: (
    seriesId: number,
    number: number,
    target: SlotState,
    applyToPrevious?: boolean,
  ) => Promise<void>;
  setVolumeCurrentPage: (seriesId: number, number: number, page: number) => Promise<void>;
  search: (query: string) => Promise<void>;
  addSeries: (input: NewSeries) => Promise<number>;
  addBook: (meta: BookMetadata) => Promise<number>;
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
      const finishedAt = status === 'read' ? today() : null;
      if (existing) {
        await setVolumeStatus(db, existing.id, status);
        await setVolumeFinishedAt(db, existing.id, finishedAt);
        volumes = volumes.map((v) => (v.id === existing.id ? { ...v, status, finishedAt } : v));
      } else {
        const draft = newVolume(seriesId, n, status);
        const id = await insertVolume(db, draft);
        volumes = [...volumes, { ...draft, id }];
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
      await setVolumeStatus(db, existing.id, 'reading');
      await setVolumeCurrentPage(db, existing.id, page);
      volumes = volumes.map((v) =>
        v.id === existing.id ? { ...v, status: 'reading', currentPage: page } : v,
      );
    } else {
      const draft: Volume = { ...newVolume(seriesId, number, 'reading'), currentPage: page };
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
    const stamped: NewSeries = { ...input, addedAt: now() };
    const id = await insertSeries(db, stamped);
    const series = [...get().series, { id, ...stamped, addedAt: stamped.addedAt ?? null }].sort(
      (a, b) => a.title.localeCompare(b.title),
    );
    set({
      series,
      volumesBySeriesId: { ...get().volumesBySeriesId, [id]: [] },
    });
    return id;
  },

  addBook: async (meta) => {
    const db = await openDatabase();
    const seriesId = await insertSeries(db, {
      title: meta.title ?? meta.isbn,
      author: meta.authors[0] ?? null,
      // ISBN scans have no reliable manga/novel signal; default to novel and let
      // the user correct it on the series page. (Manga are usually added via search.)
      type: 'novel',
      totalVolumes: 1,
      externalIds: {},
      coverUrl: meta.coverUrl,
      genres: [],
      status: 'reading',
      addedAt: now(),
    });
    await insertVolume(db, {
      seriesId,
      number: 1,
      isbn: meta.isbn,
      title: meta.title,
      pageCount: meta.pageCount,
      coverUrl: meta.coverUrl,
      status: 'owned',
      currentPage: null,
      startedAt: null,
      finishedAt: null,
    });
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
