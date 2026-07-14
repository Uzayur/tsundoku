import { Volume } from '~/src/db/models';
import { progressFraction, readCount } from '~/src/lib/progress';

function vol(number: number, status: Volume['status']): Volume {
  return {
    id: number,
    seriesId: 1,
    number,
    isbn: null,
    title: null,
    pageCount: null,
    coverUrl: null,
    status,
    currentPage: null,
    startedAt: null,
    finishedAt: null,
  };
}

describe('readCount', () => {
  it('counts only read volumes', () => {
    expect(readCount([vol(1, 'read'), vol(2, 'owned'), vol(3, 'read')])).toBe(2);
    expect(readCount([])).toBe(0);
  });
});

describe('progressFraction', () => {
  it('handles zero, partial, full, and null/zero totals', () => {
    expect(progressFraction(0, 10)).toBe(0);
    expect(progressFraction(5, 10)).toBe(0.5);
    expect(progressFraction(10, 10)).toBe(1);
    expect(progressFraction(3, null)).toBe(0);
    expect(progressFraction(3, 0)).toBe(0);
    expect(progressFraction(20, 10)).toBe(1); // clamped
  });
});
