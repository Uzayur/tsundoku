import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BookDetail } from '~/src/components/detail/BookDetail';
import { DetailHeader } from '~/src/components/detail/DetailHeader';
import { SeriesDetail } from '~/src/components/detail/SeriesDetail';
import { useLibrary } from '~/src/store/useLibrary';
import { theme } from '~/src/theme/theme';

export default function SeriesDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const seriesId = Number(id);
  const insets = useSafeAreaInsets();

  const series = useLibrary((s) => s.series.find((x) => x.id === seriesId));
  const volumes = useLibrary((s) => s.volumesBySeriesId[seriesId]);

  if (!series) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <DetailHeader onBack={() => router.back()} />
        <Text style={styles.missing}>Série introuvable</Text>
      </View>
    );
  }

  // Single books (romans, one-shots) track pages, not a tome grid. A roman
  // counts even when AniList never knew its volume total (total 0 on a fresh
  // import), so it still gets the page-based layout.
  const highestExisting = (volumes ?? []).reduce((m, v) => Math.max(m, v.number), 0);
  const total = series.totalVolumes ?? highestExisting;
  const singleVolume = series.type === 'novel' ? total <= 1 : total === 1;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {singleVolume ? <BookDetail series={series} /> : <SeriesDetail series={series} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  missing: {
    fontFamily: theme.font.regular,
    color: theme.muted,
    textAlign: 'center',
    marginTop: theme.spacing.xl,
  },
});
