import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Cover } from '~/src/components/ui/Cover';
import { ProgressBar } from '~/src/components/ui/ProgressBar';
import { theme } from '~/src/theme/theme';

export interface RowProgress {
  fraction: number;
  left: string;
  right: string;
}

/**
 * The Rankr `.reading` item: cover + meta (title, subtitle, then either a
 * progress bar with labels, or a trailing node such as a badge).
 */
export function LibraryRow({
  seed,
  title,
  subtitle,
  coverUrl,
  onPress,
  progress,
  trailing,
}: {
  seed: number;
  title: string;
  subtitle?: string;
  coverUrl?: string | null;
  onPress?: () => void;
  progress?: RowProgress;
  trailing?: ReactNode;
}) {
  return (
    <Pressable style={styles.row} onPress={onPress} disabled={!onPress}>
      <Cover title={title} seed={seed} coverUrl={coverUrl} size="md" />
      <View style={styles.meta}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
        {progress ? (
          <View style={styles.progressWrap}>
            <ProgressBar fraction={progress.fraction} />
            <View style={styles.progressText}>
              <Text style={styles.progressLabel}>{progress.left}</Text>
              <Text style={styles.progressLabel}>{progress.right}</Text>
            </View>
          </View>
        ) : null}
        {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 13,
    alignItems: 'center',
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.line,
    borderRadius: theme.radiusLg,
    padding: 12,
  },
  meta: { flex: 1, minWidth: 0 },
  title: { fontFamily: theme.font.bold, fontSize: 15, color: theme.ink },
  subtitle: { fontFamily: theme.font.medium, fontSize: 12, color: theme.sub, marginTop: 2 },
  progressWrap: { marginTop: 8 },
  progressText: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 },
  progressLabel: { fontFamily: theme.font.semibold, fontSize: 11, color: theme.sub },
  trailing: { marginTop: 8, flexDirection: 'row' },
});
