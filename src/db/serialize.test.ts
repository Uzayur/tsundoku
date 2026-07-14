import { NewSeries, NewVolume } from '~/src/db/models';
import {
  rowToSeries,
  rowToVolume,
  seriesInsertParams,
  volumeInsertParams,
} from '~/src/db/serialize';

describe('serialize', () => {
  it('rowToSeries parses JSON columns and maps snake_case → camelCase', () => {
    const series = rowToSeries({
      id: 7,
      title: 'Berserk',
      author: 'Kentaro Miura',
      type: 'manga',
      total_volumes: 42,
      external_ids: '{"anilist":30002}',
      cover_url: null,
      genres: '["Seinen","Dark Fantasy"]',
      status: 'reading',
    });
    expect(series).toEqual({
      id: 7,
      title: 'Berserk',
      author: 'Kentaro Miura',
      type: 'manga',
      totalVolumes: 42,
      externalIds: { anilist: 30002 },
      coverUrl: null,
      genres: ['Seinen', 'Dark Fantasy'],
      status: 'reading',
    });
  });

  it('rowToVolume maps all fields including nulls', () => {
    const volume = rowToVolume({
      id: 3,
      series_id: 7,
      number: 2,
      isbn: null,
      title: null,
      page_count: 224,
      cover_url: null,
      status: 'owned',
      current_page: null,
      started_at: null,
      finished_at: null,
    });
    expect(volume).toEqual({
      id: 3,
      seriesId: 7,
      number: 2,
      isbn: null,
      title: null,
      pageCount: 224,
      coverUrl: null,
      status: 'owned',
      currentPage: null,
      startedAt: null,
      finishedAt: null,
    });
  });

  it('seriesInsertParams stringifies JSON and coalesces optionals to null', () => {
    const input: NewSeries = {
      title: 'Frieren',
      author: 'Kanehito Yamada',
      type: 'manga',
      totalVolumes: null,
      externalIds: { anilist: 118586 },
      coverUrl: null,
      genres: ['Fantasy'],
      status: 'reading',
    };
    expect(seriesInsertParams(input)).toEqual([
      'Frieren',
      'Kanehito Yamada',
      'manga',
      null,
      '{"anilist":118586}',
      null,
      '["Fantasy"]',
      'reading',
    ]);
  });

  it('volumeInsertParams produces params in column order with nulls', () => {
    const input: NewVolume = {
      seriesId: 7,
      number: 1,
      isbn: null,
      title: null,
      pageCount: 192,
      coverUrl: null,
      status: 'read',
      currentPage: null,
      startedAt: null,
      finishedAt: null,
    };
    expect(volumeInsertParams(input)).toEqual([
      7,
      1,
      null,
      null,
      192,
      null,
      'read',
      null,
      null,
      null,
    ]);
  });
});
