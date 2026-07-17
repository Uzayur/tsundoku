import { FetchLike } from '~/src/api/isbn';

interface SearchDoc {
  title?: string | null;
  number_of_pages_median?: number | null;
}

const defaultFetch: FetchLike = (url, init) =>
  (globalThis as unknown as { fetch: FetchLike }).fetch(url, init);

// A single tome sits well inside these bounds. Omnibus and deluxe editions blow
// past the upper bound and would poison the stats, so we ignore them.
const MIN_PAGES = 40;
const MAX_PAGES = 400;

/**
 * Best-effort page count for a tome, from the OpenLibrary search index.
 * Returns null whenever nothing plausible is found — callers must ask the user
 * rather than invent a length.
 */
export async function lookupPagesByTitle(
  title: string,
  volume: number | null,
  fetchFn: FetchLike = defaultFetch,
): Promise<number | null> {
  const query = volume == null ? title : `${title} ${volume}`;
  const url =
    'https://openlibrary.org/search.json?q=' +
    encodeURIComponent(query) +
    '&fields=title,number_of_pages_median&limit=3';

  let json: { docs?: SearchDoc[] };
  try {
    const res = await fetchFn(url);
    if (!res.ok) {
      return null;
    }
    json = (await res.json()) as { docs?: SearchDoc[] };
  } catch {
    return null;
  }

  for (const doc of json.docs ?? []) {
    const pages = doc.number_of_pages_median;
    if (pages != null && pages >= MIN_PAGES && pages <= MAX_PAGES) {
      return pages;
    }
  }
  return null;
}
