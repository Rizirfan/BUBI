import { useCallback } from 'react';
import { Alert, Platform } from 'react-native';
import * as Sharing from 'expo-sharing';
import * as LegacyFileSystem from 'expo-file-system/legacy';

import { useVaultStore } from '@/store/vaultStore';
import { prepareDocumentExport } from '@/storage/documentManager';
import type { DocumentRecord } from '@/types/document';
import { getPreviewMimeType } from '@/utils/documentMime';

export type ExportMode = 'share' | 'download';
export type ExportResult = 'shared' | 'downloaded' | 'cancelled' | 'unavailable';

/**
 * Decrypts a vault document to a cache file that keeps its original file name,
 * then hands it to the platform share sheet or writes it to a folder the user
 * picks. Nothing is written in plain text outside the temporary preview cache.
 */
export function useDocumentExport() {
  const vaultKey = useVaultStore((state) => state.vaultKey);

  return useCallback(
    async (doc: DocumentRecord, mode: ExportMode): Promise<ExportResult> => {
      if (!vaultKey) {
        Alert.alert('Vault Locked', 'Please unlock the vault first.');
        return 'unavailable';
      }

      if (Platform.OS === 'web') {
        Alert.alert('Unavailable', 'Exporting files is only available on mobile.');
        return 'unavailable';
      }

      const { file, fileName, base64 } = await prepareDocumentExport(vaultKey, doc);
      const resolvedMimeType = getPreviewMimeType(doc);
      const mimeType = resolvedMimeType === '*/*' ? undefined : resolvedMimeType;

      if (mode === 'share') {
        if (!(await Sharing.isAvailableAsync())) {
          Alert.alert('Unavailable', 'Sharing is not supported on this device.');
          return 'unavailable';
        }

        await Sharing.shareAsync(file.uri, {
          mimeType,
          dialogTitle: `Share ${fileName}`,
        });
        return 'shared';
      }

      if (Platform.OS === 'android') {
        const permissions =
          await LegacyFileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (!permissions.granted) {
          return 'cancelled';
        }

        // Pass the full original name so SAF keeps its exact name and extension.
        const destinationUri = await LegacyFileSystem.StorageAccessFramework.createFileAsync(
          permissions.directoryUri,
          fileName,
          mimeType ?? 'application/octet-stream'
        );
        await LegacyFileSystem.writeAsStringAsync(destinationUri, base64, {
          encoding: LegacyFileSystem.EncodingType.Base64,
        });

        Alert.alert('Downloaded', `${fileName} was saved to the folder you selected.`);
        return 'downloaded';
      }

      // iOS sandboxes do not allow writing to arbitrary folders. The share
      // sheet's "Save to Files" action is the supported download path.
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Unavailable', 'Saving files is not supported on this device.');
        return 'unavailable';
      }

      await Sharing.shareAsync(file.uri, {
        mimeType,
        dialogTitle: `Save ${fileName}`,
      });
      return 'downloaded';
    },
    [vaultKey]
  );
}
