export type SeriesType = 'manga' | 'bd' | 'comic' | 'novel';
export type SeriesStatus = 'reading' | 'completed' | 'planned' | 'paused' | 'dropped';
export type VolumeStatus = 'wishlist' | 'owned' | 'reading' | 'read';

export interface Series {
  id: number;
  title: string;
  type: SeriesType;
  totalVolumes: number | null;
  externalIds: Record<string, string | number>;
  coverUrl: string | null;
  genres: string[];
  status: SeriesStatus;
}

export interface Volume {
  id: number;
  seriesId: number;
  number: number;
  isbn: string | null;
  title: string | null;
  pageCount: number | null;
  coverUrl: string | null;
  status: VolumeStatus;
  currentPage: number | null;
  startedAt: string | null;
  finishedAt: string | null;
}

export type NewSeries = Omit<Series, 'id'>;
export type NewVolume = Omit<Volume, 'id'>;
