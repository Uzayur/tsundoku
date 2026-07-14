import { StyleSheet, Text, View } from 'react-native';

import { theme } from '~/src/theme/theme';

export type BadgeTone = 'read' | 'owned' | 'reading' | 'wish';

export function Badge({ label, tone }: { label: string; tone: BadgeTone }) {
  return (
    <View style={[styles.badge, TONE_VIEW[tone]]}>
      <Text style={[styles.text, TONE_TEXT[tone]]}>{label}</Text>
    </View>
  );
}

const TONE_VIEW = StyleSheet.create({
  read: { backgroundColor: theme.ink },
  owned: { backgroundColor: 'rgba(245,81,57,0.14)' },
  reading: { backgroundColor: 'rgba(245,81,57,0.14)' },
  wish: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.muted,
  },
});

const TONE_TEXT = StyleSheet.create({
  read: { color: theme.beige },
  owned: { color: theme.accent },
  reading: { color: theme.accent },
  wish: { color: theme.muted },
});

const styles = StyleSheet.create({
  badge: { alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3 },
  text: { fontFamily: theme.font.bold, fontSize: 10 },
});
