// Genres reach us in English from two sources: AniList (its fixed genre list)
// and Google Books (BISAC category leaves). Translation happens at display time
// rather than on write, so the stored value stays canonical and an improved
// table applies retroactively to rows already in the library.
const GENRE_FR: Record<string, string> = {
  // AniList genres
  action: 'Action',
  adventure: 'Aventure',
  comedy: 'Comédie',
  drama: 'Drame',
  ecchi: 'Ecchi',
  fantasy: 'Fantasy',
  horror: 'Horreur',
  'mahou shoujo': 'Magical girl',
  mecha: 'Mecha',
  music: 'Musique',
  mystery: 'Mystère',
  psychological: 'Psychologique',
  romance: 'Romance',
  'sci-fi': 'Science-fiction',
  'slice of life': 'Tranche de vie',
  sports: 'Sport',
  supernatural: 'Surnaturel',
  thriller: 'Thriller',
  hentai: 'Hentai',
  // Google Books BISAC leaves
  epic: 'Épique',
  'action & adventure': 'Action et aventure',
  manga: 'Manga',
  'comics & graphic novels': 'Bande dessinée',
  'science fiction': 'Science-fiction',
  'mystery & detective': 'Policier',
  thrillers: 'Thriller',
  suspense: 'Suspense',
  crime: 'Policier',
  'coming of age': 'Initiatique',
  historical: 'Historique',
  contemporary: 'Contemporain',
  literary: 'Littéraire',
  dystopian: 'Dystopie',
  superheroes: 'Super-héros',
  humorous: 'Humour',
  paranormal: 'Paranormal',
  'war & military': 'Guerre',
  'young adult': 'Young adult',
  'biography & autobiography': 'Biographie',
  cooking: 'Cuisine',
  poetry: 'Poésie',
  // Open Library `subjects` — the wordier, sometimes French forms novels arrive
  // as. Anything not listed here is dropped, so this doubles as the allow-list
  // that keeps genre badges out of the subject noise (place names, languages,
  // themes like "Murder").
  'philosophical novels': 'Roman philosophique',
  'classic literature': 'Classique',
  classics: 'Classique',
  'fantasy fiction': 'Fantasy',
  'detective and mystery stories': 'Policier',
  'love stories': 'Romance',
  'horror tales': 'Horreur',
  'ghost stories': 'Fantômes',
  vampires: 'Vampires',
  witches: 'Sorcières',
  sorcières: 'Sorcières',
  'adventure stories': 'Aventure',
  'historical fiction': 'Roman historique',
  'war stories': 'Guerre',
  'short stories': 'Nouvelles',
  'romans, nouvelles': 'Nouvelles',
  'fairy tales': 'Contes',
  'young adult fiction': 'Young adult',
  'juvenile fiction': 'Jeunesse',
  "children's fiction": 'Jeunesse',
  "children's stories": 'Jeunesse',
  dystopias: 'Dystopie',
  'suspense fiction': 'Suspense',
  'humorous stories': 'Humour',
  biography: 'Biographie',
  autobiography: 'Biographie',
};

/** French label for a genre, or the original string when nothing maps. */
export function translateGenre(genre: string): string {
  return GENRE_FR[genre.trim().toLowerCase()] ?? genre;
}

/**
 * Turn noisy Open Library `subjects` into a short list of French genre labels,
 * keeping only the ones GENRE_FR recognizes and deduping by final label. The cap
 * stops a book with dozens of subjects from spilling a wall of badges.
 */
export function subjectsToGenres(subjects: string[], limit = 4): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const subject of subjects) {
    const fr = GENRE_FR[subject.trim().toLowerCase()];
    if (!fr || seen.has(fr)) continue;
    seen.add(fr);
    out.push(fr);
    if (out.length >= limit) break;
  }
  return out;
}
