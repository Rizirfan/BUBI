import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Cloud,
  Download,
  FileSpreadsheet,
  FileText,
  Folder,
  Image as ImageIcon,
  Share2,
  X,
  type LucideIcon,
} from 'lucide-react-native';

import { BrandColors, SoftShadows } from '@/constants/theme';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { getDocumentKindMeta } from '@/components/ui/DocumentTypeIcon';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useDocumentExport, type ExportMode } from '@/hooks/useDocumentExport';
import {
  useOpenDocumentExternally,
  type OpenWithApp,
} from '@/hooks/useOpenDocumentExternally';
import { purgePreviewCache } from '@/storage/documentManager';
import type { DocumentRecord } from '@/types/document';

interface OpenWithSheetProps {
  document: DocumentRecord | null;
  visible: boolean;
  onClose: () => void;
}

type AppOption = OpenWithApp & {
  icon: LucideIcon;
  hint: string;
  color: string;
};

const DOCS_APP: AppOption = {
  id: 'docs',
  label: 'Docs',
  packageName: 'com.google.android.apps.docs.editors.docs',
  icon: FileText,
  hint: 'Google Docs',
  color: '#4285F4',
};

const SHEETS_APP: AppOption = {
  id: 'sheets',
  label: 'Sheets',
  packageName: 'com.google.android.apps.docs.editors.sheets',
  icon: FileSpreadsheet,
  hint: 'Google Sheets',
  color: '#0F9D58',
};

const DRIVE_APP: AppOption = {
  id: 'drive',
  label: 'Drive',
  packageName: 'com.google.android.apps.docs',
  icon: Cloud,
  hint: 'Google Drive',
  color: '#FFBA00',
};

const FILES_APP: AppOption = {
  id: 'files',
  label: 'Files',
  packageName: 'com.google.android.documentsui',
  icon: Folder,
  hint: 'File manager',
  color: '#FF7A00',
};

const PHOTOS_APP: AppOption = {
  id: 'photos',
  label: 'Photos',
  packageName: 'com.google.android.apps.photos',
  icon: ImageIcon,
  hint: 'Photos / Gallery',
  color: '#EA4335',
};

function getOptions(document: DocumentRecord): AppOption[] {
  const kind = getDocumentKindMeta(document).kind;
  if (kind === 'image' || kind === 'video') {
    return [PHOTOS_APP, DRIVE_APP, FILES_APP];
  }
  return [DOCS_APP, SHEETS_APP, DRIVE_APP, FILES_APP];
}

