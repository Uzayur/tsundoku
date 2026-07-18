import { NewSeries, NewVolume } from '~/src/db/models';
import {
  rowToSeries,
  rowToVolume,
  SeriesRow,
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
      added_at: null,
      description: 'Guts wields a very large sword.',
      publisher: 'Hakusensha',
      published_year: 1990,
      pages_per_tome: 224,
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
      addedAt: null,
      description: 'Guts wields a very large sword.',
      publisher: 'Hakusensha',
      publishedYear: 1990,
      pagesPerTome: 224,
    });
  });

  it('rowToSeries maps added_at to addedAt', () => {
    const row: SeriesRow = {
      id: 1,
      title: 'Frieren',
      author: 'Kanehito Yamada',
      type: 'manga',
      total_volumes: 13,
      external_ids: '{}',
      cover_url: null,
      genres: '[]',
      status: 'reading',
      added_at: '2026-07-17T10:30:00.000Z',
      description: null,
      publisher: null,
      published_year: null,
      pages_per_tome: null,
    };
    expect(rowToSeries(row).addedAt).toBe('2026-07-17T10:30:00.000Z');
  });

  it('rowToSeries maps a null added_at to null', () => {
    const row: SeriesRow = {
      id: 1,
      title: 'Frieren',
      author: 'Kanehito Yamada',
      type: 'manga',
      total_volumes: 13,
      external_ids: '{}',
      cover_url: null,
      genres: '[]',
      status: 'reading',
      added_at: null,
      description: null,
      publisher: null,
      published_year: null,
      pages_per_tome: null,
    };
    expect(rowToSeries(row).addedAt).toBeNull();
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
      null,
      null,
      null,
      null,
      null,
    ]);
  });

  it('seriesInsertParams coalesces absent addedAt and Google Books fields to null', () => {
    const base: NewSeries = {
      title: 'Frieren',
      author: 'Kanehito Yamada',
      type: 'manga',
      totalVolumes: null,
      externalIds: { anilist: 118586 },
      coverUrl: null,
      genres: ['Fantasy'],
      status: 'reading',
    };
    // Column order: ..., added_at(8), description(9), publisher(10), published_year(11), pages_per_tome(12)
    expect(seriesInsertParams(base).slice(8)).toEqual([null, null, null, null, null]);
    expect(
      seriesInsertParams({
        ...base,
        addedAt: '2026-07-17T10:30:00.000Z',
        description: 'A quiet elf.',
        publisher: 'Shogakukan',
        publishedYear: 2020,
        pagesPerTome: 200,
      }).slice(8),
    ).toEqual(['2026-07-17T10:30:00.000Z', 'A quiet elf.', 'Shogakukan', 2020, 200]);
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
