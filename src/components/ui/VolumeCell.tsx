import { Pressable, StyleSheet, Text } from 'react-native';

import { SlotState, STATUS_STYLE } from '~/src/lib/volumeStatus';
import { theme } from '~/src/theme/theme';

export function VolumeCell({
  number,
  state,
  width,
  onPress,
}: {
  number: number;
  state: SlotState;
  width: number;
  onPress: () => void;
}) {
  const s = STATUS_STYLE[state];
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.cell,
        {
          width,
          height: width / 0.72,
          backgroundColor: s.fill,
          borderColor: s.border,
          borderStyle: s.dashed ? 'dashed' : 'solid',
          borderWidth: s.dashed ? 1.5 : 0,
        },
      ]}
    >
      <Text style={[styles.num, { color: s.text }]}>{number}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cell: {
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 6,
  },
  num: { fontFamily: theme.font.bold, fontSize: 13 },
});
