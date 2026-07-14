import { Series, Volume } from '~/src/db/models';

export interface BackupData {
  series: Series[];
  volumesBySeriesId: Record<number, Volume[]>;
}

export interface BackupFile {
  app: 'tsundoku';
  version: 1;
  exportedAt: string;
  data: BackupData;
}

export function buildBackupJson(data: BackupData, exportedAt: string): string {
  const file: BackupFile = {
    app: 'tsundoku',
    version: 1,
    exportedAt,
    data,
  };
  return JSON.stringify(file, null, 2);
}

export function parseBackupJson(json: string): BackupData {
  const parsed = JSON.parse(json) as Partial<BackupFile>;
  const data = parsed?.data;
  const valid =
    parsed?.app === 'tsundoku' &&
    parsed?.version === 1 &&
    !!data &&
    Array.isArray(data.series) &&
    typeof data.volumesBySeriesId === 'object' &&
    data.volumesBySeriesId !== null;
  if (!valid) {
    throw new Error('Invalid Tsundoku backup file');
  }
  return data as BackupData;
}

function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function csvRow(fields: string[]): string {
  return fields.map(escapeCsvField).join(',');
}

export function buildCsv(data: BackupData): string {
  const header = 'series_title,series_type,total_volumes,volume_number,volume_status';
  const rows: string[] = [header];

  for (const series of data.series) {
    const totalVolumes = series.totalVolumes === null ? '' : String(series.totalVolumes);
    const volumes = data.volumesBySeriesId[series.id] ?? [];

    if (volumes.length === 0) {
      rows.push(csvRow([series.title, series.type, totalVolumes, '', '']));
      continue;
    }

    for (const volume of volumes) {
      rows.push(
        csvRow([series.title, series.type, totalVolumes, String(volume.number), volume.status]),
      );
    }
  }

  return rows.join('\n');
}
