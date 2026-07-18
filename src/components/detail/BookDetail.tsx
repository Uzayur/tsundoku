import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { DetailHeader } from '~/src/components/detail/DetailHeader';
import { TYPE_LABEL, TYPES } from '~/src/components/detail/labels';
import { Badge } from '~/src/components/ui/Badge';
import { Cover } from '~/src/components/ui/Cover';
import { GenrePicker } from '~/src/components/ui/GenrePicker';
import { OptionsSheet } from '~/src/components/ui/OptionsSheet';
import { PagePrompt } from '~/src/components/ui/PagePrompt';
import { ProgressBar } from '~/src/components/ui/ProgressBar';
import { VolumeSheet } from '~/src/components/ui/VolumeSheet';
import { Series, Volume } from '~/src/db/models';
import { translateGenre } from '~/src/lib/genres';
import { shortDate } from '~/src/lib/relativeDate';
import { STATUS_HERO_COLOR, STATUS_LABEL } from '~/src/lib/volumeStatus';
import { useLibrary } from '~/src/store/useLibrary';
import { theme } from '~/src/theme/theme';

// Stable reference: a fresh [] in the selector would never compare equal.
const NO_VOLUMES: Volume[] = [];

/**
 * Single-book detail layout (romans and one-shots): the whole work is tracked as
 * one volume, so progress is measured in pages rather than a tome grid.
 */
