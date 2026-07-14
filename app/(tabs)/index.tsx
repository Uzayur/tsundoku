import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { LibraryRow } from '~/src/components/ui/LibraryRow';
import { Screen } from '~/src/components/ui/Screen';
import { ScreenHeader } from '~/src/components/ui/ScreenHeader';
import { SectionTitle } from '~/src/components/ui/SectionTitle';
import { StatCard } from '~/src/components/ui/StatCard';
import { SeriesType } from '~/src/db/models';
import { progressFraction, readCount } from '~/src/lib/progress';
import { totalBooksRead, totalPagesRead } from '~/src/lib/stats';
import { useLibrary } from '~/src/store/useLibrary';
import { theme } from '~/src/theme/theme';

const TYPE_LABELS: Record<SeriesType, string> = {
  manga: 'Manga',
  novel: 'Roman',
  bd: 'BD',
  comic: 'Comics',
};

function typeLabel(type: SeriesType): string {
  return TYPE_LABELS[type];
}

export default function AccueilScreen() {
  const series = useLibrary((s) => s.series);
  const volumesBySeriesId = useLibrary((s) => s.volumesBySeriesId);

  const allVolumes = Object.values(volumesBySeriesId).flat();

  const inProgress = series.filter((item) => {
    const read = readCount(volumesBySeriesId[item.id] ?? []);
    return item.totalVolumes == null || read < item.totalVolumes;
  });

  const finished = series.filter((item) => {
    const read = readCount(volumesBySeriesId[item.id] ?? []);
    return item.totalVolumes != null && read === item.totalVolumes;
  });

  const goToSeries = (id: number) => router.push({ pathname: '/series/[id]', params: { id } });

  return (
    <Screen>
      <ScreenHeader title="Bonjour 👋" subtitle="Votre bibliothèque" />
      <ScrollView contentContainerStyle={styles.content}>
        {series.length === 0 ? (
          <Text style={styles.empty}>
            Votre bibliothèque est vide. Touchez + pour ajouter une série.
          </Text>
        ) : (
          <>
            <View style={styles.statRow}>
              <StatCard value={totalBooksRead(allVolumes)} label="Livres lus" />
              <StatCard value={totalPagesRead(allVolumes)} label="Pages lues" />
            </View>

            <SectionTitle>Lectures en cours</SectionTitle>
            <View style={styles.rows}>
              {inProgress.map((item) => {
                const read = readCount(volumesBySeriesId[item.id] ?? []);
                const fraction = progressFraction(read, item.totalVolumes);
                return (
                  <LibraryRow
                    key={item.id}
                    seed={item.id}
                    coverUrl={item.coverUrl}
                    title={item.title}
                    subtitle={
                      item.author
                        ? `${item.author} · ${typeLabel(item.type)}`
                        : typeLabel(item.type)
                    }
                    onPress={() => goToSeries(item.id)}
                    progress={{
                      fraction,
                      left: item.totalVolumes
                        ? `Tome ${read} / ${item.totalVolumes}`
                        : `${read} tomes lus`,
                      right: `${Math.round(fraction * 100)}%`,
                    }}
                  />
                );
              })}
            </View>

            {finished.length > 0 ? (
              <>
                <SectionTitle>Terminé récemment</SectionTitle>
                <View style={styles.rows}>
                  {finished.map((item) => (
                    <LibraryRow
                      key={item.id}
                      seed={item.id}
                      coverUrl={item.coverUrl}
                      title={item.title}
                      subtitle={
                        item.author
                          ? `${item.author} · ${typeLabel(item.type)}`
                          : typeLabel(item.type)
                      }
                      onPress={() => goToSeries(item.id)}
                      progress={{ fraction: 1, left: 'Terminé', right: '100%' }}
                    />
                  ))}
                </View>
              </>
            ) : null}
          </>
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
  statRow: { flexDirection: 'row', gap: 12 },
  rows: { gap: theme.spacing.sm },
  empty: {
    fontFamily: theme.font.regular,
    color: theme.muted,
    textAlign: 'center',
    marginTop: theme.spacing.xl,
  },
});
