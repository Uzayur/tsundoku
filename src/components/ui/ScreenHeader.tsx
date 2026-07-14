import { StyleSheet, Text, View } from 'react-native';

import { theme } from '~/src/theme/theme';

export function ScreenHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  title: { fontFamily: theme.font.bold, fontSize: 28, color: theme.ink },
  subtitle: { fontFamily: theme.font.regular, fontSize: 15, color: theme.muted, marginTop: 2 },
});
