import {
  BookMetadata,
  FetchLike,
  lookupGoogleBooks,
  lookupIsbn,
  lookupOpenLibrary,
} from '~/src/api/isbn';

const ISBN = '9781974709939';

const OPEN_LIBRARY_FIXTURE = {
  'ISBN:9781974709939': {
    url: 'http://openlibrary.org/books/OL30165195M/Chainsaw_Man_Vol._1',
    key: '/books/OL30165195M',
    title: 'Chainsaw Man, Vol. 1',
    authors: [
      {
        url: 'http://openlibrary.org/authors/OL7532576A/Tatsuki_Fujimoto',
        name: 'Tatsuki Fujimoto',
      },
    ],
    number_of_pages: 192,
    cover: {
      small: 'https://covers.openlibrary.org/b/id/12794650-S.jpg',
      medium: 'https://covers.openlibrary.org/b/id/12794650-M.jpg',
      large: 'https://covers.openlibrary.org/b/id/12794650-L.jpg',
    },
  },
};

const GOOGLE_BOOKS_FIXTURE = {
  totalItems: 1,
  items: [
    {
      volumeInfo: {
        title: 'Chainsaw Man, Vol. 1',
        authors: ['Tatsuki Fujimoto'],
        pageCount: 192,
        imageLinks: {
          smallThumbnail: 'https://books.google.com/books/content?id=abc&img=1&zoom=5',
          thumbnail: 'https://books.google.com/books/content?id=abc&img=1&zoom=1',
        },
      },
    },
  ],
};

function fetchReturning(status: number, payload: unknown): FetchLike {
  return async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  });
}

describe('lookupOpenLibrary', () => {
  it('parses a fixture into BookMetadata', async () => {
    const result = await lookupOpenLibrary(ISBN, fetchReturning(200, OPEN_LIBRARY_FIXTURE));
    expect(result).toEqual<BookMetadata>({
      isbn: ISBN,
      title: 'Chainsaw Man, Vol. 1',
      pageCount: 192,
      coverUrl: 'https://covers.openlibrary.org/b/id/12794650-L.jpg',
      authors: ['Tatsuki Fujimoto'],
    });
  });

  it('builds the expected request url', async () => {
    let capturedUrl: string | undefined;
    const fakeFetch: FetchLike = async (url) => {
      capturedUrl = url;
      return { ok: true, status: 200, json: async () => OPEN_LIBRARY_FIXTURE };
    };
    await lookupOpenLibrary(ISBN, fakeFetch);
    expect(capturedUrl).toBe(
      `https://openlibrary.org/api/books?bibkeys=ISBN:${ISBN}&format=json&jscmd=data`,
    );
  });

  it('returns null when the ISBN key is missing', async () => {
    const result = await lookupOpenLibrary(ISBN, fetchReturning(200, {}));
    expect(result).toBeNull();
  });

  it('maps a missing cover to a null coverUrl', async () => {
    const result = await lookupOpenLibrary(
      ISBN,
      fetchReturning(200, {
        [`ISBN:${ISBN}`]: {
          title: 'No Cover Volume',
          number_of_pages: 100,
          authors: [{ name: 'Someone' }],
        },
      }),
    );
    expect(result?.coverUrl).toBeNull();
  });

  it('defaults authors to an empty array when missing', async () => {
    const result = await lookupOpenLibrary(
      ISBN,
      fetchReturning(200, { [`ISBN:${ISBN}`]: { title: 'Anon' } }),
    );
    expect(result?.authors).toEqual([]);
    expect(result?.title).toBe('Anon');
    expect(result?.pageCount).toBeNull();
  });

  it('returns null when the response is not ok', async () => {
    const result = await lookupOpenLibrary(ISBN, fetchReturning(500, OPEN_LIBRARY_FIXTURE));
    expect(result).toBeNull();
  });
});

