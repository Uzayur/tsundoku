import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { Pill } from '~/src/components/ui/Pill';
import { Screen } from '~/src/components/ui/Screen';
import { ScreenHeader } from '~/src/components/ui/ScreenHeader';
import { SectionTitle } from '~/src/components/ui/SectionTitle';
import { SegmentControl } from '~/src/components/ui/SegmentControl';
import { StatCard } from '~/src/components/ui/StatCard';
import { SeriesType, Volume } from '~/src/db/models';
import { readCount } from '~/src/lib/progress';
import {
  aggregate,
  booksInProgress,
  pagesPerBook,
  Period,
  topSeries,
  totalBooksRead,
  totalPagesRead,
  typeDistribution,
} from '~/src/lib/stats';
import { useLibrary } from '~/src/store/useLibrary';
import { theme } from '~/src/theme/theme';

const PERIOD_OPTIONS: { key: Period; label: string }[] = [
  { key: 'month', label: 'Mois' },
  { key: 'quarter', label: 'Trim.' },
  { key: 'semester', label: 'Sem.' },
  { key: 'year', label: 'Année' },
];

const TYPE_LABELS: Record<SeriesType, string> = {
  manga: 'Manga',
  novel: 'Romans',
  bd: 'BD',
  comic: 'Comics',
};

const MEDALS = ['🥇', '🥈', '🥉'];

function typeColor(type: SeriesType): string {
  if (type === 'manga') return theme.accent;
  if (type === 'novel') return theme.ink;
  return theme.muted;
}

export default function StatsScreen() {
  const series = useLibrary((s) => s.series);
  const volumesBySeriesId = useLibrary((s) => s.volumesBySeriesId);
  const [period, setPeriod] = useState<Period>('month');

  const allVolumes: Volume[] = useMemo(
    () => Object.values(volumesBySeriesId).flat(),
    [volumesBySeriesId],
  );

  const buckets = useMemo(() => aggregate(allVolumes, period), [allVolumes, period]);
  const maxBooks = Math.max(1, ...buckets.map((b) => b.books));

  const distribution = useMemo(() => typeDistribution(series), [series]);
  const totalSeries = distribution.reduce((sum, d) => sum + d.count, 0);
  const segments = useMemo(() => {
    let offset = 25;
    return distribution.map((d) => {
      const pct = totalSeries > 0 ? Math.round((d.count / totalSeries) * 100) : 0;
      const seg = { type: d.type, pct, dashoffset: offset, dasharray: `${pct} ${100 - pct}` };
      offset -= pct;
      return seg;
    });
  }, [distribution, totalSeries]);

  const tops = useMemo(() => {
    const input = series.map((s) => ({
      title: s.title,
      read: readCount(volumesBySeriesId[s.id] ?? []),
    }));
    return topSeries(input);
  }, [series, volumesBySeriesId]);

  return (
    <Screen>
      <ScreenHeader title="Statistiques" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SegmentControl options={PERIOD_OPTIONS} value={period} onChange={setPeriod} />

        <View style={styles.cardsRow}>
          <StatCard value={totalBooksRead(allVolumes)} label="Livres lus" />
          <StatCard value={booksInProgress(allVolumes)} label="En cours" />
        </View>
        <View style={styles.cardsRow}>
          <StatCard value={totalPagesRead(allVolumes)} label="Pages lues" />
          <StatCard value={pagesPerBook(allVolumes)} label="Pages / livre" />
        </View>
        <View style={styles.cardsRow}>
          <StatCard value={series.length} label="Séries suivies" />
          {/* Keeps the odd card at grid width instead of stretching it full-bleed. */}
          <View style={styles.cardSpacer} />
        </View>

        <SectionTitle>Livres lus par période</SectionTitle>
        <View style={styles.card}>
          {buckets.length === 0 ? (
            <Text style={styles.empty}>Aucune donnée</Text>
          ) : (
            <View style={styles.chart}>
              {buckets.map((bucket, index) => {
                const last = index === buckets.length - 1;
                const heightPct = (bucket.books / maxBooks) * 100;
                return (
                  <View key={bucket.key} style={styles.barCol}>
                    <Text style={styles.barValue}>{bucket.books}</Text>
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.bar,
                          { height: `${heightPct}%` },
                          last ? styles.barLast : styles.barDefault,
                        ]}
                      />
                    </View>
                    <Text style={styles.barLabel} numberOfLines={1}>
                      {bucket.key}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        <SectionTitle>Répartition par type</SectionTitle>
        <View style={styles.card}>
          {totalSeries === 0 ? (
            <Text style={styles.empty}>Aucune donnée</Text>
          ) : (
            <View style={styles.donutRow}>
              <Svg width={120} height={120} viewBox="0 0 42 42">
                <Circle
                  cx={21}
                  cy={21}
                  r={15.9155}
                  fill="none"
                  stroke={theme.greyLt}
                  strokeWidth={6}
                />
                {segments.map((seg) => (
                  <Circle
                    key={seg.type}
                    cx={21}
                    cy={21}
                    r={15.9155}
                    fill="none"
                    stroke={typeColor(seg.type)}
                    strokeWidth={6}
                    strokeDasharray={seg.dasharray}
                    strokeDashoffset={seg.dashoffset}
                  />
                ))}
              </Svg>
              <View style={styles.legend}>
                {segments.map((seg) => (
                  <View key={seg.type} style={styles.legendRow}>
                    <View style={[styles.legendSquare, { backgroundColor: typeColor(seg.type) }]} />
                    <Text style={styles.legendText}>
                      {`${TYPE_LABELS[seg.type]} — ${seg.pct}%`}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        {tops.length > 0 ? (
          <>
            <SectionTitle>Top séries</SectionTitle>
            <View style={styles.topRow}>
              {tops.map((t, index) => (
                <Pill key={t.title} label={`${MEDALS[index]} ${t.title} · ${t.read}`} />
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: theme.screenPadX,
    paddingBottom: theme.tabBarClearance,
  },
  cardSpacer: { flex: 1 },
  cardsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  card: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.line,
    borderRadius: theme.radiusLg,
    padding: theme.spacing.md,
  },
  empty: {
    fontFamily: theme.font.medium,
    fontSize: 13,
    color: theme.muted,
    textAlign: 'center',
    paddingVertical: theme.spacing.lg,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: theme.spacing.sm,
    height: 160,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  barValue: { fontFamily: theme.font.bold, fontSize: 11, color: theme.ink },
  barTrack: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: '72%',
    minHeight: 4,
    borderRadius: 6,
  },
  barDefault: { backgroundColor: theme.ink },
  barLast: { backgroundColor: theme.accent },
  barLabel: { fontFamily: theme.font.medium, fontSize: 10, color: theme.muted },
  donutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.lg,
  },
  legend: {
    flex: 1,
    gap: theme.spacing.sm,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  legendSquare: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  legendText: { fontFamily: theme.font.semibold, fontSize: 13, color: theme.ink },
  topRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
});
