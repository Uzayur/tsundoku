import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Cover } from '~/src/components/ui/Cover';
import { ProgressBar } from '~/src/components/ui/ProgressBar';
import { VolumeCell } from '~/src/components/ui/VolumeCell';
import { SeriesStatus } from '~/src/db/models';
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

const GRID_COLUMNS = 5;
const GRID_GAP = 9;

export default function SeriesDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const seriesId = Number(id);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const series = useLibrary((s) => s.series.find((x) => x.id === seriesId));
  const volumes = useLibrary((s) => s.volumesBySeriesId[seriesId] ?? []);
  const cycleVolume = useLibrary((s) => s.cycleVolume);

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

  const cellWidth = (width - theme.spacing.lg * 2 - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <Cover title={series.title} seed={series.id} coverUrl={series.coverUrl} size="lg" />
          <View style={styles.heroBody}>
            <Text style={styles.heroTitle}>{series.title}</Text>
            <Text style={styles.heroSub}>{series.type}</Text>
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
              onPress={() => cycleVolume(seriesId, n)}
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

        <Text style={styles.note}>
          Touche un tome pour changer son statut (manquant → wishlist → possédé → lu).
        </Text>
      </ScrollView>
    </View>
  );
}

function Header({ onBack }: { onBack: () => void }) {
  return (
    <Pressable style={styles.backlink} onPress={onBack} hitSlop={12}>
      <Ionicons name="chevron-back" size={20} color={theme.muted} />
      <Text style={styles.backText}>Retour</Text>
    </Pressable>
  );
}

function Badge({ label, tone }: { label: string; tone: 'reading' | 'owned' }) {
  return (
    <View style={[styles.badge, tone === 'owned' ? styles.badgeOwned : styles.badgeReading]}>
      <Text
        style={[
          styles.badgeText,
          tone === 'owned' ? styles.badgeTextOwned : styles.badgeTextReading,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  backlink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  backText: { fontFamily: theme.font.semibold, fontSize: 13, color: theme.muted },
  scroll: { paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.xl },
  hero: { flexDirection: 'row', gap: theme.spacing.md, marginBottom: theme.spacing.md },
  heroBody: { flex: 1, justifyContent: 'center' },
  heroTitle: { fontFamily: theme.font.bold, fontSize: 22, color: theme.ink },
  heroSub: {
    fontFamily: theme.font.regular,
    fontSize: 13,
    color: theme.muted,
    marginTop: 4,
    textTransform: 'capitalize',
  },
  badges: { flexDirection: 'row', gap: theme.spacing.sm, marginTop: 10 },
  badge: { borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3 },
  badgeReading: { backgroundColor: 'rgba(245,81,57,0.14)' },
  badgeOwned: { backgroundColor: 'rgba(245,81,57,0.14)' },
  badgeText: { fontFamily: theme.font.bold, fontSize: 10 },
  badgeTextReading: { color: theme.accent },
  badgeTextOwned: { color: theme.accent },
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
  progressBig: { fontFamily: theme.font.bold, fontSize: 26, color: theme.ink, marginTop: 2 },
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
