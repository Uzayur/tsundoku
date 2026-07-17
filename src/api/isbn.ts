import { subjectsToGenres } from '~/src/lib/genres';

export interface BookMetadata {
  isbn: string;
  title: string | null;
  pageCount: number | null;
  coverUrl: string | null;
  authors: string[];
  genres: string[];
  description: string | null;
  publisher: string | null;
  publishedYear: number | null;
}

export type FetchLike = (
  url: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string },
) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

const defaultFetch: FetchLike = (url, init) =>
  (globalThis as unknown as { fetch: FetchLike }).fetch(url, init);

interface OpenLibraryBook {
  title?: string | null;
  number_of_pages?: number | null;
  cover?: { small?: string; medium?: string; large?: string } | null;
  authors?: { name?: string | null }[];
  subjects?: { name?: string | null }[];
}

interface GoogleBooksVolume {
  volumeInfo?: {
    title?: string | null;
    pageCount?: number | null;
    imageLinks?: { smallThumbnail?: string; thumbnail?: string } | null;
    authors?: string[];
    categories?: string[] | null;
    description?: string | null;
    publisher?: string | null;
    publishedDate?: string | null;
  };
}

/**
 * Google Books ships BISAC paths ("Fiction / Fantasy / Epic"). Split them into
 * standalone tags, dropping the "Fiction"/"Juvenile Fiction" head that says
 * nothing a reader wants on a badge.
 */
const GENRE_HEADS = new Set(['fiction', 'juvenile fiction', 'young adult fiction', 'general']);

export function normalizeCategories(categories: string[]): string[] {
  const out: string[] = [];
  for (const path of categories) {
    for (const part of path.split('/')) {
      const tag = part.trim();
      if (tag === '' || GENRE_HEADS.has(tag.toLowerCase())) continue;
      if (!out.some((seen) => seen.toLowerCase() === tag.toLowerCase())) out.push(tag);
    }
  }
  return out;
}

