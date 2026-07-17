import { subjectsToGenres, translateGenre } from '~/src/lib/genres';

describe('translateGenre', () => {
  it('translates a known AniList genre', () => {
    expect(translateGenre('Slice of Life')).toBe('Tranche de vie');
  });

  it('translates a Google Books BISAC leaf', () => {
    expect(translateGenre('Action & Adventure')).toBe('Action et aventure');
  });

  it('matches case- and whitespace-insensitively', () => {
    expect(translateGenre('  FANTASY ')).toBe('Fantasy');
  });

  it('passes an unknown genre through unchanged', () => {
    expect(translateGenre('Isekai')).toBe('Isekai');
  });
});

describe('subjectsToGenres', () => {
  it('keeps only recognized subjects, dropping the noise', () => {
    // Real Open Library subjects for "L'Étranger".
    const subjects = ['Philosophical Novels', 'Murder', 'Fiction', 'French', 'Algeria, fiction'];
    expect(subjectsToGenres(subjects)).toEqual(['Roman philosophique']);
  });

  it('dedupes by final label across English and French forms', () => {
    expect(subjectsToGenres(['Witches', 'Sorcières', 'Vampires'])).toEqual([
      'Sorcières',
      'Vampires',
    ]);
  });

  it('caps the number of genres', () => {
    const many = ['Vampires', 'Witches', 'Classics', 'Fantasy fiction', 'Ghost stories'];
    expect(subjectsToGenres(many, 2)).toHaveLength(2);
  });

  it('returns an empty array when nothing is recognized', () => {
    expect(subjectsToGenres(['Murder', 'Algeria', 'Accessible book'])).toEqual([]);
    expect(subjectsToGenres([])).toEqual([]);
  });
});
