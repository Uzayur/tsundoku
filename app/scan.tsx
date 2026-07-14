import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { lookupIsbn } from '~/src/api/isbn';
import { useLibrary } from '~/src/store/useLibrary';
import { theme } from '~/src/theme/theme';

export default function ScanScreen() {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const addBook = useLibrary((s) => s.addBook);

  const [busy, setBusy] = useState(false);
  const handled = useRef(false);

  const onScanned = async (isbn: string) => {
    if (handled.current) return;
    handled.current = true;
    setBusy(true);
    const meta = (await lookupIsbn(isbn)) ?? {
      isbn,
      title: null,
      pageCount: null,
      coverUrl: null,
      authors: [],
    };
    const id = await addBook(meta);
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
          <View style={styles.reticleWrap}>
            <View style={styles.reticle}>
              <View style={styles.scanLine} />
            </View>
            {busy ? (
              <View style={styles.busy}>
                <ActivityIndicator color={theme.beige} />
                <Text style={styles.help}>Ajout du livre…</Text>
              </View>
            ) : (
              <Text style={styles.help}>Visez le code-barres ISBN</Text>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.ink },
  overlay: { ...StyleSheet.absoluteFillObject },
  close: { position: 'absolute', left: theme.screenPadX, zIndex: 2 },
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
  scanLine: { height: 2, backgroundColor: theme.accent, marginHorizontal: 14 },
  busy: { alignItems: 'center', gap: theme.spacing.sm },
  help: { fontFamily: theme.font.medium, fontSize: 14, color: theme.beige, textAlign: 'center' },
  primaryBtn: {
    backgroundColor: theme.beige,
    borderRadius: theme.radiusSm,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 12,
  },
  primaryText: { fontFamily: theme.font.semibold, fontSize: 14, color: theme.ink },
});