/** Google descriptions carry stray markup even when we ask for plain text. */
export function stripHtml(text: string): string {
  return text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** "2003-06-21" and "2003" both carry the only part we keep. */
function parseYear(date: string | null | undefined): number | null {
  const match = /^(\d{4})/.exec(date ?? '');
  return match ? Number(match[1]) : null;
}

export async function lookupOpenLibrary(
  isbn: string,
  fetchFn: FetchLike,
): Promise<BookMetadata | null> {
  const res = await fetchFn(
    `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`,
  );

  if (!res.ok) {
    return null;
  }

  const json = (await res.json()) as Record<string, OpenLibraryBook | undefined>;
  const book = json[`ISBN:${isbn}`];
  if (!book) {
    return null;
  }

  return {
    isbn,
    title: book.title ?? null,
    pageCount: book.number_of_pages ?? null,
    coverUrl: book.cover?.large ?? null,
    authors: (book.authors ?? []).map((author) => author.name ?? '').filter((name) => name !== ''),
    // Open Library's `subjects` mixes genres with shelving noise, so an allow-list
    // keeps only recognized ones. This is the fallback for French novels, whose
    // Google Books categories are usually empty. jscmd=data carries no synopsis,
    // so description/publisher still come from Google Books.
    genres: subjectsToGenres(
      (book.subjects ?? []).map((s) => s.name ?? '').filter((name) => name !== ''),
    ),
    description: null,
    publisher: null,
    publishedYear: null,
  };
}

interface OpenLibraryWork {
  description?: string | { value?: string | null } | null;
}

/** OL synopses carry markdown link-ref lines and cataloguing tags like "[SDM]". */
export function cleanWorkDescription(text: string): string {
  return text
    .replace(/\r/g, '')
    .replace(/^\s*\[\d+\]:.*$/gm, '') // markdown link-reference definitions
    .replace(/\s*\[SDM\]\.?/g, '') // French cataloguing source marker
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * The jscmd=data endpoint carries no synopsis, so this resolves the work behind
 * an ISBN (search API) and reads its description. Two extra round-trips, so it
 * runs only as the fallback when Google Books gave no description — chiefly for
 * French novels. Returns null on any miss rather than throwing.
 */
export async function lookupOpenLibraryDescription(
  isbn: string,
  fetchFn: FetchLike,
): Promise<string | null> {
  const searchRes = await fetchFn(
    `https://openlibrary.org/search.json?q=isbn:${isbn}&fields=key&limit=1`,
  );
  if (!searchRes.ok) {
    return null;
  }
  const search = (await searchRes.json()) as { docs?: { key?: string | null }[] };
  const workKey = search.docs?.[0]?.key;
  if (!workKey) {
    return null;
  }

  const workRes = await fetchFn(`https://openlibrary.org${workKey}.json`);
  if (!workRes.ok) {
    return null;
  }
  const work = (await workRes.json()) as OpenLibraryWork;
  const raw = typeof work.description === 'string' ? work.description : work.description?.value;
  if (!raw) {
    return null;
  }
  const cleaned = cleanWorkDescription(raw);
  return cleaned === '' ? null : cleaned;
}

export async function lookupGoogleBooks(
  isbn: string,
  fetchFn: FetchLike,
): Promise<BookMetadata | null> {
  const res = await fetchFn(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`);

  if (!res.ok) {
    return null;
  }

  const json = (await res.json()) as { totalItems?: number; items?: GoogleBooksVolume[] };
  const item = json.items?.[0];
  if (!item) {
    return null;
  }

  const info = item.volumeInfo ?? {};
  return {
    isbn,
    title: info.title ?? null,
    pageCount: info.pageCount ?? null,
    coverUrl: info.imageLinks?.thumbnail ?? null,
    authors: info.authors ?? [],
    genres: normalizeCategories(info.categories ?? []),
    description: info.description ? stripHtml(info.description) : null,
    publisher: info.publisher ?? null,
    publishedYear: parseYear(info.publishedDate),
  };
}

async function orNull(p: Promise<BookMetadata | null>): Promise<BookMetadata | null> {
  try {
    return await p;
  } catch {
    return null;
  }
}

export async function lookupIsbn(
  isbn: string,
  fetchFn: FetchLike = defaultFetch,
): Promise<BookMetadata | null> {
  // Both sources are always queried: Open Library has the better edition data,
  // but description and publisher exist only on Google Books. Run them together
  // so the scan costs one round-trip, not two.
  const [fromOpenLibrary, fromGoogle] = await Promise.all([
    orNull(lookupOpenLibrary(isbn, fetchFn)),
    orNull(lookupGoogleBooks(isbn, fetchFn)),
  ]);

  const merged =
    fromOpenLibrary && fromGoogle
      ? {
          ...fromOpenLibrary,
          // Open Library often knows the edition but not its length.
          pageCount: fromOpenLibrary.pageCount ?? fromGoogle.pageCount,
          coverUrl: fromOpenLibrary.coverUrl ?? fromGoogle.coverUrl,
          authors:
            fromOpenLibrary.authors.length > 0 ? fromOpenLibrary.authors : fromGoogle.authors,
          // Google Books BISAC categories are cleaner when present; Open Library
          // subjects are the fallback (chiefly for French novels Google doesn't tag).
          genres: fromGoogle.genres.length > 0 ? fromGoogle.genres : fromOpenLibrary.genres,
          description: fromGoogle.description,
          publisher: fromGoogle.publisher,
          publishedYear: fromGoogle.publishedYear,
        }
      : (fromOpenLibrary ?? fromGoogle);

  if (!merged) return null;

  // Google Books rarely has a synopsis for French editions. Only then pay for
  // the extra Open Library work lookup that does.
  if (!merged.description) {
    try {
      const description = await lookupOpenLibraryDescription(isbn, fetchFn);
      if (description) return { ...merged, description };
    } catch {
      // Leave the description empty rather than fail the whole scan.
    }
  }

  return merged;
}
