import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Badge } from '~/src/components/ui/Badge';
import { Screen } from '~/src/components/ui/Screen';
import { ScreenHeader } from '~/src/components/ui/ScreenHeader';
import { SectionTitle } from '~/src/components/ui/SectionTitle';
import { LibraryRow } from '~/src/components/ui/LibraryRow';
import { SeriesType, Volume } from '~/src/db/models';
import { useLibrary } from '~/src/store/useLibrary';
import { theme } from '~/src/theme/theme';

const TYPE_LABEL: Record<SeriesType, string> = {
  manga: 'Manga',
  novel: 'Roman',
  bd: 'BD',
  comic: 'Comics',
};

export default function WishlistScreen() {
  const series = useLibrary((s) => s.series);
  const volumesBySeriesId = useLibrary((s) => s.volumesBySeriesId);

  const groups = series
    .map((s) => ({
      series: s,
      volumes: (volumesBySeriesId[s.id] ?? [])
        .filter((v) => v.status === 'wishlist')
        .sort((a, b) => a.number - b.number),
    }))
    .filter((g) => g.volumes.length > 0);

  const totalWishCount = groups.reduce((sum, g) => sum + g.volumes.length, 0);

  return (
    <Screen>
      <ScreenHeader title="Liste d'envies" subtitle={`${totalWishCount} tomes`} />
      <ScrollView contentContainerStyle={styles.content}>
        {groups.length === 0 ? (
          <Text style={styles.empty}>Aucune envie pour l’instant</Text>
        ) : (
          groups.map((g) => (
            <View key={g.series.id}>
              <SectionTitle>{`${g.series.title} · ${g.volumes.length} tomes`}</SectionTitle>
              <View style={styles.list}>
                {g.volumes.map((v: Volume) => (
                  <LibraryRow
                    key={v.id}
                    seed={g.series.id}
                    coverUrl={g.series.coverUrl}
                    title={`Tome ${v.number}`}
                    subtitle={g.series.author ?? TYPE_LABEL[g.series.type]}
                    trailing={<Badge tone="wish" label="Wishlist" />}
                    onPress={() =>
                      router.push({ pathname: '/series/[id]', params: { id: g.series.id } })
                    }
                  />
                ))}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: theme.screenPadX,
    paddingBottom: theme.tabBarClearance,
  },
  list: {
    gap: 11,
  },
  empty: {
    fontFamily: theme.font.regular,
    color: theme.muted,
    textAlign: 'center',
    marginTop: theme.spacing.xl,
  },
});
