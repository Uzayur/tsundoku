import { StyleSheet, Text, View } from 'react-native';

import { Cover } from '~/src/components/ui/Cover';
import { theme } from '~/src/theme/theme';

/**
 * Shared detail hero: cover on the left, a status dot + label above the title,
 * then author and an optional imprint line. Used by both the single-book and
 * multi-tome layouts so they read identically. `statusLabel` null hides the row.
 */
export function DetailHero({
  title,
  author,
  coverUrl,
  seed,
  statusLabel,
  statusColor,
  imprint,
}: {
  title: string;
  author: string | null;
  coverUrl: string | null;
  seed: number;
  statusLabel: string | null;
  statusColor: string;
  imprint?: string | null;
}) {
  return (
    <View style={styles.hero}>
      <Cover title={title} seed={seed} coverUrl={coverUrl} size="lg" />
      <View style={styles.body}>
        {statusLabel ? (
          <View style={styles.statusRow}>
            <View style={[styles.dot, { backgroundColor: statusColor }]} />
            <Text style={[styles.status, { color: statusColor }]}>{statusLabel}</Text>
          </View>
        ) : null}
        <Text style={styles.title}>{title}</Text>
        {author ? <Text style={styles.author}>{author}</Text> : null}
        {imprint ? <Text style={styles.imprint}>{imprint}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', gap: theme.spacing.md, marginBottom: theme.spacing.md },
  body: { flex: 1, paddingTop: 2 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  status: {
    fontFamily: theme.font.bold,
    fontSize: 12,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: theme.font.extrabold,
    fontSize: 24,
    color: theme.ink,
    letterSpacing: -0.4,
    lineHeight: 27,
  },
  author: { fontFamily: theme.font.medium, fontSize: 14, color: theme.sub, marginTop: 5 },
  imprint: { fontFamily: theme.font.regular, fontSize: 12.5, color: theme.muted, marginTop: 4 },
});
