import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Series } from '~/src/db/models';
import { ProgressBar } from '~/src/components/ui/ProgressBar';
import { progressFraction } from '~/src/lib/progress';
import { theme } from '~/src/theme/theme';

function initials(title: string): string {
  return title
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase();
}

export function SeriesCard({ series, readCount }: { series: Series; readCount: number }) {
  const total = series.totalVolumes;
  return (
    <Pressable
      style={styles.card}
      onPress={() => router.push({ pathname: '/series/[id]', params: { id: series.id } })}
    >
      <View style={styles.cover}>
        <Text style={styles.coverText}>{initials(series.title)}</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {series.title}
        </Text>
        <Text style={styles.type}>{series.type}</Text>
        <View style={styles.progressRow}>
          <View style={styles.barWrap}>
            <ProgressBar fraction={progressFraction(readCount, total)} />
          </View>
          <Text style={styles.count}>
            {readCount}/{total ?? '?'}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: theme.surface,
    borderRadius: theme.radiusLg,
    borderWidth: 1,
    borderColor: theme.line,
    padding: theme.spacing.sm,
    gap: theme.spacing.md,
  },
  cover: {
    width: 52,
    height: 72,
    borderRadius: theme.radiusSm,
    backgroundColor: theme.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverText: { fontFamily: theme.font.bold, color: theme.surface, fontSize: 18 },
  body: { flex: 1, justifyContent: 'center', gap: 4 },
  title: { fontFamily: theme.font.semibold, fontSize: 16, color: theme.ink },
  type: { fontFamily: theme.font.regular, fontSize: 13, color: theme.muted },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginTop: 4 },
  barWrap: { flex: 1 },
  count: {
    fontFamily: theme.font.medium,
    fontSize: 13,
    color: theme.muted,
    minWidth: 42,
    textAlign: 'right',
  },
});
