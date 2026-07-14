import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Badge } from '~/src/components/ui/Badge';
import { Cover } from '~/src/components/ui/Cover';
import { OptionsSheet } from '~/src/components/ui/OptionsSheet';
import { ProgressBar } from '~/src/components/ui/ProgressBar';
import { VolumeCell } from '~/src/components/ui/VolumeCell';
import { VolumeSheet } from '~/src/components/ui/VolumeSheet';
import { SeriesStatus, SeriesType } from '~/src/db/models';
import { progressFraction, readCount } from '~/src/lib/progress';
import { LEGEND_STATES, SlotState, STATUS_LABEL, STATUS_STYLE } from '~/src/lib/volumeStatus';
import { useLibrary } from '~/src/store/useLibrary';
import { theme } from '~/src/theme/theme';

const SERIES_STATUS_LABEL: Record<SeriesStatus, string> = {
  reading: 'En cours',
  completed: 'Terminé',
  planned: 'Prévu',
  paused: 'En pause',
  dropped: 'Abandonné',
};

const TYPE_LABEL: Record<SeriesType, string> = {
  manga: 'Manga',
  novel: 'Roman',
  bd: 'BD',
  comic: 'Comics',
};
const TYPES: SeriesType[] = ['manga', 'novel', 'bd', 'comic'];

const GRID_COLUMNS = 5;
const GRID_GAP = 9;

export default function SeriesDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const seriesId = Number(id);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const series = useLibrary((s) => s.series.find((x) => x.id === seriesId));
  const volumes = useLibrary((s) => s.volumesBySeriesId[seriesId] ?? []);
  const setVolumeState = useLibrary((s) => s.setVolumeState);
  const setVolumeCurrentPage = useLibrary((s) => s.setVolumeCurrentPage);
  const updateSeriesType = useLibrary((s) => s.updateSeriesType);
  const removeSeries = useLibrary((s) => s.removeSeries);

  const [sheetTome, setSheetTome] = useState<number | null>(null);
  const [typeOpen, setTypeOpen] = useState(false);

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

  if (!series) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Header onBack={() => router.back()} />
        <Text style={styles.missing}>Série introuvable</Text>
      </View>
    );
  }

  const highestExisting = volumes.reduce((m, v) => Math.max(m, v.number), 0);
  const total = series.totalVolumes ?? highestExisting;
  const read = readCount(volumes);
  const ownedCount = volumes.filter((v) => v.status !== 'wishlist').length;
  const slots = Array.from({ length: total }, (_, i) => i + 1);
  const stateFor = (n: number): SlotState =>
    volumes.find((v) => v.number === n)?.status ?? 'missing';

  const cellWidth = (width - theme.screenPadX * 2 - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS;

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
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header onBack={() => router.back()} onDelete={onDelete} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <Cover title={series.title} seed={series.id} coverUrl={series.coverUrl} size="lg" />
          <View style={styles.heroBody}>
            <Text style={styles.heroTitle}>{series.title}</Text>
            {series.author ? <Text style={styles.heroAuthor}>{series.author}</Text> : null}
            <Pressable style={styles.typeRow} onPress={() => setTypeOpen(true)} hitSlop={8}>
              <Text style={styles.heroType}>{TYPE_LABEL[series.type]}</Text>
              <Ionicons name="chevron-down" size={14} color={theme.muted} />
            </Pressable>
            <View style={styles.badges}>
              <Badge label={SERIES_STATUS_LABEL[series.status]} tone="reading" />
              <Badge label={`${ownedCount} possédés`} tone="owned" />
            </View>
          </View>
        </View>

        <View style={styles.progressCard}>
          <View>
            <Text style={styles.progressLabel}>Progression de lecture</Text>
            <Text style={styles.progressBig}>
              {read} / {total || '?'}
            </Text>
          </View>
          <View style={styles.progressRight}>
            <ProgressBar fraction={progressFraction(read, total || null)} />
            <Text style={styles.progressPct}>
              {Math.round(progressFraction(read, total || null) * 100)}%
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Tomes</Text>
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

        <Text style={styles.note}>Touche un tome pour choisir son statut.</Text>
      </ScrollView>

      <VolumeSheet
        visible={sheetTome != null}
        number={sheetTome ?? 0}
        subtitle={sheetSubtitle}
        onClose={() => setSheetTome(null)}
        onSelect={(target, applyToPrevious) => {
          if (sheetTome != null) setVolumeState(seriesId, sheetTome, target, applyToPrevious);
          setSheetTome(null);
        }}
        onSetPage={(page) => {
          if (sheetTome != null) setVolumeCurrentPage(seriesId, sheetTome, page);
          setSheetTome(null);
        }}
      />

      <OptionsSheet
        visible={typeOpen}
        title="Type de série"
        onClose={() => setTypeOpen(false)}
        options={TYPES.map((t) => ({
          label: TYPE_LABEL[t],
          onPress: () => updateSeriesType(seriesId, t),
        }))}
      />
    </View>
  );
}

function Header({ onBack, onDelete }: { onBack: () => void; onDelete?: () => void }) {
  return (
    <View style={styles.header}>
      <Pressable style={styles.backlink} onPress={onBack} hitSlop={12}>
        <Ionicons name="chevron-back" size={20} color={theme.muted} />
        <Text style={styles.backText}>Retour</Text>
      </Pressable>
      {onDelete ? (
        <Pressable onPress={onDelete} hitSlop={12}>
          <Ionicons name="trash-outline" size={20} color={theme.muted} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.screenPadX,
    paddingVertical: theme.spacing.md,
  },
  backlink: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backText: { fontFamily: theme.font.semibold, fontSize: 13, color: theme.muted },
  scroll: { paddingHorizontal: theme.screenPadX, paddingBottom: theme.spacing.xl },
  hero: { flexDirection: 'row', gap: theme.spacing.md, marginBottom: theme.spacing.md },
  heroBody: { flex: 1, justifyContent: 'center' },
  heroTitle: { fontFamily: theme.font.bold, fontSize: 22, color: theme.ink },
  heroAuthor: { fontFamily: theme.font.medium, fontSize: 13, color: theme.sub, marginTop: 4 },
  typeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  heroType: { fontFamily: theme.font.medium, fontSize: 13, color: theme.muted },
  badges: { flexDirection: 'row', gap: theme.spacing.sm, marginTop: 10 },
  progressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.surface,
    borderRadius: theme.radiusLg,
    borderWidth: 1,
    borderColor: theme.line,
    padding: theme.spacing.md,
    marginTop: theme.spacing.xs,
  },
  progressLabel: { fontFamily: theme.font.regular, fontSize: 12, color: theme.muted },
  progressBig: { fontFamily: theme.font.extrabold, fontSize: 26, color: theme.ink, marginTop: 2 },
  progressRight: { width: 80, gap: 6 },
  progressPct: {
    fontFamily: theme.font.bold,
    fontSize: 12,
    color: theme.accent,
    textAlign: 'right',
  },
  sectionTitle: {
    fontFamily: theme.font.bold,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: theme.muted,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP },
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
  missing: {
    fontFamily: theme.font.regular,
    color: theme.muted,
    textAlign: 'center',
    marginTop: theme.spacing.xl,
  },
});
