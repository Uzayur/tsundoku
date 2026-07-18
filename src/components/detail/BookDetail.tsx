import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { DetailHeader } from '~/src/components/detail/DetailHeader';
import { DetailHero } from '~/src/components/detail/DetailHero';
import { MetaCard } from '~/src/components/detail/MetaCard';
import { ProgressSummary } from '~/src/components/detail/ProgressSummary';
import { SummaryCard } from '~/src/components/detail/SummaryCard';
import { PagePrompt } from '~/src/components/ui/PagePrompt';
import { VolumeSheet } from '~/src/components/ui/VolumeSheet';
import { Series, Volume } from '~/src/db/models';
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
  const removeSeries = useLibrary((s) => s.removeSeries);
  const pendingPages = useLibrary((s) => s.pendingPages);
  const resolvePendingPages = useLibrary((s) => s.resolvePendingPages);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingPages, setEditingPages] = useState(false);

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

  // Page readout, or a plain "page N" / status fallback when no length is known.
  const readoutValue = pageTotal
    ? currentPage
    : currentPage
      ? `page ${currentPage}`
      : STATUS_LABEL[vol1?.status ?? 'missing'];
  const readoutUnit = pageTotal ? `/ ${pageTotal} pages` : undefined;

  const progressFooter = (
    <>
      <Text style={styles.hint}>Touchez pour mettre à jour</Text>
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
    </>
  );

  return (
    <>
      <DetailHeader onBack={() => router.back()} onDelete={onDelete} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <DetailHero
          title={series.title}
          author={series.author}
          coverUrl={series.coverUrl}
          seed={series.id}
          statusLabel={statusText}
          statusColor={statusColor}
        />

        <MetaCard series={series} />

        <ProgressSummary
          value={readoutValue}
          unit={readoutUnit}
          fraction={pageFraction}
          footer={progressFooter}
          onPress={() => setSheetOpen(true)}
        />

        {series.description ? <SummaryCard description={series.description} /> : null}
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
  hint: { fontFamily: theme.font.regular, fontSize: 13, color: theme.muted },
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
});
