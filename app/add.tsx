import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SeriesSearchResult } from '~/src/api/anilist';
import { useLibrary } from '~/src/store/useLibrary';
import { theme } from '~/src/theme/theme';

export default function AddScreen() {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const searchResults = useLibrary((s) => s.searchResults);
  const searching = useLibrary((s) => s.searching);
  const searchError = useLibrary((s) => s.searchError);
  const search = useLibrary((s) => s.search);
  const addSeries = useLibrary((s) => s.addSeries);

  const onImport = async (result: SeriesSearchResult) => {
    const id = await addSeries(result.series);
    router.replace({ pathname: '/series/[id]', params: { id } });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={theme.ink} />
        </Pressable>
        <Text style={styles.title}>Ajouter une série</Text>
        <Pressable onPress={() => router.push('/scan')} hitSlop={12}>
          <Ionicons name="barcode-outline" size={26} color={theme.accent} />
        </Pressable>
      </View>

      <TextInput
        style={styles.input}
        placeholder="Rechercher un titre…"
        placeholderTextColor={theme.muted}
        value={query}
        onChangeText={setQuery}
        onSubmitEditing={() => search(query)}
        returnKeyType="search"
        autoFocus
      />

      {searching ? <ActivityIndicator color={theme.accent} style={styles.spinner} /> : null}
      {searchError ? <Text style={styles.error}>{searchError}</Text> : null}

      <FlatList
        data={searchResults}
        keyExtractor={(item) => String(item.anilistId)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.result}>
            <View style={styles.info}>
              <Text style={styles.resultTitle} numberOfLines={1}>
                {item.series.title}
              </Text>
              <Text style={styles.resultMeta}>
                {item.series.type}
                {item.series.totalVolumes ? ` · ${item.series.totalVolumes} tomes` : ''}
              </Text>
            </View>
            <Pressable style={styles.importBtn} onPress={() => onImport(item)}>
              <Text style={styles.importText}>Ajouter</Text>
            </Pressable>
          </View>
        )}
        ListEmptyComponent={
          !searching && !searchError ? (
            <Text style={styles.hint}>Cherchez un manga ou un roman à ajouter.</Text>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  title: { flex: 1, fontFamily: theme.font.bold, fontSize: 22, color: theme.ink },
  input: {
    marginHorizontal: theme.spacing.lg,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.line,
    borderRadius: theme.radiusSm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontFamily: theme.font.regular,
    fontSize: 16,
    color: theme.ink,
  },
  spinner: { marginTop: theme.spacing.lg },
  error: {
    fontFamily: theme.font.regular,
    color: theme.accent,
    textAlign: 'center',
    marginTop: theme.spacing.lg,
  },
  list: { padding: theme.spacing.lg, gap: theme.spacing.sm },
  result: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surface,
    borderRadius: theme.radiusLg,
    borderWidth: 1,
    borderColor: theme.line,
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  info: { flex: 1, gap: 2 },
  resultTitle: { fontFamily: theme.font.semibold, fontSize: 15, color: theme.ink },
  resultMeta: { fontFamily: theme.font.regular, fontSize: 13, color: theme.muted },
  importBtn: {
    backgroundColor: theme.accent,
    borderRadius: theme.radiusSm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  importText: { fontFamily: theme.font.semibold, fontSize: 13, color: theme.surface },
  hint: {
    fontFamily: theme.font.regular,
    color: theme.muted,
    textAlign: 'center',
    marginTop: theme.spacing.xl,
  },
});
