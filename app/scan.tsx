import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BookMetadata, lookupIsbn } from '~/src/api/isbn';
import { Badge } from '~/src/components/ui/Badge';
import { Cover } from '~/src/components/ui/Cover';
import { useLibrary } from '~/src/store/useLibrary';
import { theme } from '~/src/theme/theme';

export default function ScanScreen() {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const addBook = useLibrary((s) => s.addBook);

  const [busy, setBusy] = useState(false);
  const [book, setBook] = useState<BookMetadata | null>(null);
  const [added, setAdded] = useState(false);

  const onScanned = async (isbn: string) => {
    if (busy || book) return;
    setBusy(true);
    try {
      const result = await lookupIsbn(isbn);
      setBook(result ?? { isbn, title: null, pageCount: null, coverUrl: null, authors: [] });
    } finally {
      setBusy(false);
    }
  };

  const onConfirm = async () => {
    if (!book || added) return;
    setAdded(true);
    const id = await addBook(book);
    router.replace({ pathname: '/series/[id]', params: { id } });
  };

  return (
    <View style={styles.container}>
      {permission?.granted ? (
        <CameraView
          style={StyleSheet.absoluteFill}
          barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8'] }}
          onBarcodeScanned={({ data }) => onScanned(data)}
        />
      ) : null}

      <View style={styles.overlay}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={[styles.close, { top: insets.top + theme.spacing.md }]}
        >
          <Text style={styles.closeText}>✕ Fermer</Text>
        </Pressable>

        {!permission ? (
          <View style={styles.center}>
            <Text style={styles.help}>Chargement de la caméra…</Text>
          </View>
        ) : !permission.granted ? (
          <View style={styles.center}>
            <Text style={styles.help}>Autorisez la caméra pour scanner les codes-barres.</Text>
            <Pressable style={styles.primaryBtn} onPress={requestPermission}>
              <Text style={styles.primaryText}>Autoriser la caméra</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.reticleWrap}>
              <View style={styles.reticle}>
                <View style={styles.scanLine} />
              </View>
              <Text style={styles.help}>Visez le code-barres ISBN</Text>
            </View>

            {book ? (
              <View
                style={[styles.confirmCard, { paddingBottom: insets.bottom + theme.spacing.md }]}
              >
                <View style={styles.confirmRow}>
                  <Cover
                    size="sm"
                    seed={book.isbn.length}
                    coverUrl={book.coverUrl}
                    title={book.title ?? book.isbn}
                  />
                  <View style={styles.confirmInfo}>
                    <Text style={styles.confirmTitle} numberOfLines={2}>
                      {book.title ?? 'Titre inconnu'}
                    </Text>
                    <Text style={styles.confirmMeta}>
                      {`ISBN ${book.isbn}${book.pageCount ? ` · ${book.pageCount} p.` : ''}`}
                    </Text>
                  </View>
                </View>
                <Pressable style={styles.confirmBtn} onPress={onConfirm}>
                  <Badge tone="read" label="Ajouté ✓" />
                </Pressable>
              </View>
            ) : null}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.ink },
  overlay: { ...StyleSheet.absoluteFillObject },
  close: {
    position: 'absolute',
    left: theme.screenPadX,
    zIndex: 2,
  },
  closeText: { fontFamily: theme.font.bold, fontSize: 15, color: theme.beige },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
  },
  reticleWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.lg,
  },
  reticle: {
    width: 250,
    height: 150,
    borderWidth: 2,
    borderColor: theme.beige,
    borderRadius: 14,
    justifyContent: 'center',
  },
  scanLine: {
    height: 2,
    backgroundColor: theme.accent,
    marginHorizontal: 14,
  },
  help: {
    fontFamily: theme.font.medium,
    fontSize: 14,
    color: theme.beige,
    textAlign: 'center',
  },
  confirmCard: {
    backgroundColor: theme.surface,
    borderTopLeftRadius: theme.radiusLg,
    borderTopRightRadius: theme.radiusLg,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  confirmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  confirmInfo: { flex: 1, gap: 4 },
  confirmTitle: { fontFamily: theme.font.bold, fontSize: 16, color: theme.ink },
  confirmMeta: { fontFamily: theme.font.medium, fontSize: 13, color: theme.muted },
  confirmBtn: {
    backgroundColor: theme.surface2,
    borderWidth: 1,
    borderColor: theme.line,
    borderRadius: theme.radiusSm,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryBtn: {
    backgroundColor: theme.ink,
    borderRadius: theme.radiusSm,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 12,
  },
  primaryText: { fontFamily: theme.font.semibold, fontSize: 14, color: theme.beige },
});
