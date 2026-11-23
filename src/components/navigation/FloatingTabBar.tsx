import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  LayoutDashboard,
  Files,
  Settings as SettingsIcon,
  Lock,
  Plus,
  X,
  FileUp,
  FolderPlus,
  ImagePlus,
  Camera,
  ChevronRight,
} from 'lucide-react-native';
import { File } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';

import { BrandColors, SoftShadows } from '@/constants/theme';
import { useVaultStore } from '@/store/vaultStore';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { encryptAndSaveDocument } from '@/storage/documentManager';

export interface FloatingTabBarProps {
  state: {
    index: number;
    routes: {
      key: string;
      name: string;
      params?: any;
    }[];
  };
  descriptors: Record<string, any>;
  emitter?: {
    emit: (options: any) => any;
  };
  navigation?: {
    emit: (event: any) => any;
    navigate: (name: string) => void;
  };
  navigateToTab?: (routeKey: string) => void;
  insets?: any;
}

export const FloatingTabBar: React.FC<FloatingTabBarProps> = ({
  state,
  descriptors,
  emitter,
  navigation,
  navigateToTab,
}) => {
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === 'dark';
  const {
    documents,
    vaultKey,
    activeFolderId,
    lockVault,
    refreshDocuments,
    openCreateFolderModal,
    setSearchQuery,
    setSelectedCategory,
    setSortBy,
  } = useVaultStore();
  const documentCount = documents.length;
  const [isActionOpen, setIsActionOpen] = useState(false);
  const isDocumentsTab = state.routes[state.index]?.name === 'documents';
  const importFolderId = isDocumentsTab ? activeFolderId : null;

  const handleImportFile = async () => {
    if (!vaultKey) {
      Alert.alert('Vault Locked', 'Please unlock the vault first.');
      return;
    }
    setIsActionOpen(false);
    try {
      // File.pickFileAsync takes a persistable READ permission on the picked
      // content:// URI. expo-document-picker does not, which caused the
      // "missing READ permission" IOException on Android.
      const result = await File.pickFileAsync({
        mimeTypes: '*/*',
        multipleFiles: false,
      });

      if (!result.canceled && result.result) {
        const pickedFile = result.result;
        const fileName = pickedFile.name || `document_${Date.now()}`;
        await encryptAndSaveDocument(
          vaultKey,
          pickedFile,
          fileName,
          'files',
          'application/octet-stream',
          importFolderId
        );
        await refreshDocuments();

        // Clear any active filter so the newly added file is guaranteed to show.
        setSearchQuery('');
        setSelectedCategory('all');
        setSortBy('newest');
        router.push('/documents');

        Alert.alert('Encrypted', `"${fileName}" has been encrypted with AES-256-GCM and saved.`);
      }
    } catch (err: any) {
      Alert.alert('Encryption Error', err.message || 'Failed to encrypt document.');
    }
  };

  const handleImportImage = async (fromCamera: boolean) => {
    if (!vaultKey) {
      Alert.alert('Vault Locked', 'Please unlock the vault first.');
      return;
    }
    setIsActionOpen(false);
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
          importFolderId
        );
        await refreshDocuments();
        setSearchQuery('');
        setSelectedCategory('all');
        setSortBy('newest');
        router.push('/documents');
        Alert.alert('Encrypted', `"${fileName}" has been encrypted with AES-256-GCM and saved.`);
      }
    } catch (err: any) {
      Alert.alert('Import Error', err.message || 'Failed to import and encrypt media.');
    }
  };

  return (
    <>
      {/* Add / import bottom sheet */}
      <Modal
        visible={isActionOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsActionOpen(false)}
        statusBarTranslucent>
        <View style={styles.sheetRoot}>
          <TouchableOpacity
            style={styles.sheetBackdrop}
            activeOpacity={1}
            onPress={() => setIsActionOpen(false)}
          />

          <View
            style={[
              styles.sheet,
              isDark && styles.sheetDark,
              { paddingBottom: insets.bottom + 14 },
            ]}>
            <View style={[styles.sheetHandle, isDark && styles.sheetHandleDark]} />

            <View style={styles.actionHeader}>
              <Text style={[styles.actionHeaderTitle, isDark && styles.textPrimaryDark]}>
                Add to vault
              </Text>
              <Text style={[styles.actionHeaderSubtitle, isDark && styles.textSecondaryDark]}>
                {importFolderId
                  ? 'Encrypted on this device before saving into this folder'
                  : 'Encrypted on this device before saving'}
              </Text>
            </View>

            <View style={styles.actionList}>
              <AnimatedPressable
                style={[styles.actionRow, isDark && styles.actionRowDark]}
                scaleTo={0.97}
                onPress={() => {
                  setIsActionOpen(false);
                  openCreateFolderModal();
                }}>
                <View style={[styles.actionIconBox, isDark && styles.actionIconBoxDark]}>
                  <FolderPlus size={20} color={BrandColors.primary} strokeWidth={2.2} />
                </View>
                <View style={styles.actionText}>
                  <Text style={[styles.actionTitle, isDark && styles.textPrimaryDark]}>
                    New folder
                  </Text>
                  <Text style={[styles.actionDesc, isDark && styles.textSecondaryDark]}>
                    Create a folder for videos, PDFs, docs, and images
                  </Text>
                </View>
                <ChevronRight size={17} color={isDark ? '#6B5B52' : '#C4B5AC'} />
              </AnimatedPressable>

              <AnimatedPressable
                style={[styles.actionRow, isDark && styles.actionRowDark]}
                scaleTo={0.97}
                onPress={handleImportFile}>
                <View style={[styles.actionIconBox, isDark && styles.actionIconBoxDark]}>
                  <FileUp size={20} color={BrandColors.primary} strokeWidth={2.2} />
                </View>
                <View style={styles.actionText}>
                  <Text style={[styles.actionTitle, isDark && styles.textPrimaryDark]}>
                    Import a file
                  </Text>
                  <Text style={[styles.actionDesc, isDark && styles.textSecondaryDark]}>
                    Documents and PDFs from your device
                  </Text>
                </View>
                <ChevronRight size={17} color={isDark ? '#6B5B52' : '#C4B5AC'} />
              </AnimatedPressable>

              <AnimatedPressable
                style={[styles.actionRow, isDark && styles.actionRowDark]}
                scaleTo={0.97}
                onPress={() => handleImportImage(false)}>
                <View style={[styles.actionIconBox, isDark && styles.actionIconBoxDark]}>
                  <ImagePlus size={20} color={BrandColors.primary} strokeWidth={2.2} />
                </View>
                <View style={styles.actionText}>
                  <Text style={[styles.actionTitle, isDark && styles.textPrimaryDark]}>
                    From gallery
                  </Text>
                  <Text style={[styles.actionDesc, isDark && styles.textSecondaryDark]}>
                    Pick photos or videos you already have
                  </Text>
                </View>
                <ChevronRight size={17} color={isDark ? '#6B5B52' : '#C4B5AC'} />
              </AnimatedPressable>

              <AnimatedPressable
                style={[styles.actionRow, isDark && styles.actionRowDark]}
                scaleTo={0.97}
                onPress={() => handleImportImage(true)}>
                <View style={[styles.actionIconBox, isDark && styles.actionIconBoxDark]}>
                  <Camera size={20} color={BrandColors.primary} strokeWidth={2.2} />
                </View>
                <View style={styles.actionText}>
                  <Text style={[styles.actionTitle, isDark && styles.textPrimaryDark]}>
                    Take a photo
                  </Text>
                  <Text style={[styles.actionDesc, isDark && styles.textSecondaryDark]}>
                    Capture something new with your camera
                  </Text>
                </View>
                <ChevronRight size={17} color={isDark ? '#6B5B52' : '#C4B5AC'} />
              </AnimatedPressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Icon-only navigation pill + separate lock/add pill */}
      <View
        pointerEvents="box-none"
        style={[
          styles.container,
          { bottom: insets.bottom > 0 ? insets.bottom + 8 : 16 },
        ]}>
        <View style={styles.barRow}>
          {/* Floating pill: Home, Doc, Setting (icons only) */}
          <View style={[styles.tabBar, isDark && styles.tabBarDark]}>
            {state.routes.map((route, index) => {
              const { options } = descriptors[route.key] || {};
              const isFocused = state.index === index;
              const iconColor = isFocused
                ? BrandColors.primaryDeep
                : isDark
                  ? '#A8A29E'
                  : '#8C857E';

              const onPress = () => {
                let defaultPrevented = false;
                if (emitter) {
                  const res = emitter.emit({
                    type: 'tabPress',
                    target: route.key,
                    canPreventDefault: true,
                  });
                  defaultPrevented = res?.defaultPrevented ?? false;
                } else if (navigation) {
                  const res = navigation.emit({
                    type: 'tabPress',
                    target: route.key,
                    canPreventDefault: true,
                  });
                  defaultPrevented = res?.defaultPrevented ?? false;
                }

                if (!isFocused && !defaultPrevented) {
                  if (navigateToTab) {
                    navigateToTab(route.key);
                  } else if (navigation) {
                    navigation.navigate(route.name);
                  }
                }
              };

              const onLongPress = () => {
                if (emitter) {
                  emitter.emit({
                    type: 'tabLongPress',
                    target: route.key,
                  });
                } else if (navigation) {
                  navigation.emit({
                    type: 'tabLongPress',
                    target: route.key,
                  });
                }
              };

              const isHome = route.name === 'index';
              const isDocuments = route.name === 'documents';
              const isSettings = route.name === 'settings';

              const fallbackLabel = isHome
                ? 'Home'
                : isDocuments
                  ? 'Documents'
                  : isSettings
                    ? 'Settings'
                    : route.name;

              return (
                <AnimatedPressable
                  key={route.key}
                  accessibilityRole="button"
                  accessibilityState={isFocused ? { selected: true } : {}}
                  accessibilityLabel={options?.tabBarAccessibilityLabel ?? fallbackLabel}
                  testID={options?.tabBarButtonTestID}
                  onPress={onPress}
                  onLongPress={onLongPress}
                  scaleTo={0.9}
                  style={[
                    styles.tabItem,
                    isFocused && (isDark ? styles.tabItemFocusedDark : styles.tabItemFocused),
                  ]}>
                  <View style={styles.iconContainer}>
                    {isHome && (
                      <LayoutDashboard
                        size={19}
                        color={iconColor}
                        strokeWidth={isFocused ? 2.5 : 2}
                      />
                    )}
                    {isDocuments && (
                      <View style={styles.badgeWrapper}>
                        <Files
                          size={19}
                          color={iconColor}
                          strokeWidth={isFocused ? 2.5 : 2}
                        />
                        {documentCount > 0 && (
                          <View
                            style={[
                              styles.countBadge,
                              isFocused && styles.countBadgeFocused,
                            ]}>
                            <Text
                              style={[
                                styles.countBadgeText,
                                isFocused && styles.countBadgeTextFocused,
                              ]}>
                              {documentCount > 99 ? '99+' : documentCount}
                            </Text>
                          </View>
                        )}
                      </View>
                    )}
                    {isSettings && (
                      <SettingsIcon
                        size={19}
                        color={iconColor}
                        strokeWidth={isFocused ? 2.5 : 2}
                      />
                    )}
                  </View>
                </AnimatedPressable>
              );
            })}
          </View>

          {/* Separate floating pill: Lock + Add */}
          <View style={[styles.actionPill, isDark && styles.actionPillDark]}>
            <AnimatedPressable
              accessibilityRole="button"
              accessibilityLabel="Quick Lock Vault"
              style={[styles.lockItem, isDark && styles.lockItemDark]}
              scaleTo={0.9}
              onPress={() => lockVault()}
              hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}>
              <Lock
                size={19}
                color={isDark ? '#A8A29E' : '#8C857E'}
                strokeWidth={2}
              />
            </AnimatedPressable>

            <View style={[styles.pillDivider, isDark && styles.pillDividerDark]} />

            <AnimatedPressable
              accessibilityRole="button"
              accessibilityLabel="Add Document or Media"
              style={[
                styles.addBtn,
                isActionOpen && styles.addBtnActive,
              ]}
              scaleTo={0.9}
              onPress={() => setIsActionOpen(!isActionOpen)}
              hitSlop={{ top: 6, bottom: 6, left: 4, right: 6 }}>
              {isActionOpen ? (
                <X size={20} color="#FFFDFB" strokeWidth={2.8} />
              ) : (
                <Plus size={20} color="#FFFDFB" strokeWidth={2.8} />
              )}
            </AnimatedPressable>
          </View>
        </View>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 14,
    right: 14,
    alignItems: 'center',
    zIndex: 99,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    paddingHorizontal: 5,
    paddingVertical: 5,
    borderWidth: 1.2,
    borderColor: '#F0E6DF',
    ...SoftShadows.floating,
  },
  tabBarDark: {
    backgroundColor: '#17120F',
    borderColor: '#261C16',
    shadowColor: '#000000',
  },
  tabItem: {
    width: 42,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  tabItemFocused: {
    backgroundColor: '#FFF4ED',
    borderWidth: 1,
    borderColor: '#FCD8C1',
  },
  tabItemFocusedDark: {
    backgroundColor: '#2B160C',
    borderWidth: 1,
    borderColor: BrandColors.primary,
  },
  // Separate pill for lock + add
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    paddingHorizontal: 5,
    paddingVertical: 5,
    borderWidth: 1.2,
    borderColor: '#F0E6DF',
    ...SoftShadows.floating,
  },
  actionPillDark: {
    backgroundColor: '#17120F',
    borderColor: '#261C16',
    shadowColor: '#000000',
  },
  lockItem: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#FAF5F0',
    borderWidth: 1.2,
    borderColor: '#F0E6DF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockItemDark: {
    backgroundColor: '#201611',
    borderColor: '#2F1E16',
  },
  pillDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#F0E6DF',
  },
  pillDividerDark: {
    backgroundColor: '#2A1C16',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadge: {
    position: 'absolute',
    top: -5,
    right: -8,
    backgroundColor: '#E7E5E4',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 10,
    minWidth: 15,
    alignItems: 'center',
  },
  countBadgeFocused: {
    backgroundColor: BrandColors.primary,
  },
  countBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#78716C',
  },
  countBadgeTextFocused: {
    color: '#FFFFFF',
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: BrandColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...SoftShadows.button,
  },
  addBtnActive: {
    backgroundColor: BrandColors.primaryDeep,
  },

  // Add / import bottom sheet
  sheetRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(10, 6, 4, 0.45)',
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
    marginBottom: 16,
  },
  sheetHandleDark: {
    backgroundColor: '#3A2A22',
  },
  actionHeader: {
    marginBottom: 14,
    paddingHorizontal: 2,
  },
  actionHeaderTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1C1917',
    letterSpacing: -0.4,
  },
  actionHeaderSubtitle: {
    fontSize: 11.5,
    color: '#78716C',
    marginTop: 2,
  },
  actionList: {
    gap: 8,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFDFB',
    borderRadius: 16,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#F0E6DF',
  },
  actionRowDark: {
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
  actionText: {
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
  textPrimaryDark: {
    color: '#FFFDFB',
  },
  textSecondaryDark: {
    color: '#A8A29E',
  },
});
