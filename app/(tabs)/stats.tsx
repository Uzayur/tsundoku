import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '~/src/components/ui/Screen';
import { ScreenHeader } from '~/src/components/ui/ScreenHeader';
import { Volume } from '~/src/db/models';
import { aggregate, Period, totalBooksRead, totalPagesRead } from '~/src/lib/stats';
import { useLibrary } from '~/src/store/useLibrary';
import { theme } from '~/src/theme/theme';

const PERIODS: { key: Period; label: string }[] = [
  { key: 'month', label: 'Mois' },
  { key: 'quarter', label: 'Trim.' },
  { key: 'semester', label: 'Sem.' },
  { key: 'year', label: 'Année' },
];

export default function StatsScreen() {
  const volumesBySeriesId = useLibrary((s) => s.volumesBySeriesId);
  const [period, setPeriod] = useState<Period>('month');

  const allVolumes: Volume[] = useMemo(
    () => Object.values(volumesBySeriesId).flat(),
    [volumesBySeriesId],
  );
  const buckets = useMemo(() => aggregate(allVolumes, period), [allVolumes, period]);
  const maxBooks = Math.max(1, ...buckets.map((b) => b.books));
  const books = totalBooksRead(allVolumes);
  const pages = totalPagesRead(allVolumes);

  return (
    <Screen>
      <ScreenHeader title="Stats" subtitle="Votre lecture" />

      <View style={styles.totals}>
        <View style={styles.stat}>
          <Text style={styles.statNum}>{books}</Text>
          <Text style={styles.statLabel}>livres lus</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statNum}>{pages}</Text>
          <Text style={styles.statLabel}>pages lues</Text>
        </View>
      </View>

      <View style={styles.segment}>
        {PERIODS.map((p) => (
          <Pressable
            key={p.key}
            onPress={() => setPeriod(p.key)}
            style={[styles.segBtn, period === p.key && styles.segBtnActive]}
          >
            <Text style={[styles.segText, period === p.key && styles.segTextActive]}>
              {p.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={buckets}
        keyExtractor={(b) => b.key}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.barRow}>
            <Text style={styles.barKey}>{item.key}</Text>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${(item.books / maxBooks) * 100}%` }]} />
            </View>
            <Text style={styles.barVal}>{item.books}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Aucune lecture terminée</Text>}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  totals: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
  },
  stat: {
    flex: 1,
    backgroundColor: theme.surface,
    borderRadius: theme.radiusLg,
    borderWidth: 1,
    borderColor: theme.line,
    padding: theme.spacing.md,
  },
  statNum: { fontFamily: theme.font.bold, fontSize: 26, color: theme.ink },
  statLabel: { fontFamily: theme.font.regular, fontSize: 13, color: theme.muted, marginTop: 2 },
  segment: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
    backgroundColor: theme.greyLt,
    borderRadius: theme.radiusSm,
    padding: 3,
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.lg,
  },
  segBtn: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radiusSm - 3,
    alignItems: 'center',
  },
  segBtnActive: { backgroundColor: theme.surface },
  segText: { fontFamily: theme.font.medium, fontSize: 13, color: theme.muted },
  segTextActive: { color: theme.ink },
  list: { padding: theme.spacing.lg, gap: theme.spacing.md },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  barKey: { fontFamily: theme.font.medium, fontSize: 12, color: theme.muted, width: 64 },
  barTrack: {
    flex: 1,
    height: 14,
    borderRadius: 7,
    backgroundColor: theme.greyLt,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 7, backgroundColor: theme.accent },
  barVal: {
    fontFamily: theme.font.semibold,
    fontSize: 13,
    color: theme.ink,
    width: 24,
    textAlign: 'right',
  },
  empty: {
    fontFamily: theme.font.regular,
    color: theme.muted,
    textAlign: 'center',
    marginTop: theme.spacing.xl,
  },
});
