import { create } from 'zustand';
import { DocumentRecord, DocumentCategory, FolderRecord } from '../types/document';
import {
  getAllDocuments,
  getAllFolders,
  updateFolderName,
  updateDocumentName,
  updateDocumentFolder,
} from '../database/db';
import { purgePreviewCache } from '../storage/documentManager';
import { isVaultConfigured } from '../security/keyManager';

export type DocumentSortBy = 'newest' | 'oldest' | 'name' | 'size';

interface VaultState {
  isConfigured: boolean;
  isUnlocked: boolean;
  vaultKey: Uint8Array | null;
  documents: DocumentRecord[];
  folders: FolderRecord[];
  activeFolderId: string | null;
  searchQuery: string;
  selectedCategory: DocumentCategory | 'all';
  sortBy: DocumentSortBy;
  isLoading: boolean;
  error: string | null;

  // Global modals
  openWithDocument: DocumentRecord | null;
  isImportModalVisible: boolean;
  importInitialCategory: DocumentCategory;
  importFolderId: string | null;
  isCreateFolderModalVisible: boolean;

  // Actions
  checkVaultStatus: () => Promise<void>;
  unlockVault: (key: Uint8Array) => Promise<void>;
  lockVault: () => Promise<void>;
  refreshDocuments: () => Promise<void>;
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (cat: DocumentCategory | 'all') => void;
  setSortBy: (sort: DocumentSortBy) => void;
  setOpenWithDocument: (doc: DocumentRecord | null) => void;
  setActiveFolder: (folderId: string | null) => void;
  openImportModal: (cat?: DocumentCategory, folderId?: string | null) => void;
  closeImportModal: () => void;
  openCreateFolderModal: () => void;
  closeCreateFolderModal: () => void;
  renameFolder: (id: string, newName: string) => Promise<void>;
  renameDocument: (id: string, newName: string) => Promise<void>;
  moveDocumentToFolder: (documentId: string, folderId: string | null) => Promise<void>;
  setError: (err: string | null) => void;
}

export const useVaultStore = create<VaultState>((set, get) => ({
  isConfigured: false,
  isUnlocked: false,
  vaultKey: null,
  documents: [],
  folders: [],
  activeFolderId: null,
  searchQuery: '',
  selectedCategory: 'all',
  sortBy: 'newest',
  isLoading: true,
  error: null,

  // Modals state
  openWithDocument: null,
  isImportModalVisible: false,
  importInitialCategory: 'files',
  importFolderId: null,
  isCreateFolderModalVisible: false,

  checkVaultStatus: async () => {
    try {
      set({ isLoading: true });
      const configured = await isVaultConfigured();
      set({ isConfigured: configured, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  unlockVault: async (key: Uint8Array) => {
    try {
      set({ vaultKey: key, isUnlocked: true, error: null });
      const [docs, folders] = await Promise.all([
        getAllDocuments(),
        getAllFolders(),
      ]);
      set({ documents: docs, folders });
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  lockVault: async () => {
    // 1. Scrub in-memory keys
    const currentKey = get().vaultKey;
    if (currentKey) {
      currentKey.fill(0); // Zeroize in-memory bytes
    }

    // 2. Purge ephemeral preview files
    await purgePreviewCache();

    // 3. Reset state
    set({
      vaultKey: null,
      isUnlocked: false,
      documents: [],
      folders: [],
      activeFolderId: null,
      searchQuery: '',
      selectedCategory: 'all',
      openWithDocument: null,
      isImportModalVisible: false,
      importFolderId: null,
      isCreateFolderModalVisible: false,
    });
  },

  refreshDocuments: async () => {
    if (!get().isUnlocked) return;
    try {
      const [docs, folders] = await Promise.all([
        getAllDocuments(),
        getAllFolders(),
      ]);
      set({ documents: docs, folders });
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  setSearchQuery: (query: string) => set({ searchQuery: query }),
  setSelectedCategory: (cat: DocumentCategory | 'all') => set({ selectedCategory: cat }),
  setSortBy: (sort: DocumentSortBy) => set({ sortBy: sort }),
  setOpenWithDocument: (doc: DocumentRecord | null) => set({ openWithDocument: doc }),
  setActiveFolder: (folderId: string | null) => set({ activeFolderId: folderId }),
  openImportModal: (cat: DocumentCategory = 'files', folderId: string | null = null) =>
    set({
      isImportModalVisible: true,
      importInitialCategory: cat,
      importFolderId: folderId,
    }),
  closeImportModal: () =>
    set({ isImportModalVisible: false, importFolderId: null }),
  openCreateFolderModal: () => set({ isCreateFolderModalVisible: true }),
  closeCreateFolderModal: () => set({ isCreateFolderModalVisible: false }),
  renameFolder: async (id: string, newName: string) => {
    await updateFolderName(id, newName);
    await get().refreshDocuments();
  },
  renameDocument: async (id: string, newName: string) => {
    await updateDocumentName(id, newName);
    await get().refreshDocuments();
  },
  moveDocumentToFolder: async (documentId: string, folderId: string | null) => {
    await updateDocumentFolder(documentId, folderId);
    await get().refreshDocuments();
  },
  setError: (err: string | null) => set({ error: err }),
}));
