import { FlatList, StyleSheet, Text } from 'react-native';

import { Screen } from '~/src/components/ui/Screen';
import { ScreenHeader } from '~/src/components/ui/ScreenHeader';
import { SeriesCard } from '~/src/components/ui/SeriesCard';
import { readCount } from '~/src/lib/progress';
import { useLibrary } from '~/src/store/useLibrary';
import { theme } from '~/src/theme/theme';

export default function CollectionScreen() {
  const series = useLibrary((s) => s.series);
  const volumesBySeriesId = useLibrary((s) => s.volumesBySeriesId);

  return (
    <Screen>
      <FlatList
        data={series}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={
          <ScreenHeader title="Collection" subtitle={`${series.length} séries`} />
        }
        renderItem={({ item }) => (
          <SeriesCard series={item} readCount={readCount(volumesBySeriesId[item.id] ?? [])} />
        )}
        contentContainerStyle={styles.content}
        ListEmptyComponent={<Text style={styles.empty}>Aucune série pour l’instant</Text>}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  empty: {
    fontFamily: theme.font.regular,
    color: theme.muted,
    textAlign: 'center',
    marginTop: theme.spacing.xl,
  },
});
