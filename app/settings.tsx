import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { buildBackupJson, buildCsv, parseBackupJson } from '~/src/lib/backup';
import { useLibrary } from '~/src/store/useLibrary';
import { theme } from '~/src/theme/theme';

function currentData() {
  const { series, volumesBySeriesId } = useLibrary.getState();
  return { series, volumesBySeriesId };
}

async function shareString(filename: string, contents: string) {
  const file = new File(Paths.cache, filename);
  try {
    file.create();
  } catch {
    // already exists — write() overwrites the contents
  }
  file.write(contents);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri);
  } else {
    Alert.alert('Partage indisponible', 'Le partage n’est pas disponible sur cet appareil.');
  }
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const importBackup = useLibrary((s) => s.importBackup);

  const onExportJson = async () => {
    try {
      const json = buildBackupJson(currentData(), new Date().toISOString());
      await shareString('tsundoku-backup.json', json);
    } catch {
      Alert.alert('Erreur', 'Export JSON échoué.');
    }
  };

  const onExportCsv = async () => {
    try {
      await shareString('tsundoku-collection.csv', buildCsv(currentData()));
    } catch {
      Alert.alert('Erreur', 'Export CSV échoué.');
    }
  };

  const onImport = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });
      if (res.canceled) return;
      const text = await new File(res.assets[0].uri).text();
      const data = parseBackupJson(text);
      Alert.alert('Restaurer la sauvegarde ?', 'Cela remplacera toute votre collection actuelle.', [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Restaurer',
          style: 'destructive',
          onPress: () => {
            importBackup(data).catch(() => Alert.alert('Erreur', 'Restauration échouée.'));
          },
        },
      ]);
    } catch {
      Alert.alert('Fichier invalide', 'Ce fichier n’est pas une sauvegarde Tsundoku valide.');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={theme.ink} />
        </Pressable>
        <Text style={styles.title}>Réglages</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sauvegarde</Text>
        <Row icon="download-outline" label="Exporter en JSON" onPress={onExportJson} />
        <Row icon="grid-outline" label="Exporter en CSV" onPress={onExportCsv} />
        <Row icon="cloud-upload-outline" label="Importer une sauvegarde" onPress={onImport} />
      </View>
    </View>
  );
}

function Row({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <Ionicons name={icon} size={20} color={theme.ink} />
      <Text style={styles.rowLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={theme.muted} />
    </Pressable>
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
  section: { paddingHorizontal: theme.spacing.lg, gap: theme.spacing.sm },
  sectionTitle: {
    fontFamily: theme.font.medium,
    fontSize: 13,
    color: theme.muted,
    textTransform: 'uppercase',
    marginBottom: theme.spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    backgroundColor: theme.surface,
    borderRadius: theme.radiusLg,
    borderWidth: 1,
    borderColor: theme.line,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  rowLabel: { flex: 1, fontFamily: theme.font.medium, fontSize: 15, color: theme.ink },
});
