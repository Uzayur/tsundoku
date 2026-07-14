import { Pressable, StyleSheet, Text } from 'react-native';

import { theme } from '~/src/theme/theme';

export function Pill({
  label,
  active = false,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable style={[styles.pill, active && styles.pillOn]} onPress={onPress}>
      <Text style={[styles.text, active && styles.textOn]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.line,
    borderRadius: 20,
    paddingHorizontal: 13,
    paddingVertical: 7,
  },
  pillOn: { backgroundColor: theme.accent, borderColor: theme.accent },
  text: { fontFamily: theme.font.semibold, fontSize: 12, color: theme.ink },
  textOn: { color: theme.surface },
});
