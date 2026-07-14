import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BookMetadata, lookupIsbn } from '~/src/api/isbn';
import { useLibrary } from '~/src/store/useLibrary';
import { theme } from '~/src/theme/theme';

export default function ScanScreen() {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const addBook = useLibrary((s) => s.addBook);

  const [busy, setBusy] = useState(false);
  const [book, setBook] = useState<BookMetadata | null>(null);
  const [notFound, setNotFound] = useState(false);

  const onScanned = async (isbn: string) => {
    if (busy || book) return;
    setBusy(true);
    setNotFound(false);
    try {
      const result = await lookupIsbn(isbn);
      if (result) {
        setBook(result);
      } else {
        setBook({ isbn, title: null, pageCount: null, coverUrl: null, authors: [] });
        setNotFound(true);
      }
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setBook(null);
    setNotFound(false);
  };

  const onAdd = async () => {
    if (!book) return;
    const id = await addBook(book);
    router.replace({ pathname: '/series/[id]', params: { id } });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={theme.ink} />
        </Pressable>
        <Text style={styles.title}>Scanner un code-barres</Text>
      </View>

      {!permission ? (
        <Text style={styles.hint}>Chargement de la caméra…</Text>
      ) : !permission.granted ? (
        <View style={styles.center}>
          <Text style={styles.hint}>Autorisez la caméra pour scanner les codes-barres.</Text>
          <Pressable style={styles.primaryBtn} onPress={requestPermission}>
            <Text style={styles.primaryText}>Autoriser la caméra</Text>
          </Pressable>
        </View>
      ) : book ? (
        <View style={styles.result}>
          <Text style={styles.resultTitle}>{book.title ?? 'Titre inconnu'}</Text>
          {notFound ? (
            <Text style={styles.resultMeta}>ISBN {book.isbn} — non trouvé, ajout manuel</Text>
          ) : (
            <Text style={styles.resultMeta}>
              {book.authors.join(', ') || 'Auteur inconnu'}
              {book.pageCount ? ` · ${book.pageCount} pages` : ''}
            </Text>
          )}
          <View style={styles.actions}>
            <Pressable style={styles.secondaryBtn} onPress={reset}>
              <Text style={styles.secondaryText}>Scanner à nouveau</Text>
            </Pressable>
            <Pressable style={styles.primaryBtn} onPress={onAdd}>
              <Text style={styles.primaryText}>Ajouter</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={styles.cameraWrap}>
          <CameraView
            style={StyleSheet.absoluteFill}
            barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8'] }}
            onBarcodeScanned={({ data }) => onScanned(data)}
          />
          <View style={styles.reticle} />
          {busy ? (
            <View style={styles.busy}>
              <ActivityIndicator color={theme.surface} />
            </View>
          ) : null}
          <Text style={styles.scanHint}>Visez le code-barres au dos du livre</Text>
        </View>
      )}
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing.md },
  hint: {
    fontFamily: theme.font.regular,
    color: theme.muted,
    textAlign: 'center',
    marginTop: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
  },
  cameraWrap: {
    flex: 1,
    margin: theme.spacing.lg,
    borderRadius: theme.radiusLg,
    overflow: 'hidden',
  },
  reticle: {
    position: 'absolute',
    top: '35%',
    left: '15%',
    right: '15%',
    height: 120,
    borderWidth: 2,
    borderColor: theme.accent,
    borderRadius: theme.radiusSm,
  },
  busy: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  scanHint: {
    position: 'absolute',
    bottom: theme.spacing.lg,
    alignSelf: 'center',
    fontFamily: theme.font.medium,
    color: theme.surface,
    backgroundColor: '#0f222dcc',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radiusSm,
    overflow: 'hidden',
  },
  result: { padding: theme.spacing.lg, gap: theme.spacing.sm },
  resultTitle: { fontFamily: theme.font.bold, fontSize: 20, color: theme.ink },
  resultMeta: { fontFamily: theme.font.regular, fontSize: 14, color: theme.muted },
  actions: { flexDirection: 'row', gap: theme.spacing.md, marginTop: theme.spacing.md },
  primaryBtn: {
    backgroundColor: theme.accent,
    borderRadius: theme.radiusSm,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
  primaryText: { fontFamily: theme.font.semibold, fontSize: 14, color: theme.surface },
  secondaryBtn: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.line,
    borderRadius: theme.radiusSm,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
  secondaryText: { fontFamily: theme.font.semibold, fontSize: 14, color: theme.ink },
});