export const OpenWithSheet: React.FC<OpenWithSheetProps> = ({
  document,
  visible,
  onClose,
}) => {
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === 'dark';
  const openDocument = useOpenDocumentExternally();
  const exportDocument = useDocumentExport();
  const [busy, setBusy] = useState(false);
  const didLaunch = useRef(false);

  const options = useMemo(
    () => (document ? getOptions(document) : []),
    [document]
  );

  useEffect(() => {
    if (visible && document) {
      didLaunch.current = false;
    }
  }, [visible, document]);

  const handleClose = async () => {
    if (busy) return;
    if (!didLaunch.current) {
      await purgePreviewCache();
    }
    didLaunch.current = false;
    onClose();
  };

  const handleSelect = async (app: AppOption) => {
    if (!document || busy) return;
    setBusy(true);
    try {
      const launched = await openDocument(document, app);
      if (launched) {
        didLaunch.current = true;
        onClose();
      }
    } catch {
      Alert.alert(
        'App not available',
        `${app.label} is not installed or cannot open this file.`
      );
    } finally {
      setBusy(false);
    }
  };

  const handleExport = async (mode: ExportMode) => {
    if (!document || busy) return;
    setBusy(true);
    try {
      const result = await exportDocument(document, mode);
      if (result === 'shared' || result === 'downloaded') {
        // Keep the exported cache file until the OS has copied it. It is purged
        // on vault lock (or the next action sheet close without a hand-off).
        didLaunch.current = true;
        onClose();
      }
    } catch (error) {
      Alert.alert(
        mode === 'share' ? 'Could not share file' : 'Could not download file',
        error instanceof Error ? error.message : 'Please try again.'
      );
    } finally {
      setBusy(false);
    }
  };

  if (!document) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}>
      <StatusBar style="light" />
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropPress} onPress={handleClose} />

        <View
          style={[
            styles.sheet,
            isDark && styles.sheetDark,
            { paddingBottom: insets.bottom + 16 },
          ]}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={[styles.title, isDark && styles.textPrimaryDark]}>
                File actions
              </Text>
              <Text
                style={[styles.subtitle, isDark && styles.textSecondaryDark]}
                numberOfLines={1}>
                {document.name}
              </Text>
            </View>
            <AnimatedPressable
              style={[styles.closeBtn, isDark && styles.closeBtnDark]}
              scaleTo={0.9}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Close"
              onPress={handleClose}>
              <X size={16} color={isDark ? '#C4B8B0' : '#78716C'} />
            </AnimatedPressable>
          </View>

          <Text style={[styles.sectionLabel, isDark && styles.textSecondaryDark]}>
            SAVE &amp; SHARE
          </Text>
          <View style={styles.options}>
            <AnimatedPressable
              style={[styles.option, isDark && styles.optionDark]}
              scaleTo={0.98}
              disabled={busy}
              accessibilityLabel="Download file"
              onPress={() => handleExport('download')}>
              <View style={[styles.iconWrap, { backgroundColor: '#0596691A' }]}>
                <Download size={20} color="#059669" strokeWidth={2.2} />
              </View>
              <View style={styles.optionText}>
                <Text style={[styles.optionTitle, isDark && styles.textPrimaryDark]}>
                  Download
                </Text>
                <Text style={[styles.optionHint, isDark && styles.textSecondaryDark]}>
                  Save with the original file name
                </Text>
              </View>
              {busy && <ActivityIndicator size="small" color={BrandColors.primary} />}
            </AnimatedPressable>

            <AnimatedPressable
              style={[styles.option, isDark && styles.optionDark]}
              scaleTo={0.98}
              disabled={busy}
              accessibilityLabel="Share file"
              onPress={() => handleExport('share')}>
              <View style={[styles.iconWrap, { backgroundColor: '#2563EB1A' }]}>
                <Share2 size={20} color="#2563EB" strokeWidth={2.2} />
              </View>
              <View style={styles.optionText}>
                <Text style={[styles.optionTitle, isDark && styles.textPrimaryDark]}>
                  Share
                </Text>
                <Text style={[styles.optionHint, isDark && styles.textSecondaryDark]}>
                  Send this file to another app
                </Text>
              </View>
              {busy && <ActivityIndicator size="small" color={BrandColors.primary} />}
            </AnimatedPressable>
          </View>

          <Text
            style={[
              styles.sectionLabel,
              styles.sectionLabelSpaced,
              isDark && styles.textSecondaryDark,
            ]}>
            OPEN WITH
          </Text>
          <View style={styles.options}>
            {options.map((app) => {
              const Icon = app.icon;
              return (
                <AnimatedPressable
                  key={app.id}
                  style={[styles.option, isDark && styles.optionDark]}
                  scaleTo={0.98}
                  disabled={busy}
                  accessibilityLabel={`Open with ${app.label}`}
                  onPress={() => handleSelect(app)}>
                  <View style={[styles.iconWrap, { backgroundColor: `${app.color}1A` }]}>
                    <Icon size={20} color={app.color} strokeWidth={2.2} />
                  </View>
                  <View style={styles.optionText}>
                    <Text style={[styles.optionTitle, isDark && styles.textPrimaryDark]}>
                      {app.label}
                    </Text>
                    <Text style={[styles.optionHint, isDark && styles.textSecondaryDark]}>
                      {app.hint}
                    </Text>
                  </View>
                  {busy && <ActivityIndicator size="small" color={BrandColors.primary} />}
                </AnimatedPressable>
              );
            })}
          </View>

          <Text style={[styles.note, isDark && styles.textSecondaryDark]}>
            Only installed apps that support this file can open it.
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(10, 6, 4, 0.55)',
  },
  backdropPress: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheet: {
    backgroundColor: '#FFFDFB',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    ...SoftShadows.floating,
  },
  sheetDark: {
    backgroundColor: '#17120F',
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E7DDD6',
    alignSelf: 'center',
    marginBottom: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerText: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1C1917',
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 12,
    color: '#8C857E',
    marginTop: 2,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F1EE',
  },
  closeBtnDark: {
    backgroundColor: '#261C16',
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    color: '#A8A29E',
    marginBottom: 8,
  },
  sectionLabelSpaced: {
    marginTop: 18,
  },
  options: {
    gap: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0E6DF',
  },
  optionDark: {
    backgroundColor: '#1F1814',
    borderColor: '#36261E',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1C1917',
  },
  optionHint: {
    fontSize: 11,
    color: '#8C857E',
    marginTop: 1,
  },
  note: {
    fontSize: 11,
    color: '#A8A29E',
    textAlign: 'center',
    marginTop: 14,
  },
  textPrimaryDark: {
    color: '#FFFDFB',
  },
  textSecondaryDark: {
    color: '#A8A29E',
  },
});
