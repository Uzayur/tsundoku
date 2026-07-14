import { StyleSheet, View } from 'react-native';

import { theme } from '~/src/theme/theme';

export function ProgressBar({ fraction }: { fraction: number }) {
  const pct = Math.round(Math.max(0, Math.min(1, fraction)) * 100);
  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${pct}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 6, borderRadius: 3, backgroundColor: theme.greyLt, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3, backgroundColor: theme.accent },
});
