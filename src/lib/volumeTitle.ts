/** Lowercase, strip accents and punctuation, collapse whitespace. */
export function normalizeTitle(title: string): string {
  return title
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// Trailing volume marker: a separator, an optional keyword, then digits,
// anchored at the end so a leading number ("20th Century Boys") stays part of
// the title. The separator is required so digits welded to the title ("1984")
// are not read as a tome. Longest keywords come first so "tome" is not
// consumed by the bare "t" alternative.
const VOLUME_RE = /[\s,]+(?:tome|volume|vol\.?|t|n[°ºo]\.?|#)?\s*(\d{1,3})\s*$/i;

/**
 * Split an edition title into its series title and volume number.
 * Returns number: null when the title carries no trailing volume marker.
 */
export function parseVolumeTitle(title: string): { baseTitle: string; number: number | null } {
  const trimmed = title.trim();
  const match = VOLUME_RE.exec(trimmed);
  if (!match) {
    return { baseTitle: trimmed, number: null };
  }

  const baseTitle = trimmed.slice(0, match.index).replace(/[\s,]+$/, '');
  // A title that is nothing but a number ("1984") is a work, not a tome.
  if (baseTitle === '') {
    return { baseTitle: trimmed, number: null };
  }
  return { baseTitle, number: Number(match[1]) };
}
