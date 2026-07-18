import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { LibraryRow } from '~/src/components/ui/LibraryRow';
import { Screen } from '~/src/components/ui/Screen';
import { ScreenHeader } from '~/src/components/ui/ScreenHeader';
import { SectionTitle } from '~/src/components/ui/SectionTitle';
import { StatCard } from '~/src/components/ui/StatCard';
import { Series, Volume } from '~/src/db/models';
import { progressFraction, readCount } from '~/src/lib/progress';
import { recentlyAdded, recentlyRead } from '~/src/lib/recent';
import { relativeDate } from '~/src/lib/relativeDate';
import { totalBooksRead, totalPagesRead } from '~/src/lib/stats';
import { STATUS_LABEL } from '~/src/lib/volumeStatus';
import { useLibrary } from '~/src/store/useLibrary';
import { theme } from '~/src/theme/theme';

function subtitleFor(item: Series): string {
  return item.author ?? '';
}

/**
 * Left side of the progress bar. Single-volume works (romans, one-shots) track
 * reading progress rather than a tome count, so they never read "Tome 1 / 1".
 * Multi-tome series show tomes read out of the total, or a bare count when the
 * total is unknown.
 */
function progressLeft(item: Series, volumes: Volume[], read: number): string {
  if (item.totalVolumes === 1) {
    const vol = volumes.find((v) => v.number === 1);
    if (!vol) return STATUS_LABEL.missing;
    if (vol.pageCount && vol.currentPage) return `page ${vol.currentPage} / ${vol.pageCount}`;
    if (vol.currentPage) return `page ${vol.currentPage}`;
    return STATUS_LABEL[vol.status];
  }
  return item.totalVolumes ? `Tome ${read} / ${item.totalVolumes}` : `${read} tomes lus`;
}

export default function AccueilScreen() {
  const series = useLibrary((s) => s.series);
  const volumesBySeriesId = useLibrary((s) => s.volumesBySeriesId);

  const allVolumes = Object.values(volumesBySeriesId).flat();
  const now = new Date();

  const added = recentlyAdded(series);
  const read = recentlyRead(series, volumesBySeriesId);

  const goToSeries = (id: number) => router.push({ pathname: '/series/[id]', params: { id } });

  const row = (item: Series, volumes: Volume[], right: string) => {
    const count = readCount(volumes);
    return (
      <LibraryRow
        key={item.id}
        seed={item.id}
        coverUrl={item.coverUrl}
        title={item.title}
        subtitle={subtitleFor(item)}
        onPress={() => goToSeries(item.id)}
        progress={{
          fraction: progressFraction(count, item.totalVolumes),
          left: progressLeft(item, volumes, count),
          right,
        }}
      />
    );
  };

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

            <SectionTitle>Ajouts récents</SectionTitle>
            <View style={styles.rows}>
              {added.map((item) =>
                row(
                  item,
                  volumesBySeriesId[item.id] ?? [],
                  // Series predating migration 4 have no date to show.
                  item.addedAt ? relativeDate(item.addedAt, now) : '',
                ),
              )}
            </View>

            {read.length > 0 ? (
              <>
                <SectionTitle>Lectures récentes</SectionTitle>
                <View style={styles.rows}>
                  {read.map((entry) =>
                    row(
                      entry.series,
                      volumesBySeriesId[entry.series.id] ?? [],
                      relativeDate(entry.lastReadAt, now),
                    ),
                  )}
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
