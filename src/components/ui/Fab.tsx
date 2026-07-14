import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';

import { theme } from '~/src/theme/theme';

export function Fab({
  onPress,
  icon = 'add',
}: {
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <Pressable style={styles.fab} onPress={onPress}>
      <Ionicons name={icon} size={28} color={theme.surface} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: theme.spacing.lg,
    bottom: theme.spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.ink,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
});
