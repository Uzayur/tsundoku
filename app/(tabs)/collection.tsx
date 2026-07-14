import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Pill } from '~/src/components/ui/Pill';
import { Screen } from '~/src/components/ui/Screen';
import { ScreenHeader } from '~/src/components/ui/ScreenHeader';
import { SectionTitle } from '~/src/components/ui/SectionTitle';
import { LibraryRow } from '~/src/components/ui/LibraryRow';
import { SeriesType } from '~/src/db/models';
import { progressFraction, readCount } from '~/src/lib/progress';
import { useLibrary } from '~/src/store/useLibrary';
import { theme } from '~/src/theme/theme';

type Filter = 'Tout' | 'Manga' | 'Romans' | 'BD';

const FILTERS: Filter[] = ['Tout', 'Manga', 'Romans', 'BD'];

const FILTER_TYPE: Record<Exclude<Filter, 'Tout'>, SeriesType> = {
  Manga: 'manga',
  Romans: 'novel',
  BD: 'bd',
};

export default function CollectionScreen() {
  const series = useLibrary((s) => s.series);
  const volumesBySeriesId = useLibrary((s) => s.volumesBySeriesId);

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('Tout');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return series.filter((s) => {
      const matchesQuery = q === '' || s.title.toLowerCase().includes(q);
      const matchesFilter = filter === 'Tout' || s.type === FILTER_TYPE[filter];
      return matchesQuery && matchesFilter;
    });
  }, [series, query, filter]);

  return (
    <Screen>
      <ScreenHeader title="Ma collection" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.searchbar}>
          <Ionicons name="search" size={18} color={theme.muted} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Rechercher une série, un titre…"
            placeholderTextColor={theme.muted}
          />
        </View>

        <View style={styles.pillRow}>
          {FILTERS.map((f) => (
            <Pill key={f} label={f} active={filter === f} onPress={() => setFilter(f)} />
          ))}
        </View>

        <SectionTitle>{`Séries · ${filtered.length}`}</SectionTitle>

        {filtered.length === 0 ? (
          <Text style={styles.empty}>Aucune série pour l’instant</Text>
        ) : (
          <View style={styles.list}>
            {filtered.map((s) => {
              const volumes = volumesBySeriesId[s.id] ?? [];
              const owned = volumes.filter((v) => v.status !== 'wishlist').length;
              const read = readCount(volumes);
              const fraction = progressFraction(read, s.totalVolumes);
              const pct = Math.round(fraction * 100);
              return (
                <LibraryRow
                  key={s.id}
                  seed={s.id}
                  coverUrl={s.coverUrl}
                  title={s.title}
                  subtitle={`${s.totalVolumes ?? '?'} tomes · ${owned} possédés`}
                  progress={{ fraction, left: `${read} lus`, right: `${pct}%` }}
                  onPress={() => router.push({ pathname: '/series/[id]', params: { id: s.id } })}
                />
              );
            })}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: theme.screenPadX,
    paddingBottom: theme.tabBarClearance,
  },
  searchbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.line,
    borderRadius: theme.radiusSm,
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  searchInput: {
    flex: 1,
    fontFamily: theme.font.medium,
    fontSize: 14,
    color: theme.ink,
    padding: 0,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  list: {
    gap: 11,
  },
  empty: {
    fontFamily: theme.font.regular,
    color: theme.muted,
    textAlign: 'center',
    marginTop: theme.spacing.xl,
  },
});
