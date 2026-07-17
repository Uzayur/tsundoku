import { normalizeTitle, parseVolumeTitle } from '~/src/lib/volumeTitle';

describe('normalizeTitle', () => {
  it('lowercases, strips accents and punctuation', () => {
    expect(normalizeTitle('ASAGIRI  Prêtresses, Aube !')).toBe('asagiri pretresses aube');
  });
});

describe('parseVolumeTitle', () => {
  it.each([
    ['ONE PIECE 1', 'ONE PIECE', 1],
    ['Naruto 01', 'Naruto', 1],
    ['Jujutsu Kaisen, Vol. 5', 'Jujutsu Kaisen', 5],
    ['ASAGIRI PRETRESSES AUBE T04', 'ASAGIRI PRETRESSES AUBE', 4],
    ['One Piece nº 02', 'One Piece', 2],
    ['Chainsaw Man, Vol. 1', 'Chainsaw Man', 1],
    ['Berserk tome 3', 'Berserk', 3],
  ])('parses %s', (input, baseTitle, number) => {
    expect(parseVolumeTitle(input)).toEqual({ baseTitle, number });
  });

  it('returns a null number when no volume marker is present', () => {
    expect(parseVolumeTitle('Le Nom du vent')).toEqual({
      baseTitle: 'Le Nom du vent',
      number: null,
    });
  });

  it('ignores a number that is part of the work title', () => {
    expect(parseVolumeTitle('20th Century Boys')).toEqual({
      baseTitle: '20th Century Boys',
      number: null,
    });
  });

  it('treats a bare number as a title, not a volume', () => {
    expect(parseVolumeTitle('1984')).toEqual({ baseTitle: '1984', number: null });
  });
});
