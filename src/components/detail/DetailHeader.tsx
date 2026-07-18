import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '~/src/theme/theme';

/** Shared detail-screen top bar: back link on the left, optional delete on the right. */
export function DetailHeader({ onBack, onDelete }: { onBack: () => void; onDelete?: () => void }) {
  return (
    <View style={styles.header}>
      <Pressable style={styles.backlink} onPress={onBack} hitSlop={12}>
        <Ionicons name="chevron-back" size={20} color={theme.muted} />
        <Text style={styles.backText}>Retour</Text>
      </Pressable>
      {onDelete ? (
        <Pressable onPress={onDelete} hitSlop={12}>
          <Ionicons name="trash-outline" size={20} color={theme.muted} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.screenPadX,
    paddingVertical: theme.spacing.md,
  },
  backlink: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backText: { fontFamily: theme.font.semibold, fontSize: 13, color: theme.muted },
});
