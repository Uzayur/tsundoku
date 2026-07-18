import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ALL_GENRES } from '~/src/lib/genres';
import { theme } from '~/src/theme/theme';

// Accent- and case-insensitive so "epique" finds "Épique". NFD splits accented
// letters into base + combining mark; we drop the combining marks (U+0300–U+036F)
// by code point rather than a regex literal, keeping the source ASCII-clean.
const normalize = (s: string) =>
  [...s.normalize('NFD')]
    .filter((c) => {
      const code = c.charCodeAt(0);
      return code < 0x0300 || code > 0x036f;
    })
    .join('')
    .toLowerCase();

/**
 * Multi-select sheet over the full French genre list, with a sticky search bar.
 * Toggling is applied live (the parent persists each change), so there is no
 * separate confirm step — the sheet just closes.
 */
export function GenrePicker({
  visible,
  selected,
  onToggle,
  onClose,
}: {
  visible: boolean;
  selected: string[];
  onToggle: (genre: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const q = normalize(query.trim());
    return q ? ALL_GENRES.filter((g) => normalize(g).includes(q)) : ALL_GENRES;
  }, [query]);

  const close = () => {
    setQuery('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={close}>
      <KeyboardAvoidingView
        style={styles.wrap}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={styles.backdrop} onPress={close} />
        <View style={styles.sheet}>
          <Text style={styles.title}>Genres</Text>
          <View style={styles.search}>
            <Ionicons name="search" size={16} color={theme.muted} />
            <TextInput
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder="Rechercher un genre"
              placeholderTextColor={theme.muted}
              autoCorrect={false}
              returnKeyType="search"
            />
            {query ? (
              <Pressable onPress={() => setQuery('')} hitSlop={8}>
                <Ionicons name="close-circle" size={16} color={theme.muted} />
              </Pressable>
            ) : null}
          </View>
          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
          >
            {results.length === 0 ? (
              <Text style={styles.empty}>Aucun genre</Text>
            ) : (
              results.map((genre) => {
                const on = selected.includes(genre);
                return (
                  <Pressable
                    key={genre}
                    style={[styles.option, on && styles.optionOn]}
                    onPress={() => onToggle(genre)}
                  >
                    <Text style={[styles.optionLabel, on && styles.optionLabelOn]}>{genre}</Text>
                    {on ? <Ionicons name="checkmark" size={18} color={theme.accent} /> : null}
                  </Pressable>
                );
              })
            )}
          </ScrollView>
          <Pressable style={styles.done} onPress={close}>
            <Text style={styles.doneText}>Terminé</Text>
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
  title: { fontFamily: theme.font.extrabold, fontSize: 20, color: theme.ink, marginBottom: 4 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.line,
    borderRadius: theme.radiusSm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 12 : 4,
  },
  searchInput: {
    flex: 1,
    fontFamily: theme.font.semibold,
    fontSize: 15,
    color: theme.ink,
    padding: 0,
  },
  list: { maxHeight: 320 },
  listContent: { gap: theme.spacing.sm },
  empty: {
    fontFamily: theme.font.regular,
    fontSize: 14,
    color: theme.muted,
    textAlign: 'center',
    paddingVertical: theme.spacing.md,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.line,
    borderRadius: theme.radiusSm,
    paddingVertical: 13,
    paddingHorizontal: theme.spacing.md,
  },
  optionOn: { borderColor: theme.accent },
  optionLabel: { fontFamily: theme.font.semibold, fontSize: 15, color: theme.ink },
  optionLabelOn: { color: theme.accent },
  done: {
    backgroundColor: theme.ink,
    borderRadius: theme.radiusSm,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: theme.spacing.xs,
  },
  doneText: { fontFamily: theme.font.semibold, fontSize: 15, color: theme.beige },
});
