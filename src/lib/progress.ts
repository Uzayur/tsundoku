import { Volume } from '~/src/db/models';

export function readCount(volumes: Volume[]): number {
  return volumes.filter((v) => v.status === 'read').length;
}

export function progressFraction(read: number, total: number | null): number {
  if (!total || total <= 0) return 0;
  return Math.min(1, read / total);
}
