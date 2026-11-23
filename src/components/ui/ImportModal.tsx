import React, { useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { File } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { FileUp, ImagePlus, Camera, X, ChevronRight } from 'lucide-react-native';
import { BrandColors, SoftShadows } from '../../constants/theme';
import { DocumentCategory } from '../../types/document';
import { encryptAndSaveDocument } from '../../storage/documentManager';
import { useVaultStore } from '../../store/vaultStore';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface ImportModalProps {
  visible: boolean;
  onClose: () => void;
  initialCategory?: DocumentCategory;
  folderId?: string | null;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  visible,
  onClose,
  initialCategory = 'files',
  folderId = null,
}) => {
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === 'dark';
  const vaultKey = useVaultStore((s) => s.vaultKey);
  const refreshDocuments = useVaultStore((s) => s.refreshDocuments);
  const setSearchQuery = useVaultStore((s) => s.setSearchQuery);
  const resetVaultCategory = useVaultStore((s) => s.setSelectedCategory);
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory>(initialCategory);
  const [previousInitialCategory, setPreviousInitialCategory] = useState(initialCategory);

  // Adjust state during render when the prop changes (React's recommended pattern),
  // instead of calling setState synchronously inside an effect.
  if (initialCategory !== previousInitialCategory) {
    setPreviousInitialCategory(initialCategory);
    setSelectedCategory(initialCategory);
  }

  const handleImportFile = async () => {
    if (!vaultKey) return;
    try {
      const result = await File.pickFileAsync({
        mimeTypes: '*/*',
        multipleFiles: false,
      });

      if (!result.canceled && result.result) {
        const pickedFile = result.result;
        const fileName = pickedFile.name || `document_${Date.now()}`;
        setIsEncrypting(true);
        await encryptAndSaveDocument(
          vaultKey,
          pickedFile,
          fileName,
          selectedCategory,
          'application/octet-stream',
          folderId
        );
        await refreshDocuments();
        setSearchQuery('');
        resetVaultCategory('all');
        setIsEncrypting(false);
        onClose();
        Alert.alert('Encrypted', `"${fileName}" has been encrypted with AES-256-GCM and saved.`);
      }
    } catch (err: any) {
      setIsEncrypting(false);
      Alert.alert('Encryption Error', err.message || 'Failed to encrypt document.');
    }
  };

  const handleImportImage = async (fromCamera: boolean) => {
    if (!vaultKey) return;
    try {
      let result;
      if (fromCamera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Permission Required', 'Camera permission is needed to take a photo.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          quality: 0.9,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.All,
          quality: 0.9,
        });
      }

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        setIsEncrypting(true);
        const fileName =
          asset.fileName ||
          `photo_${Date.now()}.${asset.type === 'video' ? 'mp4' : 'jpg'}`;
        const cat = asset.type === 'video' ? 'videos' : 'photos';

        await encryptAndSaveDocument(
          vaultKey,
          asset.uri,
          fileName,
          cat,
          asset.mimeType || (asset.type === 'video' ? 'video/mp4' : 'image/jpeg'),
          folderId
        );
        await refreshDocuments();
        setSearchQuery('');
        resetVaultCategory('all');
        setIsEncrypting(false);
        onClose();
        Alert.alert('Encrypted', `"${fileName}" has been encrypted with AES-256-GCM and saved.`);
      }
    } catch (err: any) {
      setIsEncrypting(false);
      Alert.alert('Import Error', err.message || 'Failed to import and encrypt media.');
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent>
      <View style={styles.overlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />
        <View
          style={[
            styles.sheet,
            isDark && styles.sheetDark,
            { paddingBottom: Math.max(insets.bottom, 20) },
          ]}>
          <View style={[styles.sheetHandle, isDark && styles.sheetHandleDark]} />

          <View style={styles.headerRow}>
            <Text style={[styles.sheetTitle, isDark && styles.textPrimaryDark]}>
              Add to vault
            </Text>
            <AnimatedPressable
              scaleTo={0.88}
              onPress={onClose}
              style={[styles.closeBtn, isDark && styles.closeBtnDark]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={17} color={isDark ? '#A8A29E' : '#78716C'} />
            </AnimatedPressable>
          </View>

          <Text style={[styles.sheetSubtitle, isDark && styles.textSecondaryDark]}>
            {folderId
              ? 'Files will be encrypted and saved inside this folder.'
              : 'Files are encrypted on this device using AES-256-GCM before writing to storage.'}
          </Text>

          {isEncrypting ? (
            <View style={styles.encryptingContainer}>
              <ActivityIndicator size="large" color={BrandColors.primary} />
              <Text style={[styles.encryptingText, isDark && styles.textPrimaryDark]}>
                Encrypting with AES-256-GCM...
              </Text>
            </View>
          ) : (
            <>
              {/* Category selector */}
              <View style={[styles.categoryPickerRow, isDark && styles.categoryPickerRowDark]}>
                {(['files', 'photos', 'videos'] as DocumentCategory[]).map((cat) => {
                  const isActive = selectedCategory === cat;
                  return (
                    <AnimatedPressable
                      key={cat}
                      style={[
                        styles.categoryTab,
                        isActive && (isDark ? styles.categoryTabActiveDark : styles.categoryTabActive),
                      ]}
                      scaleTo={0.92}
                      onPress={() => setSelectedCategory(cat)}>
                      <Text
                        style={[
                          styles.categoryTabText,
                          isDark && styles.textSecondaryDark,
                          isActive && (isDark ? styles.categoryTabTextActiveDark : styles.categoryTabTextActive),
                        ]}>
                        {cat.toUpperCase()}
                      </Text>
                    </AnimatedPressable>
                  );
                })}
              </View>

              {/* Action buttons */}
              <AnimatedPressable
                style={[styles.actionButton, isDark && styles.actionButtonDark]}
                scaleTo={0.97}
                onPress={handleImportFile}>
                <View style={[styles.actionIconBox, isDark && styles.actionIconBoxDark]}>
                  <FileUp size={20} color={BrandColors.primary} strokeWidth={2.2} />
                </View>
                <View style={styles.actionTextBox}>
                  <Text style={[styles.actionTitle, isDark && styles.textPrimaryDark]}>
                    Import File or PDF
                  </Text>
                  <Text style={[styles.actionDesc, isDark && styles.textSecondaryDark]}>
                    Pick any document, certificate, or PDF
                  </Text>
                </View>
                <ChevronRight size={17} color={isDark ? '#6B5B52' : '#C4B5AC'} />
              </AnimatedPressable>

              <AnimatedPressable
                style={[styles.actionButton, isDark && styles.actionButtonDark]}
                scaleTo={0.97}
                onPress={() => handleImportImage(false)}>
                <View style={[styles.actionIconBox, isDark && styles.actionIconBoxDark]}>
                  <ImagePlus size={20} color={BrandColors.primary} strokeWidth={2.2} />
                </View>
                <View style={styles.actionTextBox}>
                  <Text style={[styles.actionTitle, isDark && styles.textPrimaryDark]}>
                    Select from Gallery
                  </Text>
                  <Text style={[styles.actionDesc, isDark && styles.textSecondaryDark]}>
                    Encrypt photos or videos from library
                  </Text>
                </View>
                <ChevronRight size={17} color={isDark ? '#6B5B52' : '#C4B5AC'} />
              </AnimatedPressable>

              <AnimatedPressable
                style={[styles.actionButton, isDark && styles.actionButtonDark]}
                scaleTo={0.97}
                onPress={() => handleImportImage(true)}>
                <View style={[styles.actionIconBox, isDark && styles.actionIconBoxDark]}>
                  <Camera size={20} color={BrandColors.primary} strokeWidth={2.2} />
                </View>
                <View style={styles.actionTextBox}>
                  <Text style={[styles.actionTitle, isDark && styles.textPrimaryDark]}>
                    Take Photo / Document Scan
                  </Text>
                  <Text style={[styles.actionDesc, isDark && styles.textSecondaryDark]}>
                    Capture Aadhaar, PAN, or physical IDs
                  </Text>
                </View>
                <ChevronRight size={17} color={isDark ? '#6B5B52' : '#C4B5AC'} />
              </AnimatedPressable>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 6, 4, 0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderTopWidth: 1.2,
    borderLeftWidth: 1.2,
    borderRightWidth: 1.2,
    borderColor: '#F0E6DF',
    paddingHorizontal: 16,
    paddingTop: 10,
    ...SoftShadows.sheet,
  },
  sheetDark: {
    backgroundColor: '#1C1511',
    borderColor: '#34221A',
    shadowColor: '#000000',
  },
  sheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E7E5E4',
    alignSelf: 'center',
    marginBottom: 14,
  },
  sheetHandleDark: {
    backgroundColor: '#3A2A22',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1C1917',
    letterSpacing: -0.4,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FAF5F0',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F0E6DF',
  },
  closeBtnDark: {
    backgroundColor: '#261C16',
    borderColor: '#36231B',
  },
  sheetSubtitle: {
    fontSize: 11.5,
    color: '#78716C',
    lineHeight: 16,
    marginBottom: 12,
  },
  categoryPickerRow: {
    flexDirection: 'row',
    backgroundColor: '#FAF5F0',
    borderRadius: 10,
    padding: 3,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F0E6DF',
  },
  categoryPickerRowDark: {
    backgroundColor: '#261C16',
    borderColor: '#36231B',
  },
  categoryTab: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 8,
  },
  categoryTabActive: {
    backgroundColor: '#FFFFFF',
    ...SoftShadows.subtle,
  },
  categoryTabActiveDark: {
    backgroundColor: '#17120F',
    borderWidth: 1,
    borderColor: '#3D281E',
  },
  categoryTabText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#78716C',
  },
  categoryTabTextActive: {
    color: BrandColors.primaryDeep,
    fontWeight: '700',
  },
  categoryTabTextActiveDark: {
    color: '#FFA25B',
    fontWeight: '700',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFDFB',
    borderRadius: 16,
    paddingVertical: 11,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F0E6DF',
  },
  actionButtonDark: {
    backgroundColor: '#221914',
    borderColor: '#36231B',
  },
  actionIconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FFF4ED',
    borderWidth: 1,
    borderColor: '#FCD8C1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconBoxDark: {
    backgroundColor: '#2E190E',
    borderColor: '#4A2718',
  },
  actionTextBox: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1C1917',
  },
  actionDesc: {
    fontSize: 11.5,
    color: '#78716C',
    marginTop: 2,
  },
  encryptingContainer: {
    paddingVertical: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  encryptingText: {
    marginTop: 14,
    fontSize: 14,
    fontWeight: '600',
    color: BrandColors.wordmark,
  },
  textPrimaryDark: {
    color: '#FFFDFB',
  },
  textSecondaryDark: {
    color: '#A8A29E',
  },
});
