import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '~/src/theme/theme';

export interface SegmentOption<T extends string> {
  key: T;
  label: string;
}

export function SegmentControl<T extends string>({
  options,
  value,
  onChange,
  size = 'md',
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (key: T) => void;
  size?: 'md' | 'sm';
}) {
  const compact = size === 'sm';
  return (
    <View style={styles.segment}>
      {options.map((opt) => {
        const active = opt.key === value;
        return (
          <Pressable
            key={opt.key}
            style={[styles.btn, compact && styles.btnSm, active && styles.btnActive]}
            onPress={() => onChange(opt.key)}
          >
            <Text style={[styles.text, compact && styles.textSm, active && styles.textActive]}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  segment: {
    flexDirection: 'row',
    backgroundColor: theme.greyLt,
    borderRadius: 12,
    padding: 4,
  },
  btn: { flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: 'center' },
  btnSm: { paddingVertical: 7 },
  btnActive: { backgroundColor: theme.ink },
  text: { fontFamily: theme.font.bold, fontSize: 13, color: theme.muted },
  textSm: { fontSize: 12.5 },
  textActive: { color: theme.beige },
});
