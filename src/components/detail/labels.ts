import { SeriesStatus, SeriesType } from '~/src/db/models';

export const SERIES_STATUS_LABEL: Record<SeriesStatus, string> = {
  reading: 'En cours',
  completed: 'Terminé',
  planned: 'Prévu',
  paused: 'En pause',
  dropped: 'Abandonné',
};

export const TYPE_LABEL: Record<SeriesType, string> = {
  manga: 'Manga',
  novel: 'Roman',
  bd: 'BD',
  comic: 'Comics',
};

export const TYPES: SeriesType[] = ['manga', 'novel', 'bd', 'comic'];
