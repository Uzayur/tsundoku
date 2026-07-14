import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text } from 'react-native';

import { theme } from '~/src/theme/theme';

const PALETTES: [string, string][] = [
  ['#f55139', '#b8321f'], // corail
  ['#0f222d', '#33505f'], // navy
  ['#879196', '#5a6469'], // grey-blue
  ['#c98a3a', '#8a5a1e'], // gold
  ['#0f222d', '#223849'], // deep navy
];

const SIZES = {
  sm: { width: 44, height: 64, fontSize: 15 },
  md: { width: 52, height: 76, fontSize: 20 },
  lg: { width: 86, height: 126, fontSize: 30 },
} as const;

function initials(title: string): string {
  const words = title.trim().split(/\s+/).slice(0, 2);
  return words
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase();
}

export function Cover({
  title,
  seed,
  size = 'md',
  label,
}: {
  title: string;
  seed: number;
  size?: keyof typeof SIZES;
  label?: string;
}) {
  const [a, b] = PALETTES[Math.abs(seed) % PALETTES.length];
  const dim = SIZES[size];
  return (
    <LinearGradient
      colors={[a, b]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.cover, { width: dim.width, height: dim.height }]}
    >
      <Text style={[styles.text, { fontSize: dim.fontSize }]}>{label ?? initials(title)}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  cover: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.ink,
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  text: { fontFamily: theme.font.bold, color: theme.surface },
});
