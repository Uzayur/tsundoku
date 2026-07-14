import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { theme } from '~/src/theme/theme';

export function ScreenHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <View style={styles.wrap}>
      <View style={styles.textCol}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  textCol: { flex: 1 },
  title: { fontFamily: theme.font.bold, fontSize: 28, color: theme.ink },
  subtitle: { fontFamily: theme.font.regular, fontSize: 15, color: theme.muted, marginTop: 2 },
});
