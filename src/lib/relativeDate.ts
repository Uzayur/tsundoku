/**
 * Parse a stored date. A date-only `YYYY-MM-DD` is parsed as UTC midnight by
 * the JS spec, which lands on the previous day west of Greenwich; appending a
 * time makes it local midnight instead.
 */
function parseStored(iso: string): Date {
  return new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
}

function startOfLocalDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

const DAY_MS = 86_400_000;

/**
 * French relative label for a stored ISO date, comparing calendar days rather
 * than elapsed hours. `now` is injected so callers stay testable. A future
 * date (clock skew, imported data) is clamped to "aujourd'hui".
 */
export function relativeDate(iso: string, now: Date): string {
  // Math.round absorbs the ±1h that a DST boundary puts between two midnights.
  const days = Math.round((startOfLocalDay(now) - startOfLocalDay(parseStored(iso))) / DAY_MS);

  if (days <= 0) return "aujourd'hui";
  if (days === 1) return 'hier';
  if (days <= 7) return `il y a ${days} jours`;

  if (days <= 30) {
    const weeks = Math.round(days / 7);
    return weeks === 1 ? 'il y a 1 semaine' : `il y a ${weeks} semaines`;
  }

  if (days <= 365) {
    // "mois" is invariable — no plural branch needed.
    return `il y a ${Math.floor(days / 30)} mois`;
  }

  const years = Math.floor(days / 365);
  return years === 1 ? 'il y a 1 an' : `il y a ${years} ans`;
}
