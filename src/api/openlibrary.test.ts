import { FetchLike } from '~/src/api/isbn';
import { lookupPagesByTitle } from '~/src/api/openlibrary';

function fakeFetch(payload: unknown, ok = true): FetchLike {
  return async () => ({ ok, status: ok ? 200 : 500, json: async () => payload });
}

describe('lookupPagesByTitle', () => {
  it('returns the median page count of the first scored document', async () => {
    const fetchFn = fakeFetch({
      docs: [{ title: 'ONE PIECE 1', number_of_pages_median: 208 }],
    });
    await expect(lookupPagesByTitle('One Piece', 1, fetchFn)).resolves.toBe(208);
  });

  it('skips documents without a page count', async () => {
    const fetchFn = fakeFetch({
      docs: [
        { title: 'Jujutsu Kaisen : Official Guide', number_of_pages_median: null },
        { title: 'Jujutsu Kaisen, Vol. 1', number_of_pages_median: 192 },
      ],
    });
    await expect(lookupPagesByTitle('Jujutsu Kaisen', 1, fetchFn)).resolves.toBe(192);
  });

  it('rejects implausible page counts (deluxe omnibus editions)', async () => {
    const fetchFn = fakeFetch({
      docs: [
        { title: 'Berserk Deluxe Volume 1', number_of_pages_median: 696 },
        { title: 'Berserk 1', number_of_pages_median: 224 },
      ],
    });
    await expect(lookupPagesByTitle('Berserk', 1, fetchFn)).resolves.toBe(224);
  });

  it('returns null when the search has no usable result', async () => {
    await expect(lookupPagesByTitle('Inconnu', 1, fakeFetch({ docs: [] }))).resolves.toBeNull();
  });

  it('returns null when the request fails', async () => {
    await expect(lookupPagesByTitle('One Piece', 1, fakeFetch({}, false))).resolves.toBeNull();
  });

  it('returns null when the network throws', async () => {
    const boom: FetchLike = async () => {
      throw new Error('offline');
    };
    await expect(lookupPagesByTitle('One Piece', 1, boom)).resolves.toBeNull();
  });

  it('queries the title alone when the volume number is unknown', async () => {
    const urls: string[] = [];
    const fetchFn: FetchLike = async (url) => {
      urls.push(url);
      return { ok: true, status: 200, json: async () => ({ docs: [] }) };
    };
    await lookupPagesByTitle('Le Nom du vent', null, fetchFn);
    expect(urls[0]).toContain(encodeURIComponent('Le Nom du vent'));
    expect(urls[0]).not.toContain('null');
  });
});
