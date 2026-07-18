import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BookMetadata, lookupIsbn } from '~/src/api/isbn';
import { Badge, BadgeTone } from '~/src/components/ui/Badge';
import { Cover } from '~/src/components/ui/Cover';
import { VolumeSheet } from '~/src/components/ui/VolumeSheet';
import { VolumeStatus } from '~/src/db/models';
import { normalizeTitle, parseVolumeTitle } from '~/src/lib/volumeTitle';
import { SlotState, STATUS_LABEL } from '~/src/lib/volumeStatus';
import { useLibrary } from '~/src/store/useLibrary';
import { theme } from '~/src/theme/theme';

const STATUS_TONE: Record<VolumeStatus, BadgeTone> = {
  read: 'read',
  reading: 'reading',
  owned: 'owned',
  wishlist: 'wish',
};

export default function ScanScreen() {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const addBook = useLibrary((s) => s.addBook);
  const series = useLibrary((s) => s.series);
  const volumesBySeriesId = useLibrary((s) => s.volumesBySeriesId);

  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<BookMetadata | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [added, setAdded] = useState<string | null>(null);
  const handled = useRef(false);
  const addedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onScanned = async (isbn: string) => {
    if (handled.current) return;
    handled.current = true;
    setBusy(true);
    // Look the book up, but do NOT save it: the scan only produces a preview the
    // user confirms with an explicit status before anything hits the library.
    const meta: BookMetadata = (await lookupIsbn(isbn)) ?? {
      isbn,
      title: null,
      pageCount: null,
      coverUrl: null,
      authors: [],
      genres: [],
      description: null,
      publisher: null,
      publishedYear: null,
    };
    setBusy(false);
    setPreview(meta);
  };

  // Clear the preview and re-arm the camera for the next book.
  const rearm = () => {
    setPreview(null);
    setSheetOpen(false);
    handled.current = false;
  };

  const save = (status: VolumeStatus, currentPage?: number) => {
    if (!preview) return;
    const meta = preview;
    const label = meta.title ?? meta.isbn;
    const { number } = parseVolumeTitle(meta.title ?? meta.isbn);
    // Close the sheet and return to the scanner right away; the write and its
    // DB reload finish in the background so the modal never lingers.
    rearm();
    if (addedTimer.current) clearTimeout(addedTimer.current);
    setAdded(label);
    addedTimer.current = setTimeout(() => setAdded(null), 1800);
    // addBook fills a manga's length with a default; if the saved tome still has
    // none (a roman or other type no catalogue sized), warn so it can be added
    // from the book's page rather than silently counting as zero pages.
    void addBook(meta, status, currentPage).then((seriesId) => {
      const saved = (useLibrary.getState().volumesBySeriesId[seriesId] ?? []).find(
        (v) => v.number === (number ?? 1),
      );
      if (saved && saved.pageCount == null) {
        Alert.alert(
          'Nombre de pages inconnu',
          `« ${label} » a été ajouté, mais son nombre de pages est introuvable. Vous pourrez le renseigner depuis la fiche du livre.`,
        );
      }
    });
  };

  const onSelect = (target: SlotState) => {
    // 'missing' can't occur here (the sheet hides "Supprimer" while adding); the
    // rest — including a page-less "En cours" — map straight onto a volume status.
    if (target !== 'missing') save(target);
  };

  const previewTitle = preview?.title ?? preview?.isbn ?? '';
  const previewAuthor = preview?.authors[0] ?? null;

  // Does this exact tome already sit in the library? Mirror addBook's matching
  // (normalized series title + tome number) so the preview can flag a re-scan.
  const existing = (() => {
    if (!preview) return null;
    const { baseTitle, number } = parseVolumeTitle(preview.title ?? preview.isbn);
    const key = normalizeTitle(baseTitle);
    const match = series.find((s) => normalizeTitle(s.title) === key);
    if (!match) return null;
    return (volumesBySeriesId[match.id] ?? []).find((v) => v.number === (number ?? 1)) ?? null;
  })();
  const previewMeta = preview
    ? [
        preview.publisher,
        preview.publishedYear,
        preview.pageCount ? `${preview.pageCount} p.` : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : '';

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
                <Text style={styles.help}>Recherche du livre…</Text>
              </View>
            ) : added ? (
              <Text style={styles.help}>« {added} » ajouté ✓</Text>
            ) : (
              <Text style={styles.help}>Visez le code-barres ISBN</Text>
            )}
          </View>
        )}
      </View>

      {preview ? (
        <View style={[styles.previewCard, { paddingBottom: insets.bottom + theme.spacing.md }]}>
          <View style={styles.previewRow}>
            <Cover
              title={previewTitle}
              seed={Number(preview.isbn.replace(/\D/g, '')) || 0}
              coverUrl={preview.coverUrl}
              size="sm"
            />
            <View style={styles.previewInfo}>
              <Text style={styles.previewTitle} numberOfLines={2}>
                {previewTitle}
              </Text>
              {previewAuthor ? (
                <Text style={styles.previewAuthor} numberOfLines={1}>
                  {previewAuthor}
                </Text>
              ) : null}
              {previewMeta ? (
                <Text style={styles.previewMeta} numberOfLines={1}>
                  {previewMeta}
                </Text>
              ) : null}
              {existing ? (
                <View style={styles.previewBadge}>
                  <Badge
                    label={`Déjà dans ta bibliothèque · ${STATUS_LABEL[existing.status]}`}
                    tone={STATUS_TONE[existing.status]}
                  />
                </View>
              ) : null}
            </View>
          </View>

          <Pressable style={styles.addBtn} onPress={() => setSheetOpen(true)}>
            <Text style={styles.addText}>Ajouter à ma bibliothèque</Text>
          </Pressable>
          <Pressable style={styles.skipBtn} onPress={rearm}>
            <Text style={styles.skipText}>Scanner un autre</Text>
          </Pressable>
        </View>
      ) : null}

      <VolumeSheet
        visible={sheetOpen}
        title={previewTitle || 'Ce livre'}
        subtitle={previewAuthor ?? undefined}
        showRemove={false}
        onClose={() => setSheetOpen(false)}
        onSelect={onSelect}
        onSetPage={(page) => save('reading', page)}
      />
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
  previewCard: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.bg,
    borderTopLeftRadius: theme.radiusLg,
    borderTopRightRadius: theme.radiusLg,
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  previewRow: { flexDirection: 'row', gap: theme.spacing.md },
  previewInfo: { flex: 1, justifyContent: 'center', gap: 3 },
  previewTitle: { fontFamily: theme.font.bold, fontSize: 17, color: theme.ink },
  previewAuthor: { fontFamily: theme.font.medium, fontSize: 13, color: theme.sub },
  previewMeta: { fontFamily: theme.font.regular, fontSize: 12, color: theme.muted },
  previewBadge: { marginTop: 4 },
  addBtn: {
    backgroundColor: theme.accent,
    borderRadius: theme.radiusSm,
    paddingVertical: 14,
    alignItems: 'center',
  },
  addText: { fontFamily: theme.font.semibold, fontSize: 15, color: theme.beige },
  skipBtn: { alignItems: 'center', paddingVertical: 8 },
  skipText: { fontFamily: theme.font.semibold, fontSize: 14, color: theme.muted },
});
