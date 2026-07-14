import { NewSeries, SeriesType } from '~/src/db/models';

export interface AniListMedia {
  id: number;
  format: string | null;
  volumes: number | null;
  chapters: number | null;
  status: string | null;
  genres: string[];
  title: { romaji: string | null; english: string | null };
  coverImage: { large: string | null };
  description: string | null;
}

export interface SeriesSearchResult {
  anilistId: number;
  series: NewSeries;
  description: string | null;
}

export type FetchLike = (
  url: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string },
) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

const ANILIST_URL = 'https://graphql.anilist.co';

const SEARCH_QUERY =
  'query ($search: String) { Page(page: 1, perPage: 10) { media(search: $search, type: MANGA) { id format volumes chapters status genres title { romaji english } coverImage { large } description(asHtml: false) } } }';

function mapType(format: string | null): SeriesType {
  switch (format) {
    case 'MANGA':
    case 'MANHWA':
    case 'MANHUA':
      return 'manga';
    case 'NOVEL':
    case 'LIGHT_NOVEL':
      return 'novel';
    default:
      return 'manga';
  }
}

export function normalizeMedia(media: AniListMedia): SeriesSearchResult {
  const series: NewSeries = {
    title: media.title.english ?? media.title.romaji ?? '(sans titre)',
    type: mapType(media.format),
    totalVolumes: media.volumes ?? null,
    externalIds: { anilist: media.id },
    coverUrl: media.coverImage?.large ?? null,
    genres: media.genres ?? [],
    status: 'reading',
  };
  return {
    anilistId: media.id,
    series,
    description: media.description ?? null,
  };
}

const defaultFetch: FetchLike = (url, init) =>
  (globalThis as unknown as { fetch: FetchLike }).fetch(url, init);

export async function fetchSeries(
  query: string,
  fetchFn: FetchLike = defaultFetch,
): Promise<SeriesSearchResult[]> {
  const res = await fetchFn(ANILIST_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ query: SEARCH_QUERY, variables: { search: query } }),
  });

  if (!res.ok) {
    throw new Error(`AniList request failed: ${res.status}`);
  }

  const json = (await res.json()) as {
    data?: { Page?: { media?: AniListMedia[] } };
  };
  const media = json.data?.Page?.media ?? [];
  return media.map(normalizeMedia);
}
