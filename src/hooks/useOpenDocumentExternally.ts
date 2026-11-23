import { useCallback } from 'react';
import { Alert, Platform } from 'react-native';
import { File } from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';

import { useVaultStore } from '@/store/vaultStore';
import { decryptDocument } from '@/storage/documentManager';
import type { DocumentRecord } from '@/types/document';
import { getPreviewMimeType } from '@/utils/documentMime';

export type OpenWithApp = {
  id: string;
  label: string;
  /** Android package name. Omitted means use the platform default viewer. */
  packageName?: string;
};

const VIEW_ACTION = 'android.intent.action.VIEW';
const FLAG_GRANT_READ_URI_PERMISSION = 0x00000001;

/**
 * Decrypts a vault file to a temporary cache file, then hands it to a chosen
 * app with an explicit package name. This avoids Android's long "Open with"
 * resolver list while still giving the target app temporary read access via
 * the FileProvider content:// URI.
 */
export function useOpenDocumentExternally() {
  const vaultKey = useVaultStore((state) => state.vaultKey);

  return useCallback(
    async (doc: DocumentRecord, app?: OpenWithApp) => {
      if (!vaultKey) {
        Alert.alert('Vault Locked', 'Please unlock the vault first.');
        return false;
      }

      const { ephemeralUri } = await decryptDocument(vaultKey, doc);
      const file = new File(ephemeralUri);
      const mimeType = getPreviewMimeType(doc);

      if (Platform.OS === 'android' && app?.packageName) {
        await IntentLauncher.startActivityAsync(VIEW_ACTION, {
          data: file.contentUri || file.uri,
          type: mimeType,
          packageName: app.packageName,
          flags: FLAG_GRANT_READ_URI_PERMISSION,
        });
        return true;
      }

      // iOS / web fallback: platform preview (Quick Look on iOS).
      await file.preview({ mimeType, title: doc.name });
      return true;
    },
    [vaultKey]
  );
}