describe('lookupGoogleBooks', () => {
  it('parses a fixture into BookMetadata', async () => {
    const result = await lookupGoogleBooks(ISBN, fetchReturning(200, GOOGLE_BOOKS_FIXTURE));
    expect(result).toEqual<BookMetadata>({
      isbn: ISBN,
      title: 'Chainsaw Man, Vol. 1',
      pageCount: 192,
      coverUrl: 'https://books.google.com/books/content?id=abc&img=1&zoom=1',
      authors: ['Tatsuki Fujimoto'],
    });
  });

  it('builds the expected request url', async () => {
    let capturedUrl: string | undefined;
    const fakeFetch: FetchLike = async (url) => {
      capturedUrl = url;
      return { ok: true, status: 200, json: async () => GOOGLE_BOOKS_FIXTURE };
    };
    await lookupGoogleBooks(ISBN, fakeFetch);
    expect(capturedUrl).toBe(`https://www.googleapis.com/books/v1/volumes?q=isbn:${ISBN}`);
  });

  it('returns null when totalItems is 0', async () => {
    const result = await lookupGoogleBooks(ISBN, fetchReturning(200, { totalItems: 0 }));
    expect(result).toBeNull();
  });

  it('returns null when there are no items', async () => {
    const result = await lookupGoogleBooks(ISBN, fetchReturning(200, { totalItems: 1 }));
    expect(result).toBeNull();
  });

  it('maps missing imageLinks and authors to null cover and empty authors', async () => {
    const result = await lookupGoogleBooks(
      ISBN,
      fetchReturning(200, {
        totalItems: 1,
        items: [{ volumeInfo: { title: 'Bare Volume', pageCount: 50 } }],
      }),
    );
    expect(result).toEqual<BookMetadata>({
      isbn: ISBN,
      title: 'Bare Volume',
      pageCount: 50,
      coverUrl: null,
      authors: [],
    });
  });

  it('returns null when the response is not ok', async () => {
    const result = await lookupGoogleBooks(ISBN, fetchReturning(429, GOOGLE_BOOKS_FIXTURE));
    expect(result).toBeNull();
  });
});

describe('lookupIsbn', () => {
  it('returns the Open Library result when present', async () => {
    const result = await lookupIsbn(ISBN, fetchReturning(200, OPEN_LIBRARY_FIXTURE));
    expect(result?.title).toBe('Chainsaw Man, Vol. 1');
    expect(result?.coverUrl).toBe('https://covers.openlibrary.org/b/id/12794650-L.jpg');
  });

  it('falls back to Google Books when Open Library returns null', async () => {
    const fakeFetch: FetchLike = async (url) => {
      if (url.startsWith('https://openlibrary.org')) {
        return { ok: true, status: 200, json: async () => ({}) };
      }
      return { ok: true, status: 200, json: async () => GOOGLE_BOOKS_FIXTURE };
    };
    const result = await lookupIsbn(ISBN, fakeFetch);
    expect(result?.title).toBe('Chainsaw Man, Vol. 1');
    expect(result?.coverUrl).toBe('https://books.google.com/books/content?id=abc&img=1&zoom=1');
  });

  it('returns null when both sources return null', async () => {
    const fakeFetch: FetchLike = async (url) => {
      if (url.startsWith('https://openlibrary.org')) {
        return { ok: true, status: 200, json: async () => ({}) };
      }
      return { ok: true, status: 200, json: async () => ({ totalItems: 0 }) };
    };
    const result = await lookupIsbn(ISBN, fakeFetch);
    expect(result).toBeNull();
  });

  it('falls back to Google Books when Open Library throws', async () => {
    const fakeFetch: FetchLike = async (url) => {
      if (url.startsWith('https://openlibrary.org')) {
        throw new Error('network down');
      }
      return { ok: true, status: 200, json: async () => GOOGLE_BOOKS_FIXTURE };
    };
    const result = await lookupIsbn(ISBN, fakeFetch);
    expect(result?.title).toBe('Chainsaw Man, Vol. 1');
  });
});

describe('lookupIsbn page count fallback', () => {
  it('fills a missing page count from Google Books, keeping Open Library metadata', async () => {
    const fakeFetch: FetchLike = async (url) => ({
      ok: true,
      status: 200,
      json: async () =>
        url.startsWith('https://openlibrary.org')
          ? { [`ISBN:${ISBN}`]: { title: 'One Piece 4', number_of_pages: null } }
          : { items: [{ volumeInfo: { title: 'One Piece Vol. 4', pageCount: 190 } }] },
    });

    const result = await lookupIsbn(ISBN, fakeFetch);

    expect(result?.title).toBe('One Piece 4');
    expect(result?.pageCount).toBe(190);
  });

  it('keeps the Open Library page count without calling Google Books', async () => {
    const urls: string[] = [];
    const fakeFetch: FetchLike = async (url) => {
      urls.push(url);
      return { ok: true, status: 200, json: async () => OPEN_LIBRARY_FIXTURE };
    };

    const result = await lookupIsbn(ISBN, fakeFetch);

    expect(result?.pageCount).toBe(192);
    expect(urls.some((u) => u.includes('googleapis'))).toBe(false);
  });

  it('returns the Open Library result when Google Books is rate limited', async () => {
    const fakeFetch: FetchLike = async (url) =>
      url.startsWith('https://openlibrary.org')
        ? {
            ok: true,
            status: 200,
            json: async () => ({ [`ISBN:${ISBN}`]: { title: 'Tome inconnu', number_of_pages: null } }),
          }
        : { ok: false, status: 429, json: async () => ({}) };

    const result = await lookupIsbn(ISBN, fakeFetch);

    expect(result?.title).toBe('Tome inconnu');
    expect(result?.pageCount).toBeNull();
  });
});
