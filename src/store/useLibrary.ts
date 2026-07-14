import { create } from 'zustand';

import { openDatabase } from '~/src/db/expoClient';
import { Series, Volume, VolumeStatus } from '~/src/db/models';
import {
  deleteVolume,
  insertVolume,
  listSeries,
  listVolumes,
  setVolumeStatus,
} from '~/src/db/queries';
import { nextStatus, SlotState } from '~/src/lib/volumeStatus';

interface LibraryState {
  series: Series[];
  volumesBySeriesId: Record<number, Volume[]>;
  loaded: boolean;
  load: () => Promise<void>;
  cycleVolume: (seriesId: number, number: number) => Promise<void>;
}

export const useLibrary = create<LibraryState>()((set, get) => ({
  series: [],
  volumesBySeriesId: {},
  loaded: false,

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
      updated = volumes.map((v) => (v.id === existing.id ? { ...v, status } : v));
    }

    set({ volumesBySeriesId: { ...get().volumesBySeriesId, [seriesId]: updated } });
  },
}));
