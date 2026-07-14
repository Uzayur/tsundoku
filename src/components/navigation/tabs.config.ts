import { Ionicons } from '@expo/vector-icons';

export type TabConfig = {
  /** Must match the route file basename in app/(tabs)/ */
  name: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
};

export const TABS: TabConfig[] = [
  { name: 'index', title: 'Accueil', icon: 'home' },
  { name: 'collection', title: 'Collection', icon: 'library' },
  { name: 'wishlist', title: 'Envies', icon: 'heart' },
  { name: 'stats', title: 'Stats', icon: 'stats-chart' },
];
