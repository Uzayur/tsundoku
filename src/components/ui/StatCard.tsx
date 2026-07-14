import { StyleSheet, Text, View } from 'react-native';

import { theme } from '~/src/theme/theme';

export function StatCard({
  value,
  label,
  sub,
}: {
  value: string | number;
  label: string;
  sub?: string;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
      {sub ? <Text style={styles.sub}>{sub}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.line,
    borderRadius: theme.radiusLg,
    padding: theme.spacing.md,
  },
  value: { fontFamily: theme.font.extrabold, fontSize: 30, letterSpacing: -1, color: theme.ink },
  label: { fontFamily: theme.font.medium, fontSize: 12, color: theme.sub, marginTop: 2 },
  sub: { fontFamily: theme.font.bold, fontSize: 11, color: theme.accent, marginTop: 6 },
});
