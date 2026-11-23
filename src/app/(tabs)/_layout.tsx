import React from 'react';
import { Tabs } from 'expo-router';
import { FloatingTabBar } from '@/components/navigation/FloatingTabBar';
import { VaultAuthGate } from '@/components/auth/VaultAuthGate';
import { ImportModal } from '@/components/ui/ImportModal';
import { CreateFolderModal } from '@/components/ui/CreateFolderModal';
import { OpenWithSheet } from '@/components/ui/OpenWithSheet';
import { useVaultStore } from '@/store/vaultStore';

export default function TabsLayout() {
  const {
    openWithDocument,
    setOpenWithDocument,
    isImportModalVisible,
    closeImportModal,
    importInitialCategory,
    importFolderId,
    isCreateFolderModalVisible,
    closeCreateFolderModal,
  } = useVaultStore();

  return (
    <VaultAuthGate>
      <Tabs
        tabBar={(props) => <FloatingTabBar {...props} />}
        screenOptions={{
          headerShown: false,
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
          }}
        />
        <Tabs.Screen
          name="documents"
          options={{
            title: 'Documents',
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
          }}
        />
      </Tabs>

      {/* Global Shared Modals */}
      <ImportModal
        visible={isImportModalVisible}
        onClose={closeImportModal}
        initialCategory={importInitialCategory}
        folderId={importFolderId}
      />

      <CreateFolderModal
        visible={isCreateFolderModalVisible}
        onClose={closeCreateFolderModal}
      />

      <OpenWithSheet
        document={openWithDocument}
        visible={Boolean(openWithDocument)}
        onClose={() => setOpenWithDocument(null)}
      />
    </VaultAuthGate>
  );
}
