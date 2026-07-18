import { useEffect, useMemo, useRef, useState } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { Cover } from '~/src/components/ui/Cover';
import { HeroStat } from '~/src/components/ui/HeroStat';
import { Screen } from '~/src/components/ui/Screen';
import { ScreenHeader } from '~/src/components/ui/ScreenHeader';
import { SegmentControl } from '~/src/components/ui/SegmentControl';
import { SeriesType, Volume } from '~/src/db/models';
import { monthDay } from '~/src/lib/relativeDate';
import {
  aggregatePages,
  booksInProgress,
  pagesPerBook,
  Period,
  recentlyCompleted,
  totalBooksRead,
  totalPagesRead,
  typeDistribution,
} from '~/src/lib/stats';
import { useLibrary } from '~/src/store/useLibrary';
import { theme } from '~/src/theme/theme';

const PERIOD_OPTIONS: { key: Period; label: string }[] = [
  { key: '3m', label: '3 mois' },
  { key: '6m', label: '6 mois' },
  { key: 'year', label: 'Année' },
  { key: 'all', label: 'Tout' },
];

// Legend labels are plural (they count many series); list tags name a single
// work, so novels read "Roman" there.
const TYPE_LABELS: Record<SeriesType, string> = {
  manga: 'Manga',
  novel: 'Romans',
  bd: 'BD',
  comic: 'Comics',
};
const TYPE_TAGS: Record<SeriesType, string> = {
  manga: 'Manga',
  novel: 'Roman',
  bd: 'BD',
  comic: 'Comic',
};

const MONTHS_ABBR = [
  'Jan',
  'Fév',
  'Mar',
  'Avr',
  'Mai',
  'Juin',
  'Juil',
  'Aoû',
  'Sep',
  'Oct',
  'Nov',
  'Déc',
];

function typeColor(type: SeriesType): string {
  if (type === 'manga') return theme.accent;
  if (type === 'novel') return theme.ink;
  return theme.muted;
}

/** '2026-06' → 'Juin', '2026' → '2026'. */
function bucketLabel(key: string): string {
  if (key.length === 4) return key;
  return MONTHS_ABBR[Number(key.slice(5, 7)) - 1];
}

/**
 * Group thousands with a space (`8730` → `8 730`), the French convention.
 * Done by hand because Hermes' toLocaleString ignores the locale.
 */
