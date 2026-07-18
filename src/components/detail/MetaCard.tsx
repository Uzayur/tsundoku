import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActionSheetIOS, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { TYPE_LABEL, TYPES } from '~/src/components/detail/labels';
import { Badge } from '~/src/components/ui/Badge';
import { GenrePicker } from '~/src/components/ui/GenrePicker';
import { OptionsSheet } from '~/src/components/ui/OptionsSheet';
import { Series } from '~/src/db/models';
import { translateGenre } from '~/src/lib/genres';
import { useLibrary } from '~/src/store/useLibrary';
import { theme } from '~/src/theme/theme';

/**
 * Shared Catégorie / Genres card. Owns both editing mechanisms so the single-book
 * and series pages behave identically: the category opens the native iOS action
 * sheet (falling back to the in-app sheet on Android), and the genres open the
 * multi-select picker.
 */
export function MetaCard({ series }: { series: Series }) {
  const seriesId = series.id;
  const updateSeriesType = useLibrary((s) => s.updateSeriesType);
  const setSeriesGenres = useLibrary((s) => s.setSeriesGenres);

  const [typeOpen, setTypeOpen] = useState(false);
  const [genresOpen, setGenresOpen] = useState(false);

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
      <View style={styles.card}>
        <Pressable style={styles.row} onPress={openCategory} hitSlop={6}>
          <Text style={styles.key}>Catégorie</Text>
          <View style={styles.valueRow}>
            <Text style={styles.value}>{TYPE_LABEL[series.type]}</Text>
            <Ionicons name="chevron-down" size={14} color={theme.muted} />
          </View>
        </Pressable>
        <View style={[styles.row, styles.rowGenres]}>
          <Text style={[styles.key, styles.keyTop]}>Genres</Text>
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
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.surface,
    borderRadius: theme.radiusLg,
    borderWidth: 1,
    borderColor: theme.line,
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
    paddingVertical: 13,
  },
  rowGenres: { alignItems: 'flex-start', borderTopWidth: 1, borderTopColor: theme.line },
  key: { fontFamily: theme.font.semibold, fontSize: 13, color: theme.sub, flexShrink: 0 },
  keyTop: { paddingTop: 4 },
  valueRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  value: { fontFamily: theme.font.bold, fontSize: 14, color: theme.ink },
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
});
