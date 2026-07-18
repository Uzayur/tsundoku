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
import { PagePrompt } from '~/src/components/ui/PagePrompt';
import { ProgressBar } from '~/src/components/ui/ProgressBar';
import { VolumeCell } from '~/src/components/ui/VolumeCell';
import { VolumeSheet } from '~/src/components/ui/VolumeSheet';
import { SeriesStatus, SeriesType, Volume } from '~/src/db/models';
import { translateGenre } from '~/src/lib/genres';
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

// Stable reference: a fresh [] in the selector would never compare equal.
const NO_VOLUMES: Volume[] = [];

export default function SeriesDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const seriesId = Number(id);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const series = useLibrary((s) => s.series.find((x) => x.id === seriesId));
  const volumes = useLibrary((s) => s.volumesBySeriesId[seriesId] ?? NO_VOLUMES);
  const setVolumeState = useLibrary((s) => s.setVolumeState);
  const setVolumeCurrentPage = useLibrary((s) => s.setVolumeCurrentPage);
  const setVolumePages = useLibrary((s) => s.setVolumePages);
  const updateSeriesType = useLibrary((s) => s.updateSeriesType);
  const removeSeries = useLibrary((s) => s.removeSeries);
  const pendingPages = useLibrary((s) => s.pendingPages);
  const resolvePendingPages = useLibrary((s) => s.resolvePendingPages);

  const [sheetTome, setSheetTome] = useState<number | null>(null);
  const [typeOpen, setTypeOpen] = useState(false);
  const [synopsisOpen, setSynopsisOpen] = useState(false);
  const [editingPages, setEditingPages] = useState(false);

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

  // Either half may be missing depending on what the scan turned up.
  const imprint = [series.publisher, series.publishedYear].filter(Boolean).join(' · ');

  // Single books (romans, one-shots) track pages, not a tome grid. A roman
  // counts even when AniList never knew its volume total (total 0 on a fresh
  // import), so it still gets the page card and the editable page count.
  const isNovel = series.type === 'novel';
  const singleVolume = isNovel ? total <= 1 : total === 1;
  const vol1 = volumes.find((v) => v.number === 1);
  const pageTotal = vol1?.pageCount ?? null;
  const currentPage = vol1?.status === 'read' && pageTotal ? pageTotal : (vol1?.currentPage ?? 0);
  const pageFraction = pageTotal
    ? Math.min(1, currentPage / pageTotal)
    : vol1?.status === 'read'
      ? 1
      : 0;

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
            {imprint ? <Text style={styles.heroImprint}>{imprint}</Text> : null}
            <View style={styles.badges}>
              {isNovel ? (
                series.status === 'reading' ? (
                  <Badge label={SERIES_STATUS_LABEL.reading} tone="reading" />
                ) : null
              ) : (
                <>
                  <Badge label={SERIES_STATUS_LABEL[series.status]} tone="reading" />
                  <Badge label={`${ownedCount} possédés`} tone="owned" />
                </>
              )}
            </View>
          </View>
        </View>

        {series.genres.length > 0 ? (
          <View style={styles.genres}>
            {series.genres.map((genre) => (
              <Badge key={genre} label={translateGenre(genre)} tone="neutral" />
            ))}
          </View>
        ) : null}

        {series.description ? (
          <Pressable
            style={styles.synopsis}
            onPress={() => setSynopsisOpen((open) => !open)}
            hitSlop={4}
          >
            <Text style={styles.synopsisLabel}>Résumé</Text>
            <Text style={styles.synopsisText} numberOfLines={synopsisOpen ? undefined : 4}>
              {series.description}
            </Text>
            <Text style={styles.synopsisMore}>{synopsisOpen ? 'Réduire' : 'Lire la suite'}</Text>
          </Pressable>
        ) : null}

        {singleVolume ? (
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Informations</Text>
            <Pressable style={styles.infoRow} onPress={() => setEditingPages(true)} hitSlop={6}>
              <Text style={styles.infoKey}>Pages</Text>
              {pageTotal ? (
                <View style={styles.infoValueRow}>
                  <Text style={styles.infoValue}>{pageTotal}</Text>
                  <Ionicons name="pencil" size={13} color={theme.muted} />
                </View>
              ) : (
                <View style={styles.infoValueRow}>
                  <Text style={styles.infoAdd}>Ajouter</Text>
                  <Ionicons name="add" size={16} color={theme.accent} />
                </View>
              )}
            </Pressable>
          </View>
        ) : null}

        {singleVolume ? (
          <>
            <Pressable style={styles.progressCard} onPress={() => setSheetTome(1)}>
              <View>
                <Text style={styles.progressLabel}>Progression</Text>
                <Text style={styles.progressBig}>
                  {pageTotal
                    ? `${currentPage} / ${pageTotal}`
                    : currentPage
                      ? `page ${currentPage}`
                      : STATUS_LABEL[vol1?.status ?? 'missing']}
                </Text>
              </View>
              <View style={styles.progressRight}>
                <ProgressBar fraction={pageFraction} />
                <Text style={styles.progressPct}>{Math.round(pageFraction * 100)}%</Text>
              </View>
            </Pressable>
            <Text style={styles.note}>Touchez pour mettre à jour votre progression.</Text>
          </>
        ) : (
          <>
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
          </>
        )}
      </ScrollView>

      <VolumeSheet
        visible={sheetTome != null}
        title={singleVolume ? 'Ce livre' : `Tome ${sheetTome}`}
        subtitle={sheetSubtitle}
        onClose={() => setSheetTome(null)}
        onSelect={(target) => {
          if (sheetTome != null) setVolumeState(seriesId, sheetTome, target);
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

      <PagePrompt
        visible={pendingPages != null}
        title={`Tome ${pendingPages?.number ?? ''}`}
        onSubmit={(pages) => resolvePendingPages(pages)}
        onSkip={() => resolvePendingPages(null)}
      />

      <PagePrompt
        visible={editingPages}
        title={series.title}
        onSubmit={(pages) => {
          setVolumePages(seriesId, 1, pages);
          setEditingPages(false);
        }}
        onSkip={() => setEditingPages(false)}
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
  heroImprint: { fontFamily: theme.font.regular, fontSize: 12, color: theme.sub, marginTop: 4 },
  badges: { flexDirection: 'row', gap: theme.spacing.sm, marginTop: 10 },
  genres: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  synopsis: {
    backgroundColor: theme.surface,
    borderRadius: theme.radiusLg,
    borderWidth: 1,
    borderColor: theme.line,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  synopsisLabel: {
    fontFamily: theme.font.bold,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: theme.muted,
    marginBottom: theme.spacing.sm,
  },
  synopsisText: { fontFamily: theme.font.regular, fontSize: 13, lineHeight: 20, color: theme.ink },
  infoCard: {
    backgroundColor: theme.surface,
    borderRadius: theme.radiusLg,
    borderWidth: 1,
    borderColor: theme.line,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  infoLabel: {
    fontFamily: theme.font.bold,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: theme.muted,
    marginBottom: theme.spacing.sm,
  },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoKey: { fontFamily: theme.font.regular, fontSize: 13, color: theme.sub },
  infoValueRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoValue: { fontFamily: theme.font.bold, fontSize: 13, color: theme.ink },
  infoAdd: { fontFamily: theme.font.bold, fontSize: 13, color: theme.accent },
  synopsisMore: {
    fontFamily: theme.font.bold,
    fontSize: 12,
    color: theme.accent,
    marginTop: theme.spacing.sm,
  },
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