export function BookDetail({ series }: { series: Series }) {
  const seriesId = series.id;

  const volumes = useLibrary((s) => s.volumesBySeriesId[seriesId] ?? NO_VOLUMES);
  const setVolumeState = useLibrary((s) => s.setVolumeState);
  const setVolumeCurrentPage = useLibrary((s) => s.setVolumeCurrentPage);
  const setVolumePages = useLibrary((s) => s.setVolumePages);
  const updateSeriesType = useLibrary((s) => s.updateSeriesType);
  const setSeriesGenres = useLibrary((s) => s.setSeriesGenres);
  const removeSeries = useLibrary((s) => s.removeSeries);
  const pendingPages = useLibrary((s) => s.pendingPages);
  const resolvePendingPages = useLibrary((s) => s.resolvePendingPages);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [typeOpen, setTypeOpen] = useState(false);
  const [genresOpen, setGenresOpen] = useState(false);
  const [synopsisOpen, setSynopsisOpen] = useState(false);
  const [editingPages, setEditingPages] = useState(false);

  // Category picker: the native iOS action sheet where it exists, falling back to
  // the in-app OptionsSheet on Android (which has no equivalent).
  const openCategory = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: 'Catégorie',
          options: [...TYPES.map((t) => TYPE_LABEL[t]), 'Annuler'],
          cancelButtonIndex: TYPES.length,
        },
        (i) => {
          if (i != null && i < TYPES.length) updateSeriesType(seriesId, TYPES[i]);
        },
      );
    } else {
      setTypeOpen(true);
    }
  };

  const onDelete = () => {
    Alert.alert('Supprimer ce livre ?', 'Cette action est irréversible.', [
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

  const vol1 = volumes.find((v) => v.number === 1);
  const pageTotal = vol1?.pageCount ?? null;
  const currentPage = vol1?.status === 'read' && pageTotal ? pageTotal : (vol1?.currentPage ?? 0);
  const pageFraction = pageTotal
    ? Math.min(1, currentPage / pageTotal)
    : vol1?.status === 'read'
      ? 1
      : 0;

  const sheetSubtitle = vol1
    ? `${STATUS_LABEL[vol1.status]}${vol1.currentPage ? ` · page ${vol1.currentPage}` : ''}`
    : STATUS_LABEL.missing;

  // Hero status reflects the book's own reading state (not the series status):
  // wishlist / owned / reading, or "Lu le DD/MM/YYYY" once finished. Hidden until
  // the book has a volume row (an imported roman starts without one).
  const statusText =
    vol1?.status === 'read' && vol1.finishedAt
      ? `Lu le ${shortDate(vol1.finishedAt)}`
      : vol1
        ? STATUS_LABEL[vol1.status]
        : null;
  const statusColor = vol1 ? STATUS_HERO_COLOR[vol1.status] : theme.accent;

  // Genres are stored canonically (English keys from imports); the picker works
  // in French labels. Selecting adds the French label as-is; deselecting drops
  // every stored genre that renders to that label.
  const selectedGenres = series.genres.map(translateGenre);
  const toggleGenre = (label: string) => {
    const next = selectedGenres.includes(label)
      ? series.genres.filter((g) => translateGenre(g) !== label)
      : [...series.genres, label];
    setSeriesGenres(seriesId, next);
  };

  return (
    <>
      <DetailHeader onBack={() => router.back()} onDelete={onDelete} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <Cover title={series.title} seed={series.id} coverUrl={series.coverUrl} size="lg" />
          <View style={styles.heroBody}>
            {statusText ? (
              <View style={styles.statusRow}>
                <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                <Text style={[styles.statusText, { color: statusColor }]}>{statusText}</Text>
              </View>
            ) : null}
            <Text style={styles.heroTitle}>{series.title}</Text>
            {series.author ? <Text style={styles.heroAuthor}>{series.author}</Text> : null}
          </View>
        </View>

        <View style={styles.metaCard}>
          <Pressable style={styles.metaRow} onPress={openCategory} hitSlop={6}>
            <Text style={styles.metaKey}>Catégorie</Text>
            <View style={styles.metaValueRow}>
              <Text style={styles.metaValue}>{TYPE_LABEL[series.type]}</Text>
              <Ionicons name="chevron-down" size={14} color={theme.muted} />
            </View>
          </Pressable>
          <View style={[styles.metaRow, styles.metaRowGenres]}>
            <Text style={[styles.metaKey, styles.metaKeyTop]}>Genres</Text>
            <View style={styles.genres}>
              {series.genres.map((genre) => (
                <Badge key={genre} label={translateGenre(genre)} tone="neutral" />
              ))}
              <Pressable style={styles.addChip} onPress={() => setGenresOpen(true)} hitSlop={6}>
                <Text style={styles.addChipText}>+</Text>
              </Pressable>
            </View>
          </View>
        </View>

        <Pressable style={styles.progressCard} onPress={() => setSheetOpen(true)}>
          <View style={styles.progressTop}>
            {pageTotal ? (
              <Text style={styles.progressCount}>
                {currentPage}
                <Text style={styles.progressCountSmall}> / {pageTotal} pages</Text>
              </Text>
            ) : (
              <Text style={styles.progressCount}>
                {currentPage ? `page ${currentPage}` : STATUS_LABEL[vol1?.status ?? 'missing']}
              </Text>
            )}
            <Text style={styles.progressPct}>{Math.round(pageFraction * 100)}%</Text>
          </View>
          <ProgressBar fraction={pageFraction} />
          <View style={styles.progressFoot}>
            <Text style={styles.progressHint}>Touchez pour mettre à jour</Text>
            <Pressable style={styles.editBtn} onPress={() => setEditingPages(true)} hitSlop={8}>
              <Ionicons
                name={pageTotal ? 'pencil' : 'add'}
                size={13}
                color={pageTotal ? theme.muted : theme.accent}
              />
              <Text style={[styles.editBtnText, pageTotal ? null : styles.editBtnAdd]}>
                {pageTotal ? 'Pages' : 'Ajouter'}
              </Text>
            </Pressable>
          </View>
        </Pressable>

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
      </ScrollView>

      <VolumeSheet
        visible={sheetOpen}
        title="Ce livre"
        subtitle={sheetSubtitle}
        showRemove={false}
        onClose={() => setSheetOpen(false)}
        onSelect={(target) => {
          setVolumeState(seriesId, 1, target);
          setSheetOpen(false);
        }}
        onSetPage={(page) => {
          setVolumeCurrentPage(seriesId, 1, page);
          setSheetOpen(false);
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

      <GenrePicker
        visible={genresOpen}
        selected={selectedGenres}
        onToggle={toggleGenre}
        onClose={() => setGenresOpen(false)}
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
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: theme.screenPadX, paddingBottom: theme.spacing.xl },
  hero: { flexDirection: 'row', gap: theme.spacing.md, marginBottom: theme.spacing.md },
  heroBody: { flex: 1, justifyContent: 'center' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: theme.accent },
  statusText: {
    fontFamily: theme.font.bold,
    fontSize: 12,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: theme.accent,
  },
  heroTitle: {
    fontFamily: theme.font.extrabold,
    fontSize: 24,
    color: theme.ink,
    letterSpacing: -0.4,
  },
  heroAuthor: { fontFamily: theme.font.medium, fontSize: 14, color: theme.muted, marginTop: 5 },

  metaCard: {
    backgroundColor: theme.surface,
    borderRadius: theme.radiusLg,
    borderWidth: 1,
    borderColor: theme.line,
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
    paddingVertical: 13,
  },
  metaRowGenres: { alignItems: 'flex-start', borderTopWidth: 1, borderTopColor: theme.line },
  metaKey: { fontFamily: theme.font.semibold, fontSize: 13, color: theme.sub, flexShrink: 0 },
  metaKeyTop: { paddingTop: 4 },
  metaValueRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaValue: { fontFamily: theme.font.bold, fontSize: 14, color: theme.ink },
  genres: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: theme.spacing.sm,
  },
  addChip: {
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 3,
    backgroundColor: theme.greyLt,
  },
  addChipText: { fontFamily: theme.font.bold, fontSize: 12, color: theme.muted, lineHeight: 14 },

  progressCard: {
    backgroundColor: theme.surface,
    borderRadius: theme.radiusLg,
    borderWidth: 1,
    borderColor: theme.line,
    padding: theme.spacing.md,
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  progressTop: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  progressCount: {
    fontFamily: theme.font.extrabold,
    fontSize: 22,
    color: theme.ink,
    letterSpacing: -0.3,
  },
  progressCountSmall: { fontFamily: theme.font.semibold, fontSize: 14, color: theme.muted },
  progressPct: { fontFamily: theme.font.bold, fontSize: 14, color: theme.accent },
  progressFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: theme.spacing.md,
  },
  progressHint: { fontFamily: theme.font.regular, fontSize: 13, color: theme.muted },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingVertical: 6,
    backgroundColor: theme.bg,
  },
  editBtnText: { fontFamily: theme.font.semibold, fontSize: 12, color: theme.muted },
  editBtnAdd: { color: theme.accent },

  synopsis: {
    backgroundColor: theme.surface,
    borderRadius: theme.radiusLg,
    borderWidth: 1,
    borderColor: theme.line,
    padding: theme.spacing.md,
    marginTop: theme.spacing.xs,
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
  synopsisMore: {
    fontFamily: theme.font.bold,
    fontSize: 12,
    color: theme.accent,
    marginTop: theme.spacing.sm,
  },
});
