import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { DetailHeader } from '~/src/components/detail/DetailHeader';
import { DetailHero } from '~/src/components/detail/DetailHero';
import { SERIES_STATUS_LABEL } from '~/src/components/detail/labels';
import { MetaCard } from '~/src/components/detail/MetaCard';
import { ProgressSummary } from '~/src/components/detail/ProgressSummary';
import { SummaryCard } from '~/src/components/detail/SummaryCard';
import { PagePrompt } from '~/src/components/ui/PagePrompt';
import { VolumeCell } from '~/src/components/ui/VolumeCell';
import { VolumeSheet } from '~/src/components/ui/VolumeSheet';
import { Series, Volume } from '~/src/db/models';
import { progressFraction, readCount } from '~/src/lib/progress';
import {
  LEGEND_STATES,
  SERIES_STATUS_HERO_COLOR,
  SlotState,
  STATUS_LABEL,
  STATUS_STYLE,
} from '~/src/lib/volumeStatus';
import { useLibrary } from '~/src/store/useLibrary';
import { theme } from '~/src/theme/theme';

const GRID_COLUMNS = 5;
const GRID_GAP = 9;

// Stable reference: a fresh [] in the selector would never compare equal.
const NO_VOLUMES: Volume[] = [];

/** Multi-tome detail layout: shared hero/meta/progress/summary plus the tome grid. */
export function SeriesDetail({ series }: { series: Series }) {
  const seriesId = series.id;
  const { width } = useWindowDimensions();

  const volumes = useLibrary((s) => s.volumesBySeriesId[seriesId] ?? NO_VOLUMES);
  const setVolumeState = useLibrary((s) => s.setVolumeState);
  const setVolumeCurrentPage = useLibrary((s) => s.setVolumeCurrentPage);
  const setSeriesTotal = useLibrary((s) => s.setSeriesTotal);
  const setSeriesPagesPerTome = useLibrary((s) => s.setSeriesPagesPerTome);
  const removeSeries = useLibrary((s) => s.removeSeries);
  const pendingPages = useLibrary((s) => s.pendingPages);
  const resolvePendingPages = useLibrary((s) => s.resolvePendingPages);

  const [sheetTome, setSheetTome] = useState<number | null>(null);
  const [pagesOpen, setPagesOpen] = useState(false);

  const onDelete = () => {
    Alert.alert('Supprimer la série ?', 'Cette action est irréversible.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => {
          removeSeries(seriesId).then(() => router.back());
        },
      },
    ]);
  };

  const highestExisting = volumes.reduce((m, v) => Math.max(m, v.number), 0);
  const total = series.totalVolumes ?? highestExisting;
  const read = readCount(volumes);
  const ownedCount = volumes.filter((v) => v.status !== 'wishlist').length;
  const missing = Math.max(0, total - ownedCount);
  const slots = Array.from({ length: total }, (_, i) => i + 1);
  const stateFor = (n: number): SlotState =>
    volumes.find((v) => v.number === n)?.status ?? 'missing';

  const cellWidth = (width - theme.screenPadX * 2 - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS;
  const cellHeight = cellWidth / 0.72;

  // Either half may be missing depending on what the scan turned up.
  const imprint = [series.publisher, series.publishedYear].filter(Boolean).join(' · ');

  const sheetVolume = sheetTome != null ? volumes.find((v) => v.number === sheetTome) : undefined;
  const sheetSubtitle =
    sheetTome == null
      ? undefined
      : sheetVolume
        ? `${STATUS_LABEL[sheetVolume.status]}${
            sheetVolume.currentPage ? ` · page ${sheetVolume.currentPage}` : ''
          }`
        : STATUS_LABEL.missing;

  return (
    <>
      <DetailHeader onBack={() => router.back()} onDelete={onDelete} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <DetailHero
          title={series.title}
          author={series.author}
          coverUrl={series.coverUrl}
          seed={series.id}
          statusLabel={SERIES_STATUS_LABEL[series.status]}
          statusColor={SERIES_STATUS_HERO_COLOR[series.status]}
          imprint={imprint || undefined}
        />

        <MetaCard series={series} />

        {series.description ? <SummaryCard description={series.description} /> : null}

        <ProgressSummary
          value={read}
          unit={`/ ${total || '?'} tomes lus`}
          fraction={progressFraction(read, total || null)}
          footer={
            <Text style={styles.hint}>
              {ownedCount} possédés · {missing} manquants
            </Text>
          }
        />

        <Pressable style={styles.perTomeCard} onPress={() => setPagesOpen(true)} hitSlop={4}>
          <Text style={styles.perTomeKey}>Pages par tome</Text>
          {series.pagesPerTome != null ? (
            <View style={styles.perTomeValueRow}>
              <Text style={styles.perTomeValue}>{series.pagesPerTome}</Text>
              <Ionicons name="pencil" size={13} color={theme.muted} />
            </View>
          ) : (
            <View style={styles.perTomeValueRow}>
              <Text style={styles.perTomeAdd}>Définir</Text>
              <Ionicons name="add" size={16} color={theme.accent} />
            </View>
          )}
        </Pressable>

        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Tomes</Text>
          <Text style={styles.sectionCap}>Touchez pour ajuster</Text>
        </View>
        <View style={styles.grid}>
          {slots.map((n) => (
            <VolumeCell
              key={n}
              number={n}
              state={stateFor(n)}
              width={cellWidth}
              onPress={() => setSheetTome(n)}
            />
          ))}
          <Pressable
            style={[styles.addTile, { width: cellWidth, height: cellHeight }]}
            onPress={() => setSeriesTotal(seriesId, total + 1)}
          >
            <Text style={styles.addTileText}>+</Text>
          </Pressable>
        </View>

        <View style={styles.legend}>
          {LEGEND_STATES.map((st) => (
            <View key={st} style={styles.legendItem}>
              <View
                style={[
                  styles.swatch,
                  {
                    backgroundColor: STATUS_STYLE[st].fill,
                    borderColor: STATUS_STYLE[st].border,
                    borderStyle: STATUS_STYLE[st].dashed ? 'dashed' : 'solid',
                    borderWidth: STATUS_STYLE[st].dashed ? 1.5 : 0,
                  },
                ]}
              />
              <Text style={styles.legendLabel}>{STATUS_LABEL[st]}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.note}>
          Touchez un tome pour choisir son statut. « + » ajoute le tome suivant.
        </Text>
      </ScrollView>

      <VolumeSheet
        visible={sheetTome != null}
        title={`Tome ${sheetTome}`}
        subtitle={sheetSubtitle}
        onClose={() => setSheetTome(null)}
        onSelect={(target) => {
          const n = sheetTome;
          setSheetTome(null);
          if (n == null) return;
          setVolumeState(seriesId, n, target);
          // Removing the trailing tome also drops its slot (undoing "+"), instead
          // of leaving an empty cell that can't be taken back.
          if (target === 'missing' && n === total && series.totalVolumes != null) {
            setSeriesTotal(seriesId, series.totalVolumes - 1);
          }
        }}
        onSetPage={(page) => {
          if (sheetTome != null) setVolumeCurrentPage(seriesId, sheetTome, page);
          setSheetTome(null);
        }}
      />

      <PagePrompt
        visible={pendingPages != null}
        title={`Tome ${pendingPages?.number ?? ''}`}
        onSubmit={(pages) => resolvePendingPages(pages)}
        onSkip={() => resolvePendingPages(null)}
      />

      <PagePrompt
        visible={pagesOpen}
        title="Pages par tome"
        onSubmit={(pages) => {
          setSeriesPagesPerTome(seriesId, pages);
          setPagesOpen(false);
        }}
        onSkip={() => setPagesOpen(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: theme.screenPadX, paddingBottom: theme.spacing.xl },
  hint: { fontFamily: theme.font.regular, fontSize: 13, color: theme.muted },
  perTomeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.surface,
    borderRadius: theme.radiusLg,
    borderWidth: 1,
    borderColor: theme.line,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 15,
    marginBottom: theme.spacing.md,
  },
  perTomeKey: { fontFamily: theme.font.semibold, fontSize: 13, color: theme.sub },
  perTomeValueRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  perTomeValue: { fontFamily: theme.font.bold, fontSize: 14, color: theme.ink },
  perTomeAdd: { fontFamily: theme.font.bold, fontSize: 13, color: theme.accent },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontFamily: theme.font.bold,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: theme.muted,
  },
  sectionCap: { fontFamily: theme.font.semibold, fontSize: 12, color: theme.sub },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP },
  addTile: {
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: theme.accent,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTileText: { fontFamily: theme.font.bold, fontSize: 20, color: theme.accent },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
    marginTop: theme.spacing.lg,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  swatch: { width: 12, height: 12, borderRadius: 3 },
  legendLabel: { fontFamily: theme.font.semibold, fontSize: 11, color: theme.muted },
  note: {
    fontFamily: theme.font.regular,
    fontSize: 12,
    color: theme.muted,
    textAlign: 'center',
    marginTop: theme.spacing.lg,
  },
});
