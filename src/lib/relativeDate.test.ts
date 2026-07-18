import { relativeDate, shortDate } from '~/src/lib/relativeDate';

// Local noon, so the test is not sensitive to the machine's timezone.
const NOW = new Date(2026, 6, 17, 12, 0, 0); // 17 July 2026

function daysAgo(n: number): string {
  const d = new Date(2026, 6, 17 - n, 9, 0, 0);
  return d.toISOString();
}

describe('relativeDate', () => {
  it("labels the same calendar day as aujourd'hui", () => {
    expect(relativeDate(daysAgo(0), NOW)).toBe("aujourd'hui");
  });

  it('labels the previous calendar day as hier', () => {
    expect(relativeDate(daysAgo(1), NOW)).toBe('hier');
  });

  it('counts days up to 7', () => {
    expect(relativeDate(daysAgo(2), NOW)).toBe('il y a 2 jours');
    expect(relativeDate(daysAgo(7), NOW)).toBe('il y a 7 jours');
  });

  it('switches to weeks at 8 days', () => {
    expect(relativeDate(daysAgo(8), NOW)).toBe('il y a 1 semaine');
    expect(relativeDate(daysAgo(14), NOW)).toBe('il y a 2 semaines');
    expect(relativeDate(daysAgo(30), NOW)).toBe('il y a 4 semaines');
  });

  it('switches to months at 31 days', () => {
    expect(relativeDate(daysAgo(31), NOW)).toBe('il y a 1 mois');
    expect(relativeDate(daysAgo(90), NOW)).toBe('il y a 3 mois');
    expect(relativeDate(daysAgo(365), NOW)).toBe('il y a 12 mois');
  });

  it('switches to years past 365 days', () => {
    expect(relativeDate(daysAgo(366), NOW)).toBe('il y a 1 an');
    expect(relativeDate(daysAgo(800), NOW)).toBe('il y a 2 ans');
  });

  it('treats a date-only string as local midnight that day', () => {
    expect(relativeDate('2026-07-17', NOW)).toBe("aujourd'hui");
    expect(relativeDate('2026-07-16', NOW)).toBe('hier');
  });

  it("clamps a future date to aujourd'hui rather than a negative span", () => {
    expect(relativeDate(daysAgo(-5), NOW)).toBe("aujourd'hui");
  });

  it('compares calendar days, not elapsed hours', () => {
    // 23h58 apart, but two different calendar days → hier, not aujourd'hui.
    const late = new Date(2026, 6, 16, 23, 59, 0).toISOString();
    expect(relativeDate(late, new Date(2026, 6, 17, 0, 1, 0))).toBe('hier');
  });
});

describe('shortDate', () => {
  it('formats a full timestamp as DD/MM/YYYY, zero-padded', () => {
    expect(shortDate(new Date(2026, 2, 5, 9, 0, 0).toISOString())).toBe('05/03/2026');
  });

  it('reads a date-only string as local, not shifted a day west of Greenwich', () => {
    expect(shortDate('2026-01-01')).toBe('01/01/2026');
  });
});
