import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ProgressBar } from '~/src/components/ui/ProgressBar';
import { theme } from '~/src/theme/theme';

/**
 * Shared progress card: a big readout with an optional muted unit, a percentage,
 * a full-width bar, and an optional footer row. `onPress` makes the whole card
 * tappable (single-book, to open the status sheet); the series page leaves it
 * static and only puts an ownership hint in the footer.
 */
export function ProgressSummary({
  value,
  unit,
  fraction,
  footer,
  onPress,
}: {
  value: string | number;
  unit?: string;
  fraction: number;
  footer?: ReactNode;
  onPress?: () => void;
}) {
  const pct = Math.round(Math.max(0, Math.min(1, fraction)) * 100);

  const body = (
    <>
      <View style={styles.top}>
        <Text style={styles.count}>
          {value}
          {unit ? <Text style={styles.countSmall}> {unit}</Text> : null}
        </Text>
        <Text style={styles.pct}>{pct}%</Text>
      </View>
      <ProgressBar fraction={fraction} />
      {footer ? <View style={styles.foot}>{footer}</View> : null}
    </>
  );

  return onPress ? (
    <Pressable style={styles.card} onPress={onPress}>
      {body}
    </Pressable>
  ) : (
    <View style={styles.card}>{body}</View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.surface,
    borderRadius: theme.radiusLg,
    borderWidth: 1,
    borderColor: theme.line,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  count: {
    fontFamily: theme.font.extrabold,
    fontSize: 22,
    color: theme.ink,
    letterSpacing: -0.3,
  },
  countSmall: { fontFamily: theme.font.semibold, fontSize: 14, color: theme.muted },
  pct: { fontFamily: theme.font.bold, fontSize: 14, color: theme.accent },
  foot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: theme.spacing.md,
  },
});
