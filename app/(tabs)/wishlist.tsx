import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text } from 'react-native';

import { Screen } from '~/src/components/ui/Screen';
import { ScreenHeader } from '~/src/components/ui/ScreenHeader';
import { useLibrary } from '~/src/store/useLibrary';
import { theme } from '~/src/theme/theme';

interface WishRow {
  key: string;
  seriesId: number;
  seriesTitle: string;
  number: number;
}

export default function WishlistScreen() {
  const series = useLibrary((s) => s.series);
  const volumesBySeriesId = useLibrary((s) => s.volumesBySeriesId);

  const rows: WishRow[] = [];
  for (const s of series) {
    for (const v of volumesBySeriesId[s.id] ?? []) {
      if (v.status === 'wishlist') {
        rows.push({
          key: `${s.id}-${v.number}`,
          seriesId: s.id,
          seriesTitle: s.title,
          number: v.number,
        });
      }
    }
  }

  return (
    <Screen>
      <FlatList
        data={rows}
        keyExtractor={(r) => r.key}
        ListHeaderComponent={<ScreenHeader title="Envies" subtitle={`${rows.length} tomes`} />}
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() => router.push({ pathname: '/series/[id]', params: { id: item.seriesId } })}
          >
            <Text style={styles.title} numberOfLines={1}>
              {item.seriesTitle}
            </Text>
            <Text style={styles.vol}>Tome {item.number}</Text>
          </Pressable>
        )}
        contentContainerStyle={styles.content}
        ListEmptyComponent={<Text style={styles.empty}>Aucune envie pour l’instant</Text>}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.surface,
    borderRadius: theme.radiusLg,
    borderWidth: 1,
    borderColor: theme.line,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  title: { flex: 1, fontFamily: theme.font.semibold, fontSize: 15, color: theme.ink },
  vol: { fontFamily: theme.font.medium, fontSize: 13, color: theme.accent },
  empty: {
    fontFamily: theme.font.regular,
    color: theme.muted,
    textAlign: 'center',
    marginTop: theme.spacing.xl,
  },
});
