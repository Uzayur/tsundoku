import { nextStatus, SlotState, STATUS_LABEL, STATUS_STYLE } from '~/src/lib/volumeStatus';

describe('nextStatus', () => {
  it('walks the four-state cycle back to missing', () => {
    const seq: SlotState[] = ['missing', 'wishlist', 'owned', 'read', 'missing'];
    for (let i = 0; i < seq.length - 1; i++) {
      expect(nextStatus(seq[i])).toBe(seq[i + 1]);
    }
  });

  it('folds a non-cycle status (reading) back into the cycle', () => {
    expect(nextStatus('reading')).toBe('missing');
  });
});

describe('status maps', () => {
  it('has a style and label for every slot state', () => {
    const states: SlotState[] = ['missing', 'wishlist', 'owned', 'reading', 'read'];
    for (const s of states) {
      expect(STATUS_STYLE[s]).toBeDefined();
      expect(typeof STATUS_LABEL[s]).toBe('string');
    }
  });
});