function groupThousands(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function BookIcon({ color }: { color: string }) {
  return (
    <Svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <Path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </Svg>
  );
}

function PagesIcon({ color }: { color: string }) {
  return (
    <Svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <Path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </Svg>
  );
}

export default function StatsScreen() {
  const series = useLibrary((s) => s.series);
  const volumesBySeriesId = useLibrary((s) => s.volumesBySeriesId);
  const [period, setPeriod] = useState<Period>('6m');

  const allVolumes: Volume[] = useMemo(
    () => Object.values(volumesBySeriesId).flat(),
    [volumesBySeriesId],
  );

  // The chart is split into swipeable blocks (oldest page first, current last).
  const pages = useMemo(() => aggregatePages(allVolumes, period), [allVolumes, period]);
  // Scale bar heights over the whole history so they stay put while paging.
  const maxBooks = Math.max(1, ...pages.flat().map((b) => b.books));
  const chartTotal = pages.reduce((sum, page) => sum + page.reduce((s, b) => s + b.books, 0), 0);
  // Highlight the current block's newest bar (the last bucket of the last page).
  const currentKey = pages.at(-1)?.at(-1)?.key;

  const chartScroll = useRef<ScrollView>(null);
  const [pageWidth, setPageWidth] = useState(0);
  const [activePage, setActivePage] = useState(0);
  const windowBooks = (pages[activePage] ?? []).reduce((sum, b) => sum + b.books, 0);

  // Open on the most recent block, and snap back to it whenever the period (and
  // so the page layout) changes or the width is first measured.
  useEffect(() => {
    const last = pages.length - 1;
    setActivePage(last);
    if (pageWidth > 0) chartScroll.current?.scrollTo({ x: last * pageWidth, animated: false });
  }, [pages.length, pageWidth, period]);

  const onPageScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (pageWidth > 0) setActivePage(Math.round(e.nativeEvent.contentOffset.x / pageWidth));
  };

  const distribution = useMemo(() => typeDistribution(series), [series]);
  const totalSeries = distribution.reduce((sum, d) => sum + d.count, 0);
  const segments = useMemo(() => {
    let offset = 25;
    return distribution.map((d) => {
      const pct = totalSeries > 0 ? Math.round((d.count / totalSeries) * 100) : 0;
      // Full-length arcs that meet edge to edge, for one continuous ring rather
      // than slices split by grey gaps.
      const seg = {
        type: d.type,
        pct,
        count: d.count,
        dashoffset: offset,
        dasharray: `${pct} ${100 - pct}`,
      };
      offset -= pct;
      return seg;
    });
  }, [distribution, totalSeries]);

  const completed = useMemo(
    () => recentlyCompleted(series, volumesBySeriesId),
    [series, volumesBySeriesId],
  );

  return (
    <Screen>
      <ScreenHeader title="Statistiques" subtitle="Votre activité de lecture" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Depuis le début — all-time totals */}
        <Text style={styles.sectionTitle}>Depuis le début</Text>
        <View style={styles.heroRow}>
          <HeroStat
            variant="primary"
            value={totalBooksRead(allVolumes)}
            label="Livres lus"
            icon={<BookIcon color="#ffffff" />}
          />
          <HeroStat
            variant="secondary"
            value={groupThousands(totalPagesRead(allVolumes))}
            label="Pages lues"
            icon={<PagesIcon color={theme.accent} />}
          />
        </View>
        <View style={styles.miniCard}>
          <MiniStat value={booksInProgress(allVolumes)} label="En cours" first />
          <MiniStat value={pagesPerBook(allVolumes)} label="Pages / livre" />
          <MiniStat value={series.length} label="Séries suivies" />
        </View>

        {/* Chart */}
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Livres lus par période</Text>
          {windowBooks > 0 ? (
            <Text style={styles.sectionCap}>
              {windowBooks} livre{windowBooks > 1 ? 's' : ''}
            </Text>
          ) : null}
        </View>
        <View style={styles.segmentWrap}>
          <SegmentControl options={PERIOD_OPTIONS} value={period} onChange={setPeriod} size="sm" />
        </View>
        <View style={styles.card}>
          {chartTotal === 0 ? (
            <Text style={styles.empty}>Aucune donnée</Text>
          ) : (
            <ScrollView
              ref={chartScroll}
              horizontal
              pagingEnabled
              scrollEnabled={pages.length > 1}
              showsHorizontalScrollIndicator={false}
              onLayout={(e) => setPageWidth(e.nativeEvent.layout.width)}
              onMomentumScrollEnd={onPageScroll}
            >
              {pages.map((page, pageIndex) => (
                <View key={pageIndex} style={{ width: pageWidth }}>
                  <View style={styles.chart}>
                    {page.map((bucket) => {
                      const active = bucket.key === currentKey;
                      const heightPct = (bucket.books / maxBooks) * 100;
                      return (
                        <View key={bucket.key} style={styles.barCol}>
                          <Text style={[styles.barValue, active && styles.barValueActive]}>
                            {bucket.books}
                          </Text>
                          <View
                            style={[
                              styles.bar,
                              { height: `${Math.max(heightPct, 2)}%` },
                              active ? styles.barActive : styles.barDefault,
                            ]}
                          />
                        </View>
                      );
                    })}
                  </View>
                  <View style={styles.labels}>
                    {page.map((bucket) => {
                      const active = bucket.key === currentKey;
                      return (
                        <Text
                          key={bucket.key}
                          style={[styles.barLabel, active && styles.barLabelActive]}
                          numberOfLines={1}
                        >
                          {bucketLabel(bucket.key)}
                        </Text>
                      );
                    })}
                  </View>
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Donut */}
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Répartition par type</Text>
        </View>
        <View style={styles.card}>
          {totalSeries === 0 ? (
            <Text style={styles.empty}>Aucune donnée</Text>
          ) : (
            <View style={styles.donutRow}>
              <View style={styles.donut}>
                <Svg width={120} height={120} viewBox="0 0 42 42">
                  <Circle
                    cx={21}
                    cy={21}
                    r={15.9155}
                    fill="none"
                    stroke={theme.greyLt}
                    strokeWidth={4}
                  />
                  {segments.map((seg) => (
                    <Circle
                      key={seg.type}
                      cx={21}
                      cy={21}
                      r={15.9155}
                      fill="none"
                      stroke={typeColor(seg.type)}
                      strokeWidth={4}
                      strokeDasharray={seg.dasharray}
                      strokeDashoffset={seg.dashoffset}
                    />
                  ))}
                </Svg>
                <View style={styles.donutCenter}>
                  <Text style={styles.donutTotal}>{totalSeries}</Text>
                  <Text style={styles.donutCap}>séries</Text>
                </View>
              </View>
              <View style={styles.legend}>
                {segments.map((seg) => (
                  <View key={seg.type} style={styles.legendRow}>
                    <View style={[styles.legendSquare, { backgroundColor: typeColor(seg.type) }]} />
                    <Text style={styles.legendName}>{TYPE_LABELS[seg.type]}</Text>
                    <Text style={styles.legendVal}>{seg.count}</Text>
                    <Text style={styles.legendPct}>{seg.pct}%</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Terminées récemment */}
        {completed.length > 0 ? (
          <>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>Terminées récemment</Text>
            </View>
            <View style={styles.list}>
              {completed.map((row, index) => {
                const tally =
                  row.type === 'novel'
                    ? `${row.pages} pages`
                    : `${row.tomes} tome${row.tomes > 1 ? 's' : ''}`;
                return (
                  <View key={row.id} style={[styles.listRow, index > 0 && styles.listRowDivider]}>
                    <Cover title={row.title} seed={row.id} coverUrl={row.coverUrl} size="sm" />
                    <View style={styles.listBody}>
                      <Text style={styles.listTitle} numberOfLines={1}>
                        {row.title}
                      </Text>
                      <Text style={styles.listSub} numberOfLines={1}>
                        {tally} · terminé le {monthDay(row.completedAt)}
                      </Text>
                    </View>
                    <Text style={styles.listTag}>{TYPE_TAGS[row.type]}</Text>
                  </View>
                );
              })}
            </View>
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function MiniStat({
  value,
  label,
  first,
}: {
  value: string | number;
  label: string;
  first?: boolean;
}) {
  return (
    <View style={[styles.mini, !first && styles.miniDivider]}>
      <Text style={styles.miniValue}>{value}</Text>
      <Text style={styles.miniLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: theme.screenPadX,
    paddingBottom: theme.tabBarClearance,
  },
  sectionTitle: {
    fontFamily: theme.font.bold,
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: theme.muted,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: theme.spacing.lg,
    marginBottom: 12,
  },
  sectionCap: { fontFamily: theme.font.semibold, fontSize: 12, color: theme.sub },

  heroRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  miniCard: {
    flexDirection: 'row',
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.line,
    borderRadius: theme.radiusLg,
    marginTop: 12,
    paddingVertical: 14,
  },
  mini: { flex: 1, alignItems: 'center', paddingHorizontal: 6 },
  miniDivider: { borderLeftWidth: 1, borderLeftColor: theme.line },
  miniValue: {
    fontFamily: theme.font.extrabold,
    fontSize: 20,
    letterSpacing: -0.4,
    color: theme.ink,
  },
  miniLabel: { fontFamily: theme.font.medium, fontSize: 11.5, color: theme.sub, marginTop: 3 },

  segmentWrap: { marginBottom: 12 },
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
    height: 150,
    borderBottomWidth: 1,
    borderBottomColor: theme.line,
    // Headroom so the value label above the tallest bar never crosses the card's
    // top border; no bottom gap so the bars sit flush on the separator line.
    paddingTop: 22,
    paddingBottom: 0,
  },
  barCol: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
  },
  barValue: { fontFamily: theme.font.bold, fontSize: 11, color: theme.muted },
  barValueActive: { color: theme.accent },
  bar: {
    width: '66%',
    minHeight: 4,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    // Square base so the column seats cleanly on the separator line.
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  barDefault: { backgroundColor: '#d9dde0' },
  barActive: { backgroundColor: theme.accent },
  labels: { flexDirection: 'row', gap: theme.spacing.sm, marginTop: 8 },
  barLabel: {
    flex: 1,
    textAlign: 'center',
    fontFamily: theme.font.semibold,
    fontSize: 10.5,
    color: theme.muted,
  },
  barLabelActive: { color: theme.ink },

  donutRow: { flexDirection: 'row', alignItems: 'center', gap: 22 },
  donut: { width: 120, height: 120 },
  donutCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutTotal: {
    fontFamily: theme.font.extrabold,
    fontSize: 24,
    letterSpacing: -0.5,
    color: theme.ink,
  },
  donutCap: {
    fontFamily: theme.font.semibold,
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: theme.muted,
    marginTop: 2,
  },
  legend: { flex: 1, gap: 11 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  legendSquare: { width: 11, height: 11, borderRadius: 3 },
  legendName: { flex: 1, fontFamily: theme.font.semibold, fontSize: 13, color: theme.ink },
  legendVal: { fontFamily: theme.font.bold, fontSize: 13, color: theme.ink },
  legendPct: {
    fontFamily: theme.font.medium,
    fontSize: 12,
    color: theme.muted,
    width: 34,
    textAlign: 'right',
  },

  list: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.line,
    borderRadius: theme.radiusLg,
    overflow: 'hidden',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
  },
  listRowDivider: { borderTopWidth: 1, borderTopColor: theme.line },
  listBody: { flex: 1, minWidth: 0 },
  listTitle: { fontFamily: theme.font.semibold, fontSize: 14, color: theme.ink },
  listSub: { fontFamily: theme.font.medium, fontSize: 12, color: theme.muted, marginTop: 2 },
  listTag: {
    fontFamily: theme.font.semibold,
    fontSize: 11,
    color: theme.sub,
    backgroundColor: theme.greyLt,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
    overflow: 'hidden',
  },
});
