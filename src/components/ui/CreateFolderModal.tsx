import React, { useState } from 'react';
import {
  Alert,
  Keyboard,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { FolderPlus, X } from 'lucide-react-native';

import { BrandColors, SoftShadows } from '@/constants/theme';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { insertFolder } from '@/database/db';
import { FolderRecord } from '@/types/document';
import { useVaultStore } from '@/store/vaultStore';

interface CreateFolderModalProps {
  visible: boolean;
  onClose: () => void;
}

export const CreateFolderModal: React.FC<CreateFolderModalProps> = ({
  visible,
  onClose,
}) => {
  const isDark = useColorScheme() === 'dark';
  const folders = useVaultStore((s) => s.folders);
  const refreshDocuments = useVaultStore((s) => s.refreshDocuments);
  const setActiveFolder = useVaultStore((s) => s.setActiveFolder);
  const setSearchQuery = useVaultStore((s) => s.setSearchQuery);
  const resetVaultCategory = useVaultStore((s) => s.setSelectedCategory);
  const setSortBy = useVaultStore((s) => s.setSortBy);
  const [name, setName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const close = () => {
    Keyboard.dismiss();
    setName('');
    onClose();
  };

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('Folder name required', 'Enter a name for this folder.');
      return;
    }
    if (folders.some((f) => f.name.toLowerCase() === trimmed.toLowerCase())) {
      Alert.alert('Folder exists', 'A folder with this name already exists.');
      return;
    }

    try {
      setIsCreating(true);
      const now = Date.now();
      const folder: FolderRecord = {
        id: `folder_${now}_${Math.random().toString(36).substring(2, 8)}`,
        name: trimmed,
        parentId: null,
        createdAt: now,
        updatedAt: now,
      };
      await insertFolder(folder);
      await refreshDocuments();
      setActiveFolder(null);
      setSearchQuery('');
      resetVaultCategory('all');
      setSortBy('newest');
      close();
      router.push('/documents');
      Alert.alert('Folder created', `"${trimmed}" is ready for files.`);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create folder.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={close}
      statusBarTranslucent>
      <View style={styles.backdrop}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={close}
        />
        <View style={[styles.card, isDark && styles.cardDark]}>
          <View style={[styles.header, isDark && styles.headerDark]}>
            <View style={styles.headerTitleRow}>
              <View style={styles.iconBox}>
                <FolderPlus size={15} color={BrandColors.primary} strokeWidth={2.4} />
              </View>
              <Text style={[styles.title, isDark && styles.textPrimaryDark]}>
                New folder
              </Text>
            </View>
            <AnimatedPressable
              scaleTo={0.88}
              onPress={close}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={17} color={isDark ? '#A8A29E' : '#78716C'} />
            </AnimatedPressable>
          </View>

          <Text style={[styles.label, isDark && styles.textSecondaryDark]}>
            Folder name
          </Text>
          <TextInput
            autoFocus
            value={name}
            onChangeText={setName}
            placeholder="e.g. Identity Documents"
            placeholderTextColor={isDark ? '#78716C' : '#A8A29E'}
            maxLength={40}
            returnKeyType="done"
            onSubmitEditing={handleCreate}
            style={[styles.input, isDark && styles.inputDark]}
          />
          <Text style={[styles.hint, isDark && styles.textSecondaryDark]}>
            Add videos, PDFs, documents, and images inside this folder.
          </Text>

          <View style={styles.actions}>
            <AnimatedPressable
              style={[styles.secondaryBtn, isDark && styles.secondaryBtnDark]}
              scaleTo={0.96}
              onPress={close}>
              <Text style={[styles.secondaryBtnText, isDark && styles.textSecondaryDark]}>
                Cancel
              </Text>
            </AnimatedPressable>
            <AnimatedPressable
              style={styles.primaryBtn}
              scaleTo={0.96}
              disabled={isCreating}
              onPress={handleCreate}>
              <Text style={styles.primaryBtnText}>
                {isCreating ? 'Creating...' : 'Create folder'}
              </Text>
            </AnimatedPressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(10, 6, 4, 0.5)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#F0E6DF',
    ...SoftShadows.modal,
  },
  cardDark: {
    backgroundColor: '#17120F',
    borderColor: '#261C16',
    shadowColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F5ECE5',
  },
  headerDark: {
    borderBottomColor: '#2B1F19',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  iconBox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: '#FFF4ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1C1917',
    letterSpacing: -0.2,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78716C',
    marginBottom: 6,
  },
  input: {
    height: 44,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#E7E5E4',
    backgroundColor: '#FFFDFB',
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#1C1917',
  },
  inputDark: {
    backgroundColor: '#221914',
    borderColor: '#36231B',
    color: '#FFFDFB',
  },
  hint: {
    fontSize: 11,
    marginTop: 7,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 18,
  },
  secondaryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#F5F5F4',
  },
  secondaryBtnDark: {
    backgroundColor: '#2B211B',
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#78716C',
  },
  primaryBtn: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: BrandColors.primary,
  },
  primaryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFDFB',
  },
  textPrimaryDark: {
    color: '#FFFDFB',
  },
  textSecondaryDark: {
    color: '#A8A29E',
  },
});
