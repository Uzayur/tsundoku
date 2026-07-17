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

import { theme } from '~/src/theme/theme';

/**
 * Asked when a tome is marked read but neither its ISBN nor the OpenLibrary
 * index knows its length — without it the tome would silently count as 0 pages.
 */
export function PagePrompt({
  visible,
  title,
  onSubmit,
  onSkip,
}: {
  visible: boolean;
  title: string;
  onSubmit: (pages: number) => void;
  onSkip: () => void;
}) {
  const [value, setValue] = useState('');

  const confirm = () => {
    const n = parseInt(value, 10);
    if (!Number.isNaN(n) && n > 0) {
      setValue('');
      onSubmit(n);
    }
  };
  const skip = () => {
    setValue('');
    onSkip();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={skip}>
      <KeyboardAvoidingView
        style={styles.wrap}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={styles.backdrop} onPress={skip} />
        <View style={styles.sheet}>
          <Text style={styles.title}>Combien de pages ?</Text>
          <Text style={styles.subtitle}>{`${title} — introuvable automatiquement`}</Text>

          <View style={styles.row}>
            <TextInput
              style={styles.input}
              value={value}
              onChangeText={setValue}
              keyboardType="number-pad"
              placeholder="ex. 192"
              placeholderTextColor={theme.muted}
              autoFocus
              onSubmitEditing={confirm}
            />
            <Pressable style={styles.btn} onPress={confirm}>
              <Text style={styles.btnText}>OK</Text>
            </Pressable>
          </View>

          <Pressable style={styles.skip} onPress={skip}>
            <Text style={styles.skipText}>Passer</Text>
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
  row: { flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.xs },
  input: {
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
  btn: {
    backgroundColor: theme.ink,
    borderRadius: theme.radiusSm,
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { fontFamily: theme.font.semibold, fontSize: 15, color: theme.beige },
  skip: { alignItems: 'center', paddingVertical: 14 },
  skipText: { fontFamily: theme.font.semibold, fontSize: 15, color: theme.muted },
});
