import type { FetchLike } from '~/src/api/isbn';

const defaultFetch: FetchLike = (url, init) =>
  (globalThis as unknown as { fetch: FetchLike }).fetch(url, init);

// A single manga tome sits in this band. Below it are chapter booklets and noise;
// above it are omnibus / deluxe editions that would poison the page stats.
const MIN_PAGES = 80;
const MAX_PAGES = 360;

interface GoogleVolume {
  volumeInfo?: {
    title?: string | null;
    subtitle?: string | null;
    pageCount?: number | null;
    language?: string | null;
  };
}

function plausible(volume: GoogleVolume): boolean {
  const pages = volume.volumeInfo?.pageCount;
  return pages != null && pages >= MIN_PAGES && pages <= MAX_PAGES;
}

/** True when the title/subtitle names this tome number (e.g. "Tome 05", "Vol. 5"). */
function namesVolume(volume: GoogleVolume, tome: number): boolean {
  const text = `${volume.volumeInfo?.title ?? ''} ${volume.volumeInfo?.subtitle ?? ''}`;
  // The number as a standalone token, optionally zero-padded — so 5 matches "05"
  // but not "15" or "25".
  return new RegExp(`(^|\\D)0*${tome}(\\D|$)`).test(text);
}

/**
 * Best-effort page count for a single manga tome from Google Books, searching by
 * title + tome number and restricting to French editions (the ones the app
 * tracks). Prefers a result that actually names the tome, then any plausible one.
 * Returns null when nothing credible is found — the caller keeps its default.
 */
export async function lookupMangaPages(
  title: string,
  tome: number,
  fetchFn: FetchLike = defaultFetch,
): Promise<number | null> {
  const query = `${title} ${tome}`;
  const url =
    'https://www.googleapis.com/books/v1/volumes?q=' +
    encodeURIComponent(query) +
    '&langRestrict=fr&maxResults=5';

  let json: { items?: GoogleVolume[] };
  try {
    const res = await fetchFn(url);
    if (!res.ok) {
      return null;
    }
    json = (await res.json()) as { items?: GoogleVolume[] };
  } catch {
    return null;
  }

  const items = json.items ?? [];
  const named = items.find((v) => plausible(v) && namesVolume(v, tome));
  const anyPlausible = items.find(plausible);
  return (named ?? anyPlausible)?.volumeInfo?.pageCount ?? null;
}
