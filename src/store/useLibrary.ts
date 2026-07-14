import { create } from 'zustand';

import { fetchSeries, SeriesSearchResult } from '~/src/api/anilist';
import { BackupData } from '~/src/lib/backup';
import { getCached, setCached } from '~/src/db/cache';
import { openDatabase } from '~/src/db/expoClient';
import { NewSeries, Series, Volume, VolumeStatus } from '~/src/db/models';
import {
  deleteVolume,
  insertSeries,
  insertVolume,
  listSeries,
  listVolumes,
  setVolumeFinishedAt,
  setVolumeStatus,
} from '~/src/db/queries';
import { nextStatus, SlotState } from '~/src/lib/volumeStatus';

interface LibraryState {
  series: Series[];
  volumesBySeriesId: Record<number, Volume[]>;
  loaded: boolean;
  searchResults: SeriesSearchResult[];
  searching: boolean;
  searchError: string | null;
  load: () => Promise<void>;
  cycleVolume: (seriesId: number, number: number) => Promise<void>;
  search: (query: string) => Promise<void>;
  addSeries: (input: NewSeries) => Promise<number>;
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

  cycleVolume: async (seriesId, number) => {
    const db = await openDatabase();
    const volumes = get().volumesBySeriesId[seriesId] ?? [];
    const existing = volumes.find((v) => v.number === number);
    const current: SlotState = existing ? existing.status : 'missing';
    const next = nextStatus(current);

    let updated: Volume[];
    if (!existing) {
      const status = next as VolumeStatus;
      const id = await insertVolume(db, {
        seriesId,
        number,
        isbn: null,
        title: null,
        pageCount: null,
        coverUrl: null,
        status,
        currentPage: null,
        startedAt: null,
        finishedAt: null,
      });
      updated = [
        ...volumes,
        {
          id,
          seriesId,
          number,
          isbn: null,
          title: null,
          pageCount: null,
          coverUrl: null,
          status,
          currentPage: null,
          startedAt: null,
          finishedAt: null,
        },
      ].sort((a, b) => a.number - b.number);
    } else if (next === 'missing') {
      await deleteVolume(db, existing.id);
      updated = volumes.filter((v) => v.id !== existing.id);
    } else {
      const status = next as VolumeStatus;
      await setVolumeStatus(db, existing.id, status);
      // Stamp/clear the finished date so stats can bucket read volumes by period.
      const finishedAt = status === 'read' ? new Date().toISOString().slice(0, 10) : null;
      await setVolumeFinishedAt(db, existing.id, finishedAt);
      updated = volumes.map((v) => (v.id === existing.id ? { ...v, status, finishedAt } : v));
    }

    set({ volumesBySeriesId: { ...get().volumesBySeriesId, [seriesId]: updated } });
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
    const id = await insertSeries(db, input);
    const series = [...get().series, { id, ...input }].sort((a, b) =>
      a.title.localeCompare(b.title),
    );
    set({
      series,
      volumesBySeriesId: { ...get().volumesBySeriesId, [id]: [] },
    });
    return id;
  },

  importBackup: async (data) => {
    const db = await openDatabase();
    // Replace-all restore (device migration semantics).
    await db.exec('DELETE FROM volumes; DELETE FROM series;');
    for (const s of data.series) {
      const newId = await insertSeries(db, {
        title: s.title,
        type: s.type,
        totalVolumes: s.totalVolumes,
        externalIds: s.externalIds,
        coverUrl: s.coverUrl,
        genres: s.genres,
        status: s.status,
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
