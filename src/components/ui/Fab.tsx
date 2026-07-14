import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';

import { theme } from '~/src/theme/theme';

export function Fab({
  onPress,
  icon = 'add',
  bottom = 96,
}: {
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  bottom?: number;
}) {
  return (
    <Pressable style={[styles.fab, { bottom }]} onPress={onPress}>
      <Ionicons name={icon} size={30} color={theme.surface} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 20,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: theme.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.accent,
    shadowOpacity: 0.5,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
});
