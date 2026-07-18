import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { theme } from '~/src/theme/theme';

/** Shared "Résumé" card: a 4-line clamp that expands on tap. */
export function SummaryCard({ description }: { description: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Pressable style={styles.card} onPress={() => setOpen((o) => !o)} hitSlop={4}>
      <Text style={styles.label}>Résumé</Text>
      <Text style={styles.text} numberOfLines={open ? undefined : 4}>
        {description}
      </Text>
      <Text style={styles.more}>{open ? 'Réduire' : 'Lire la suite'}</Text>
    </Pressable>
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
  label: {
    fontFamily: theme.font.bold,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: theme.muted,
    marginBottom: theme.spacing.sm,
  },
  text: { fontFamily: theme.font.regular, fontSize: 13, lineHeight: 20, color: theme.ink },
  more: {
    fontFamily: theme.font.bold,
    fontSize: 12,
    color: theme.accent,
    marginTop: theme.spacing.sm,
  },
});
