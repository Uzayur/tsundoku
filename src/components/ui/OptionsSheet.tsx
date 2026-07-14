import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '~/src/theme/theme';

export interface SheetOption {
  label: string;
  onPress: () => void;
  destructive?: boolean;
}

export function OptionsSheet({
  visible,
  title,
  options,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: SheetOption[];
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.wrap}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <Text style={styles.title}>{title}</Text>
          {options.map((o) => (
            <Pressable
              key={o.label}
              style={styles.option}
              onPress={() => {
                o.onPress();
                onClose();
              }}
            >
              <Text style={[styles.optionLabel, o.destructive && styles.destructive]}>
                {o.label}
              </Text>
            </Pressable>
          ))}
          <Pressable style={styles.cancel} onPress={onClose}>
            <Text style={styles.cancelText}>Annuler</Text>
          </Pressable>
        </View>
      </View>
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
  title: { fontFamily: theme.font.extrabold, fontSize: 20, color: theme.ink, marginBottom: 4 },
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
  cancel: { alignItems: 'center', paddingVertical: 14, marginTop: theme.spacing.xs },
  cancelText: { fontFamily: theme.font.semibold, fontSize: 15, color: theme.muted },
});
