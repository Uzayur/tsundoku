import { Series, Volume } from '~/src/db/models';
import { BackupData, buildBackupJson, buildCsv, parseBackupJson } from '~/src/lib/backup';

function makeFixture(): BackupData {
  const series: Series[] = [
    {
      id: 1,
      title: 'Spice, Wolf',
      author: 'Isuna Hasekura',
      type: 'novel',
      totalVolumes: 21,
      externalIds: { anilist: 39026 },
      coverUrl: null,
      genres: ['Fantasy', 'Romance'],
      status: 'reading',
      addedAt: null,
    },
    {
      id: 2,
      title: 'Frieren',
      author: null,
      type: 'manga',
      totalVolumes: null,
      externalIds: {},
      coverUrl: null,
      genres: ['Fantasy'],
      status: 'planned',
      addedAt: null,
    },
  ];

  const volumesBySeriesId: Record<number, Volume[]> = {
    1: [
      {
        id: 10,
        seriesId: 1,
        number: 1,
        isbn: '9781975300000',
        title: null,
        pageCount: 224,
        coverUrl: null,
        status: 'read',
        currentPage: null,
        startedAt: null,
        finishedAt: null,
      },
      {
        id: 11,
        seriesId: 1,
        number: 2,
        isbn: null,
        title: null,
        pageCount: 240,
        coverUrl: null,
        status: 'owned',
        currentPage: null,
        startedAt: null,
        finishedAt: null,
      },
    ],
    2: [],
  };

  return { series, volumesBySeriesId };
}

describe('backup', () => {
  const exportedAt = '2026-07-14T00:00:00.000Z';

  it('buildBackupJson → parseBackupJson round-trips to the original data', () => {
    const data = makeFixture();
    const json = buildBackupJson(data, exportedAt);
    expect(parseBackupJson(json)).toEqual(data);
  });

  it('buildBackupJson writes the envelope fields and pretty-prints', () => {
    const data = makeFixture();
    const json = buildBackupJson(data, exportedAt);
    const parsed = JSON.parse(json);
    expect(parsed.app).toBe('tsundoku');
    expect(parsed.version).toBe(1);
    expect(parsed.exportedAt).toBe(exportedAt);
    expect(parsed.data).toEqual(data);
    expect(json).toContain('\n  ');
  });

  it('parseBackupJson throws on an empty object', () => {
    expect(() => parseBackupJson('{}')).toThrow('Invalid Tsundoku backup file');
  });

  it('parseBackupJson throws on a non-tsundoku object', () => {
    const notOurs = JSON.stringify({
      app: 'other',
      version: 1,
      exportedAt,
      data: { series: [], volumesBySeriesId: {} },
    });
    expect(() => parseBackupJson(notOurs)).toThrow('Invalid Tsundoku backup file');
  });

  it('parseBackupJson throws when data shape is wrong', () => {
    const badShape = JSON.stringify({ app: 'tsundoku', version: 1, exportedAt, data: {} });
    expect(() => parseBackupJson(badShape)).toThrow('Invalid Tsundoku backup file');
  });

  it('parseBackupJson throws on malformed JSON', () => {
    expect(() => parseBackupJson('{not json')).toThrow();
  });

  it('buildCsv starts with the header row', () => {
    const csv = buildCsv(makeFixture());
    const lines = csv.split('\n');
    expect(lines[0]).toBe('series_title,series_type,total_volumes,volume_number,volume_status');
  });

  it('buildCsv emits one row per volume', () => {
    const csv = buildCsv(makeFixture());
    const lines = csv.split('\n');
    // header + 2 volumes for series 1 + 1 empty row for series 2
    expect(lines).toHaveLength(4);
    expect(lines[1]).toContain('read');
    expect(lines[2]).toContain('owned');
  });

  it('buildCsv quotes a title containing a comma', () => {
    const csv = buildCsv(makeFixture());
    expect(csv).toContain('"Spice, Wolf"');
  });

  it('buildCsv still emits a row for a series with no volumes', () => {
    const csv = buildCsv(makeFixture());
    const lines = csv.split('\n');
    const frierenRow = lines.find((l) => l.startsWith('Frieren'));
    expect(frierenRow).toBe('Frieren,manga,,,');
  });

  it('buildCsv escapes embedded double quotes', () => {
    const data = makeFixture();
    data.series[1].title = 'The "Best" Manga';
    const csv = buildCsv(data);
    expect(csv).toContain('"The ""Best"" Manga"');
  });
});
