import { VolumeStatus } from '~/src/db/models';
import { theme } from '~/src/theme/theme';

export type SlotState = VolumeStatus | 'missing';

const CYCLE: SlotState[] = ['missing', 'wishlist', 'owned', 'reading', 'read'];

export function nextStatus(current: SlotState): SlotState {
  const i = CYCLE.indexOf(current);
  return CYCLE[(i + 1) % CYCLE.length];
}

export interface SlotStyle {
  fill: string;
  border: string;
  text: string;
  dashed?: boolean;
}

export const STATUS_STYLE: Record<SlotState, SlotStyle> = {
  missing: { fill: 'transparent', border: theme.line, text: theme.muted, dashed: true },
  wishlist: { fill: 'transparent', border: theme.accent, text: theme.accent },
  owned: { fill: theme.beige, border: theme.beigeDk, text: theme.ink },
  reading: { fill: theme.inkHover, border: theme.inkHover, text: theme.surface },
  read: { fill: theme.accent, border: theme.accent, text: theme.surface },
};

export const STATUS_LABEL: Record<SlotState, string> = {
  missing: 'Manquant',
  wishlist: 'Envie',
  owned: 'Possédé',
  reading: 'En cours',
  read: 'Lu',
};
