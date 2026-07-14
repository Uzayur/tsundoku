import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SeriesSearchResult } from '~/src/api/anilist';
import { Cover } from '~/src/components/ui/Cover';
import { SectionTitle } from '~/src/components/ui/SectionTitle';
import { SeriesType } from '~/src/db/models';
import { useLibrary } from '~/src/store/useLibrary';
import { theme } from '~/src/theme/theme';

const TYPE_LABELS: Record<SeriesType, string> = {
  manga: 'Manga',
  novel: 'Roman',
  bd: 'BD',
  comic: 'Comics',
};

type AddOption = {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  title: string;
  desc: string;
  onPress: () => void;
};

export default function AddScreen() {
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);
  const [query, setQuery] = useState('');

  const searchResults = useLibrary((s) => s.searchResults);
  const searching = useLibrary((s) => s.searching);
  const searchError = useLibrary((s) => s.searchError);
  const search = useLibrary((s) => s.search);
  const addSeries = useLibrary((s) => s.addSeries);

  const focusSearch = () => inputRef.current?.focus();

  const options: AddOption[] = [
    {
      key: 'scan',
      icon: 'barcode-outline',
      color: theme.accent,
      title: 'Scanner un ISBN',
      desc: 'Vise le code-barres au dos du livre',
      onPress: () => router.push('/scan'),
    },
    {
      key: 'title',
      icon: 'search',
      color: theme.ink,
      title: 'Rechercher par titre',
      desc: '« jujutsu kaisen », « le nom du vent »…',
      onPress: focusSearch,
    },
    {
      key: 'series',
      icon: 'library-outline',
      color: theme.muted,
      title: 'Ajouter une série entière',
      desc: "Importe les tomes d'un coup (AniList)",
      onPress: focusSearch,
    },
    {
      key: 'manual',
      icon: 'create-outline',
      color: theme.inkHover,
      title: 'Saisie manuelle',
      desc: 'Pour les éditions introuvables',
      onPress: () => Alert.alert('Bientôt', 'La saisie manuelle arrive prochainement.'),
    },
  ];

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
        <Text style={styles.headerTitle}>Ajouter</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.tiles}>
          {options.map((opt) => (
            <Pressable key={opt.key} style={styles.tile} onPress={opt.onPress}>
              <View style={[styles.iconBox, { backgroundColor: opt.color }]}>
                <Ionicons name={opt.icon} size={22} color={theme.surface} />
              </View>
              <View style={styles.tileText}>
                <Text style={styles.tileTitle}>{opt.title}</Text>
                <Text style={styles.tileDesc}>{opt.desc}</Text>
              </View>
            </Pressable>
          ))}
        </View>

        <View style={styles.searchbar}>
          <Ionicons name="search" size={18} color={theme.muted} />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => search(query)}
            placeholder="Rechercher un titre…"
            placeholderTextColor={theme.muted}
            returnKeyType="search"
          />
        </View>

        {searching ? <ActivityIndicator color={theme.accent} style={styles.spinner} /> : null}
        {searchError ? <Text style={styles.error}>{searchError}</Text> : null}

        {searchResults.length > 0 ? (
          <>
            <SectionTitle>Résultats</SectionTitle>
            <View style={styles.results}>
              {searchResults.map((item) => (
                <Pressable
                  key={item.anilistId}
                  style={styles.result}
                  onPress={() => onImport(item)}
                >
                  <Cover
                    size="sm"
                    seed={item.anilistId}
                    coverUrl={item.series.coverUrl}
                    title={item.series.title}
                  />
                  <View style={styles.resultInfo}>
                    <Text style={styles.resultTitle} numberOfLines={1}>
                      {item.series.title}
                    </Text>
                    <Text style={styles.resultMeta} numberOfLines={1}>
                      {`${item.series.author ? `${item.series.author} · ` : ''}${
                        item.series.totalVolumes ?? '?'
                      } tomes · ${TYPE_LABELS[item.series.type]}`}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={theme.muted} />
                </Pressable>
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.screenPadX,
    paddingVertical: theme.spacing.md,
  },
  headerTitle: { fontFamily: theme.font.bold, fontSize: 22, color: theme.ink },
  content: {
    paddingHorizontal: theme.screenPadX,
    paddingBottom: theme.spacing.xl,
  },
  tiles: { gap: 11 },
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.line,
    borderRadius: theme.radiusLg,
    padding: theme.spacing.md,
  },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileText: { flex: 1, gap: 2 },
  tileTitle: { fontFamily: theme.font.bold, fontSize: 15, color: theme.ink },
  tileDesc: { fontFamily: theme.font.medium, fontSize: 12, color: theme.sub },
  searchbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.line,
    borderRadius: theme.radiusSm,
    paddingVertical: 13,
    paddingHorizontal: 14,
    marginTop: theme.spacing.lg,
  },
  searchInput: {
    flex: 1,
    fontFamily: theme.font.medium,
    fontSize: 14,
    color: theme.ink,
    padding: 0,
  },
  spinner: { marginTop: theme.spacing.lg },
  error: {
    fontFamily: theme.font.medium,
    color: theme.accent,
    textAlign: 'center',
    marginTop: theme.spacing.lg,
  },
  results: { gap: 11 },
  result: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.line,
    borderRadius: theme.radiusLg,
    padding: theme.spacing.md,
  },
  resultInfo: { flex: 1, gap: 2 },
  resultTitle: { fontFamily: theme.font.semibold, fontSize: 15, color: theme.ink },
  resultMeta: { fontFamily: theme.font.medium, fontSize: 12, color: theme.muted },
});
