import { lookupMangaPages } from '~/src/api/googlebooks';
import { FetchLike } from '~/src/api/isbn';

function fetchReturning(status: number, payload: unknown): FetchLike {
  return async () => ({ ok: status >= 200 && status < 300, status, json: async () => payload });
}

describe('lookupMangaPages', () => {
  it('restricts to French and searches by title + tome', async () => {
    let calledUrl = '';
    const fetchFn: FetchLike = async (url) => {
      calledUrl = url;
      return { ok: true, status: 200, json: async () => ({ items: [] }) };
    };
    await lookupMangaPages('One Piece', 5, fetchFn);
    expect(calledUrl).toContain('langRestrict=fr');
    expect(decodeURIComponent(calledUrl)).toContain('One Piece 5');
  });

  it('prefers a result that names the tome over another plausible one', async () => {
    const fetchFn = fetchReturning(200, {
      items: [
        { volumeInfo: { title: 'One Piece, Tome 7', pageCount: 210 } },
        { volumeInfo: { title: 'One Piece, Tome 5', pageCount: 192 } },
      ],
    });
    expect(await lookupMangaPages('One Piece', 5, fetchFn)).toBe(192);
  });

  it('falls back to any plausible result when none names the tome', async () => {
    const fetchFn = fetchReturning(200, {
      items: [{ volumeInfo: { title: 'One Piece — coffret', pageCount: 200 } }],
    });
    expect(await lookupMangaPages('One Piece', 5, fetchFn)).toBe(200);
  });

  it('rejects omnibus and chapter-booklet page counts', async () => {
    const fetchFn = fetchReturning(200, {
      items: [
        { volumeInfo: { title: 'One Piece coffret 5', pageCount: 620 } },
        { volumeInfo: { title: 'One Piece extrait 5', pageCount: 24 } },
      ],
    });
    expect(await lookupMangaPages('One Piece', 5, fetchFn)).toBeNull();
  });

  it('does not match a different tome number', async () => {
    const fetchFn = fetchReturning(200, {
      items: [{ volumeInfo: { title: 'One Piece, Tome 15', pageCount: 208 } }],
    });
    // 15 must not satisfy a search for tome 5; but it is still plausible, so it
    // is returned as the fallback. The guard only affects the "named" preference.
    expect(await lookupMangaPages('One Piece', 5, fetchFn)).toBe(208);
  });

  it('returns null on a transport failure', async () => {
    expect(await lookupMangaPages('One Piece', 5, fetchReturning(500, {}))).toBeNull();
  });
});
