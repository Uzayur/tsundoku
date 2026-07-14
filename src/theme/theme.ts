// Rankr design system tokens. Corail is an accent only — never a dominant surface.
export const theme = {
  accent: '#f55139', // corail
  ink: '#0f222d', // navy — text / filled elements
  inkHover: '#223849',
  muted: '#879196',
  beige: '#ebe7d9',
  beigeDk: '#e0ddd0',
  greyLt: '#edeff4',
  bg: '#f4f2ec', // warm background
  surface: '#ffffff',
  line: '#e6e2d6',
  radiusSm: 10,
  radiusLg: 22,
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
  // Weight-specific Inter families. Values are the export names from
  // @expo-google-fonts/inter, which are also the runtime fontFamily names.
  font: {
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semibold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
  },
} as const;
