export interface BookMetadata {
  isbn: string;
  title: string | null;
  pageCount: number | null;
  coverUrl: string | null;
  authors: string[];
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
}

interface GoogleBooksVolume {
  volumeInfo?: {
    title?: string | null;
    pageCount?: number | null;
    imageLinks?: { smallThumbnail?: string; thumbnail?: string } | null;
    authors?: string[];
  };
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
  };
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
  };
}

export async function lookupIsbn(
  isbn: string,
  fetchFn: FetchLike = defaultFetch,
): Promise<BookMetadata | null> {
  let fromOpenLibrary: BookMetadata | null = null;
  try {
    fromOpenLibrary = await lookupOpenLibrary(isbn, fetchFn);
  } catch {
    fromOpenLibrary = null;
  }
  if (fromOpenLibrary?.pageCount != null) {
    return fromOpenLibrary;
  }

  // Open Library often knows the edition but not its length. Borrow just the
  // page count from Google Books rather than return a volume worth 0 pages.
  let fromGoogle: BookMetadata | null = null;
  try {
    fromGoogle = await lookupGoogleBooks(isbn, fetchFn);
  } catch {
    fromGoogle = null;
  }

  if (fromOpenLibrary) {
    return { ...fromOpenLibrary, pageCount: fromGoogle?.pageCount ?? null };
  }
  return fromGoogle;
}
