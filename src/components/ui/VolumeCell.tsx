import { Pressable, StyleSheet, Text } from 'react-native';

import { SlotState, STATUS_STYLE } from '~/src/lib/volumeStatus';
import { theme } from '~/src/theme/theme';

export function VolumeCell({
  number,
  state,
  onPress,
}: {
  number: number;
  state: SlotState;
  onPress: () => void;
}) {
  const s = STATUS_STYLE[state];
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.cell,
        {
          backgroundColor: s.fill,
          borderColor: s.border,
          borderStyle: s.dashed ? 'dashed' : 'solid',
        },
      ]}
    >
      <Text style={[styles.num, { color: s.text }]}>{number}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cell: {
    width: 44,
    height: 58,
    borderRadius: theme.radiusSm,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  num: { fontFamily: theme.font.semibold, fontSize: 15 },
});
