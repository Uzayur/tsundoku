import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { SlotState } from '~/src/lib/volumeStatus';
import { theme } from '~/src/theme/theme';

export function VolumeSheet({
  visible,
  title,
  subtitle,
  onClose,
  onSelect,
  onSetPage,
  showRemove = true,
}: {
  visible: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  onSelect: (target: SlotState) => void;
  onSetPage: (page: number) => void;
  showRemove?: boolean;
}) {
  const [pageMode, setPageMode] = useState(false);
  const [page, setPage] = useState('');

  const reset = () => {
    setPageMode(false);
    setPage('');
  };
  const close = () => {
    reset();
    onClose();
  };
  const choose = (target: SlotState) => {
    onSelect(target);
    reset();
  };
  const confirmPage = () => {
    // An empty field means "en cours" without a page — just set the status.
    if (page.trim() === '') {
      onSelect('reading');
      reset();
      return;
    }
    const n = parseInt(page, 10);
    if (!Number.isNaN(n) && n > 0) {
      onSetPage(n);
      reset();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={close}>
      <KeyboardAvoidingView
        style={styles.wrap}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={styles.backdrop} onPress={close} />
        <View style={styles.sheet}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

          <Pressable style={styles.option} onPress={() => choose('read')}>
            <Text style={styles.optionLabel}>Lu</Text>
          </Pressable>

          {pageMode ? (
            <View style={styles.pageRow}>
              <TextInput
                style={styles.pageInput}
                value={page}
                onChangeText={setPage}
                keyboardType="number-pad"
                placeholder="Page actuelle (facultatif)"
                placeholderTextColor={theme.muted}
                autoFocus
                onSubmitEditing={confirmPage}
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

          <Pressable style={styles.option} onPress={() => choose('owned')}>
            <Text style={styles.optionLabel}>Possédé</Text>
          </Pressable>

          <Pressable style={styles.option} onPress={() => choose('wishlist')}>
            <Text style={styles.optionLabel}>Wishlist</Text>
          </Pressable>

          {showRemove ? (
            <Pressable style={styles.option} onPress={() => choose('missing')}>
              <Text style={[styles.optionLabel, styles.destructive]}>Supprimer</Text>
            </Pressable>
          ) : null}

          <Pressable style={styles.cancel} onPress={close}>
            <Text style={styles.cancelText}>Annuler</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { flex: 1, backgroundColor: 'rgba(15,34,45,0.45)' },
  sheet: {
    backgroundColor: theme.bg,
    borderTopLeftRadius: theme.radiusLg,
    borderTopRightRadius: theme.radiusLg,
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  title: { fontFamily: theme.font.extrabold, fontSize: 20, color: theme.ink },
  subtitle: { fontFamily: theme.font.medium, fontSize: 13, color: theme.sub, marginTop: -4 },
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
