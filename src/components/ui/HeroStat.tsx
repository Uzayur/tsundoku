import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { theme } from '~/src/theme/theme';

/**
 * A prominent totals card. `primary` is a filled ink surface with a white
 * number; `secondary` is a white surface with an accent-tinted icon chip.
 */
export function HeroStat({
  value,
  label,
  variant,
  icon,
}: {
  value: string | number;
  label: string;
  variant: 'primary' | 'secondary';
  icon: ReactNode;
}) {
  const primary = variant === 'primary';
  return (
    <View style={[styles.card, primary ? styles.primaryCard : styles.secondaryCard]}>
      <View style={[styles.chip, primary ? styles.primaryChip : styles.secondaryChip]}>{icon}</View>
      <Text style={[styles.value, primary ? styles.primaryText : styles.secondaryText]}>
        {value}
      </Text>
      <Text style={[styles.label, primary ? styles.primaryLabel : styles.secondaryLabel]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: theme.radiusLg,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: 18,
  },
  primaryCard: { backgroundColor: theme.ink },
  secondaryCard: { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.line },
  chip: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  primaryChip: { backgroundColor: 'rgba(255,255,255,0.12)' },
  secondaryChip: { backgroundColor: theme.accentSoft },
  value: { fontFamily: theme.font.extrabold, fontSize: 32, letterSpacing: -1 },
  primaryText: { color: '#ffffff' },
  secondaryText: { color: theme.ink },
  label: { fontFamily: theme.font.medium, fontSize: 12.5, marginTop: 5 },
  primaryLabel: { color: 'rgba(255,255,255,0.65)' },
  secondaryLabel: { color: theme.sub },
});
