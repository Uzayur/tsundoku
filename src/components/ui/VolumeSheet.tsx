import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { SlotState } from '~/src/lib/volumeStatus';
import { theme } from '~/src/theme/theme';

const STATUS_OPTIONS: { target: SlotState; label: string }[] = [
  { target: 'wishlist', label: 'Wishlist' },
  { target: 'owned', label: 'Possédé' },
  { target: 'read', label: 'Lu' },
];

export function VolumeSheet({
  visible,
  number,
  subtitle,
  onClose,
  onSelect,
  onSetPage,
}: {
  visible: boolean;
  number: number;
  subtitle?: string;
  onClose: () => void;
  onSelect: (target: SlotState, applyToPrevious: boolean) => void;
  onSetPage: (page: number) => void;
}) {
  const [applyPrev, setApplyPrev] = useState(false);
  const [pageMode, setPageMode] = useState(false);
  const [page, setPage] = useState('');

  const reset = () => {
    setApplyPrev(false);
    setPageMode(false);
    setPage('');
  };
  const close = () => {
    reset();
    onClose();
  };
  const choose = (target: SlotState) => {
    onSelect(target, applyPrev);
    reset();
  };
  const confirmPage = () => {
    const n = parseInt(page, 10);
    if (!Number.isNaN(n) && n > 0) {
      onSetPage(n);
      reset();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close} />
      <View style={styles.sheet}>
        <Text style={styles.title}>Tome {number}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

        <Pressable style={styles.toggleRow} onPress={() => setApplyPrev((v) => !v)}>
          <Text style={styles.toggleLabel}>Appliquer aux tomes précédents</Text>
          <Switch
            value={applyPrev}
            onValueChange={setApplyPrev}
            trackColor={{ true: theme.accent, false: theme.line }}
            thumbColor={theme.surface}
          />
        </Pressable>

        {STATUS_OPTIONS.map((o) => (
          <Pressable key={o.target} style={styles.option} onPress={() => choose(o.target)}>
            <Text style={styles.optionLabel}>{o.label}</Text>
          </Pressable>
        ))}

        {pageMode ? (
          <View style={styles.pageRow}>
            <TextInput
              style={styles.pageInput}
              value={page}
              onChangeText={setPage}
              keyboardType="number-pad"
              placeholder="Page actuelle"
              placeholderTextColor={theme.muted}
              autoFocus
            />
            <Pressable style={styles.pageBtn} onPress={confirmPage}>
              <Text style={styles.pageBtnText}>OK</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable style={styles.option} onPress={() => setPageMode(true)}>
            <Text style={styles.optionLabel}>En cours…</Text>
          </Pressable>
        )}

        <Pressable style={styles.option} onPress={() => choose('missing')}>
          <Text style={[styles.optionLabel, styles.destructive]}>Supprimer</Text>
        </Pressable>

        <Pressable style={styles.cancel} onPress={close}>
          <Text style={styles.cancelText}>Annuler</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,34,45,0.45)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.bg,
    borderTopLeftRadius: theme.radiusLg,
    borderTopRightRadius: theme.radiusLg,
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  title: { fontFamily: theme.font.extrabold, fontSize: 20, color: theme.ink },
  subtitle: { fontFamily: theme.font.medium, fontSize: 13, color: theme.sub, marginTop: -4 },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm,
  },
  toggleLabel: { fontFamily: theme.font.medium, fontSize: 14, color: theme.ink },
  option: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.line,
    borderRadius: theme.radiusSm,
    paddingVertical: 14,
    paddingHorizontal: theme.spacing.md,
  },
  optionLabel: { fontFamily: theme.font.semibold, fontSize: 15, color: theme.ink },
  destructive: { color: theme.accent },
  pageRow: { flexDirection: 'row', gap: theme.spacing.sm },
  pageInput: {
    flex: 1,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.accent,
    borderRadius: theme.radiusSm,
    paddingVertical: 14,
    paddingHorizontal: theme.spacing.md,
    fontFamily: theme.font.semibold,
    fontSize: 15,
    color: theme.ink,
  },
  pageBtn: {
    backgroundColor: theme.ink,
    borderRadius: theme.radiusSm,
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageBtnText: { fontFamily: theme.font.semibold, fontSize: 15, color: theme.beige },
  cancel: { alignItems: 'center', paddingVertical: 14, marginTop: theme.spacing.xs },
  cancelText: { fontFamily: theme.font.semibold, fontSize: 15, color: theme.muted },
});
