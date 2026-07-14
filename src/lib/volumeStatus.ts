import { VolumeStatus } from '~/src/db/models';
import { theme } from '~/src/theme/theme';

export type SlotState = VolumeStatus | 'missing';

// Tap cycle for a volume slot: manquant → wishlist → possédé → lu → manquant.
// ('reading' is a valid stored status but is not part of the grid tap cycle.)
const CYCLE: SlotState[] = ['missing', 'wishlist', 'owned', 'read'];

export function nextStatus(current: SlotState): SlotState {
  const i = CYCLE.indexOf(current);
  if (i === -1) return 'missing'; // e.g. 'reading' → fold back to a cycle state
  return CYCLE[(i + 1) % CYCLE.length];
}

export interface SlotStyle {
  fill: string;
  border: string;
  text: string;
  dashed?: boolean;
}

export const STATUS_STYLE: Record<SlotState, SlotStyle> = {
  missing: { fill: theme.beigeDk, border: theme.beigeDk, text: theme.muted },
  wishlist: { fill: 'transparent', border: theme.muted, text: theme.muted, dashed: true },
  owned: { fill: theme.accent, border: theme.accent, text: theme.surface },
  reading: { fill: 'rgba(245,81,57,0.16)', border: theme.accent, text: theme.accent },
  read: { fill: theme.ink, border: theme.ink, text: theme.beige },
};

export const STATUS_LABEL: Record<SlotState, string> = {
  missing: 'Manquant',
  wishlist: 'Wishlist',
  owned: 'Possédé',
  reading: 'En cours',
  read: 'Lu',
};

// The states shown in the series-detail legend.
export const LEGEND_STATES: SlotState[] = ['read', 'reading', 'owned', 'wishlist', 'missing'];
