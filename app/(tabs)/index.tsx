import { FlatList, StyleSheet, Text } from 'react-native';

import { Screen } from '~/src/components/ui/Screen';
import { ScreenHeader } from '~/src/components/ui/ScreenHeader';
import { SeriesCard } from '~/src/components/ui/SeriesCard';
import { readCount } from '~/src/lib/progress';
import { useLibrary } from '~/src/store/useLibrary';
import { theme } from '~/src/theme/theme';

export default function AccueilScreen() {
  const series = useLibrary((s) => s.series);
  const volumesBySeriesId = useLibrary((s) => s.volumesBySeriesId);

  const inProgress = series.filter((item) => {
    const rc = readCount(volumesBySeriesId[item.id] ?? []);
    return item.totalVolumes == null || rc < item.totalVolumes;
  });

  return (
    <Screen>
      <FlatList
        data={inProgress}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={<ScreenHeader title="Accueil" subtitle="Lectures en cours" />}
        renderItem={({ item }) => (
          <SeriesCard series={item} readCount={readCount(volumesBySeriesId[item.id] ?? [])} />
        )}
        contentContainerStyle={styles.content}
        ListEmptyComponent={<Text style={styles.empty}>Aucune lecture en cours</Text>}
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
