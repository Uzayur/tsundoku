import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { VolumeCell } from '~/src/components/ui/VolumeCell';
import { SlotState } from '~/src/lib/volumeStatus';
import { useLibrary } from '~/src/store/useLibrary';
import { theme } from '~/src/theme/theme';

export default function SeriesDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const seriesId = Number(id);
  const insets = useSafeAreaInsets();

  const series = useLibrary((s) => s.series.find((x) => x.id === seriesId));
  const volumes = useLibrary((s) => s.volumesBySeriesId[seriesId] ?? []);
  const cycleVolume = useLibrary((s) => s.cycleVolume);

  const highestExisting = volumes.reduce((m, v) => Math.max(m, v.number), 0);
  const total = series?.totalVolumes ?? highestExisting;
  const slots = Array.from({ length: total }, (_, i) => i + 1);
  const stateFor = (n: number): SlotState =>
    volumes.find((v) => v.number === n)?.status ?? 'missing';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={theme.ink} />
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>
          {series?.title ?? 'Série'}
        </Text>
      </View>
      {series ? (
        <ScrollView contentContainerStyle={styles.grid}>
          {slots.map((n) => (
            <VolumeCell
              key={n}
              number={n}
              state={stateFor(n)}
              onPress={() => cycleVolume(seriesId, n)}
            />
          ))}
        </ScrollView>
      ) : (
        <Text style={styles.missing}>Série introuvable</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  title: { flex: 1, fontFamily: theme.font.bold, fontSize: 22, color: theme.ink },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  missing: {
    fontFamily: theme.font.regular,
    color: theme.muted,
    textAlign: 'center',
    marginTop: theme.spacing.xl,
  },
});
