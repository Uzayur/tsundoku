import { StyleSheet, Text } from 'react-native';

import { theme } from '~/src/theme/theme';

export function SectionTitle({ children }: { children: string }) {
  return <Text style={styles.title}>{children}</Text>;
}

const styles = StyleSheet.create({
  title: {
    fontFamily: theme.font.bold,
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: theme.muted,
    marginTop: 22,
    marginBottom: 12,
  },
});
