import {
  BookMetadata,
  cleanWorkDescription,
  FetchLike,
  lookupGoogleBooks,
  lookupIsbn,
  lookupOpenLibrary,
  lookupOpenLibraryDescription,
  normalizeCategories,
  stripHtml,
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

describe('normalizeCategories', () => {
  it('splits BISAC paths and drops the fiction head', () => {
    expect(normalizeCategories(['Fiction / Fantasy / Epic'])).toEqual(['Fantasy', 'Epic']);
  });

  it('dedupes tags across paths, case-insensitively', () => {
    expect(
      normalizeCategories(['Fiction / Fantasy', 'Juvenile Fiction / fantasy / Wizards']),
    ).toEqual(['Fantasy', 'Wizards']);
  });

  it('returns an empty array when nothing survives the filter', () => {
    expect(normalizeCategories(['Fiction', 'General'])).toEqual([]);
    expect(normalizeCategories([])).toEqual([]);
  });
});

describe('stripHtml', () => {
  it('unwraps tags, entities and paragraph breaks', () => {
    expect(stripHtml('<p>Hello&nbsp;<b>world</b></p><p>Line&amp;two</p>')).toBe(
      'Hello world\n\nLine&two',
    );
  });

  it('collapses runs of blank lines', () => {
    expect(stripHtml('a<br><br><br><br>b')).toBe('a\n\nb');
  });
});

describe('lookupOpenLibrary', () => {
  it('parses a fixture into BookMetadata', async () => {
    const result = await lookupOpenLibrary(ISBN, fetchReturning(200, OPEN_LIBRARY_FIXTURE));
    expect(result).toEqual<BookMetadata>({
      isbn: ISBN,
      title: 'Chainsaw Man, Vol. 1',
      pageCount: 192,
      coverUrl: 'https://covers.openlibrary.org/b/id/12794650-L.jpg',
      authors: ['Tatsuki Fujimoto'],
      genres: [],
      description: null,
      publisher: null,
      publishedYear: null,
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

  it('extracts French genres from subjects, dropping noise', async () => {
    const result = await lookupOpenLibrary(
      ISBN,
      fetchReturning(200, {
        [`ISBN:${ISBN}`]: {
          title: 'L’étranger',
          subjects: [
            { name: 'Philosophical Novels' },
            { name: 'Murder' },
            { name: 'Fiction' },
            { name: 'French' },
          ],
        },
      }),
    );
    expect(result?.genres).toEqual(['Roman philosophique']);
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

describe('cleanWorkDescription', () => {
  it('strips markdown link-ref lines and the [SDM] tag', () => {
    const raw = 'Un vampire et une sorcière. [SDM].\n\n[1]: https://example.org/x';
    expect(cleanWorkDescription(raw)).toBe('Un vampire et une sorcière.');
  });
});

describe('lookupOpenLibraryDescription', () => {
  function twoStepFetch(searchPayload: unknown, workPayload: unknown): FetchLike {
    return async (url) => ({
      ok: true,
      status: 200,
      json: async () => (url.includes('search.json') ? searchPayload : workPayload),
    });
  }

  it('resolves the work behind an ISBN and returns its description string', async () => {
    const fetchFn = twoStepFetch(
      { docs: [{ key: '/works/OL1230613W' }] },
      { description: 'Le premier roman de Camus.' },
    );
    expect(await lookupOpenLibraryDescription(ISBN, fetchFn)).toBe('Le premier roman de Camus.');
  });

  it('reads the { value } description shape', async () => {
    const fetchFn = twoStepFetch(
      { docs: [{ key: '/works/OL1W' }] },
      { description: { value: 'Une grève de mineurs.' } },
    );
    expect(await lookupOpenLibraryDescription(ISBN, fetchFn)).toBe('Une grève de mineurs.');
  });

  it('returns null when the ISBN matches no work', async () => {
    const fetchFn = twoStepFetch({ docs: [] }, {});
    expect(await lookupOpenLibraryDescription(ISBN, fetchFn)).toBeNull();
  });

  it('returns null when the work has no description', async () => {
    const fetchFn = twoStepFetch({ docs: [{ key: '/works/OL1W' }] }, { title: 'No blurb' });
    expect(await lookupOpenLibraryDescription(ISBN, fetchFn)).toBeNull();
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
      genres: [],
      description: null,
      publisher: null,
      publishedYear: null,
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
      genres: [],
      description: null,
      publisher: null,
      publishedYear: null,
    });
  });

  it('maps categories, description and publishing info from Google Books', async () => {
    const result = await lookupGoogleBooks(
      ISBN,
      fetchReturning(200, {
        totalItems: 1,
        items: [
          {
            volumeInfo: {
              title: 'Rich Volume',
              pageCount: 320,
              categories: ['Fiction / Fantasy / Epic', 'Juvenile Fiction / Action & Adventure'],
              description: '<p>A <b>bold</b> quest.</p><br>The end.',
              publisher: 'Viz Media',
              publishedDate: '2020-11-03',
            },
          },
        ],
      }),
    );
    expect(result?.genres).toEqual(['Fantasy', 'Epic', 'Action & Adventure']);
    expect(result?.description).toBe('A bold quest.\n\nThe end.');
    expect(result?.publisher).toBe('Viz Media');
    expect(result?.publishedYear).toBe(2020);
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

  it('keeps Open Library edition data but takes genres and synopsis from Google Books', async () => {
    const fakeFetch: FetchLike = async (url) =>
      url.startsWith('https://openlibrary.org')
        ? { ok: true, status: 200, json: async () => OPEN_LIBRARY_FIXTURE }
        : {
            ok: true,
            status: 200,
            json: async () => ({
              totalItems: 1,
              items: [
                {
                  volumeInfo: {
                    title: 'Chainsaw Man, Vol. 1',
                    pageCount: 999,
                    categories: ['Comics & Graphic Novels / Manga / Action & Adventure'],
                    description: 'Denji dreams of a normal life.',
                  },
                },
              ],
            }),
          };

    const result = await lookupIsbn(ISBN, fakeFetch);

    // Edition-level fields stay with Open Library...
    expect(result?.pageCount).toBe(192);
    expect(result?.coverUrl).toBe('https://covers.openlibrary.org/b/id/12794650-L.jpg');
    // ...while genres and the synopsis only exist on Google Books.
    expect(result?.genres).toEqual(['Comics & Graphic Novels', 'Manga', 'Action & Adventure']);
    expect(result?.description).toBe('Denji dreams of a normal life.');
  });

  it('falls back to Open Library subjects when Google Books has no categories', async () => {
    const fakeFetch: FetchLike = async (url) =>
      url.startsWith('https://openlibrary.org')
        ? {
            ok: true,
            status: 200,
            json: async () => ({
              [`ISBN:${ISBN}`]: {
                title: 'Germinal',
                number_of_pages: 592,
                subjects: [{ name: 'Classic Literature' }, { name: 'Coal miners' }],
              },
            }),
          }
        : {
            ok: true,
            status: 200,
            // Google found the edition but tagged no categories — the French novel case.
            json: async () => ({
              totalItems: 1,
              items: [{ volumeInfo: { title: 'Germinal', description: 'Miners strike.' } }],
            }),
          };

    const result = await lookupIsbn(ISBN, fakeFetch);

    expect(result?.genres).toEqual(['Classique']);
    expect(result?.description).toBe('Miners strike.');
  });

  it('fills a missing description from the Open Library work as a last resort', async () => {
    const fakeFetch: FetchLike = async (url) => {
      if (url.includes('/api/books')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ [`ISBN:${ISBN}`]: { title: 'L’étranger', number_of_pages: 159 } }),
        };
      }
      if (url.includes('googleapis')) {
        // Google found the edition but has no synopsis — the French novel case.
        return {
          ok: true,
          status: 200,
          json: async () => ({ totalItems: 1, items: [{ volumeInfo: { title: 'L’étranger' } }] }),
        };
      }
      if (url.includes('search.json')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ docs: [{ key: '/works/OL1230613W' }] }),
        };
      }
      // The work record.
      return {
        ok: true,
        status: 200,
        json: async () => ({ description: 'Le premier roman de Camus.' }),
      };
    };

    const result = await lookupIsbn(ISBN, fakeFetch);

    expect(result?.description).toBe('Le premier roman de Camus.');
  });

  it('returns the Open Library result when Google Books is rate limited', async () => {
    const fakeFetch: FetchLike = async (url) =>
      url.startsWith('https://openlibrary.org')
        ? {
            ok: true,
            status: 200,
            json: async () => ({
              [`ISBN:${ISBN}`]: { title: 'Tome inconnu', number_of_pages: null },
            }),
          }
        : { ok: false, status: 429, json: async () => ({}) };

    const result = await lookupIsbn(ISBN, fakeFetch);

    expect(result?.title).toBe('Tome inconnu');
    expect(result?.pageCount).toBeNull();
  });
});
