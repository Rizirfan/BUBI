import React, { useMemo, useCallback, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  ScrollView,
  FlatList,
  Modal,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import {
  ArrowLeft,
  Check,
  FileText,
  Filter,
  Plus,
  Search,
  X,
} from 'lucide-react-native';

import { BrandColors, SoftShadows } from '@/constants/theme';
import { DocumentRow } from '@/components/ui/DocumentRow';
import { FolderRow } from '@/components/ui/FolderRow';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { useVaultStore, DocumentSortBy } from '@/store/vaultStore';
import { secureDeleteDocument } from '@/storage/documentManager';
import { deleteFolderAndUnlinkDocuments } from '@/database/db';
import {
  DocumentCategory,
  DocumentRecord,
  FolderRecord,
} from '@/types/document';
import { useColorScheme } from '@/hooks/use-color-scheme';

const filterCategories: { key: DocumentCategory | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'files', label: 'Files' },
  { key: 'photos', label: 'Photos' },
  { key: 'videos', label: 'Videos' },
];

const sortOptions: { key: DocumentSortBy; label: string }[] = [
  { key: 'newest', label: 'Newest First' },
  { key: 'oldest', label: 'Oldest First' },
  { key: 'name', label: 'File Name (A - Z)' },
  { key: 'size', label: 'File Size (Largest)' },
];

type ListSection =
  | {
      id: string;
      kind: 'folder';
      title: string;
      count: number;
      items: FolderRecord[];
      showDivider: boolean;
    }
  | {
      id: string;
      kind: 'document';
      title: string;
      count: number;
      items: DocumentRecord[];
      showDivider: boolean;
    };

const DOCUMENT_SECTION_ORDER: { key: DocumentCategory; title: string }[] = [
  { key: 'photos', title: 'Photos' },
  { key: 'videos', title: 'Videos' },
  { key: 'files', title: 'Files' },
];

const PRIMARY_DOCUMENT_CATEGORIES = new Set<DocumentCategory>(
  DOCUMENT_SECTION_ORDER.map(({ key }) => key)
);

export default function DocumentsScreen() {
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === 'dark';
  const {
    documents,
    folders,
    activeFolderId,
    searchQuery,
    selectedCategory,
    sortBy,
    setSearchQuery,
    setSelectedCategory,
    setSortBy,
    refreshDocuments,
    setActiveFolder,
    setOpenWithDocument,
    openImportModal,
  } = useVaultStore();

  const [isSortModalVisible, setIsSortModalVisible] = useState(false);

  const activeFolder = folders.find((folder) => folder.id === activeFolderId) ?? null;

  const handleDeleteDocument = useCallback(
    async (doc: DocumentRecord) => {
      try {
        await secureDeleteDocument(doc);
        await refreshDocuments();
      } catch (err: any) {
        Alert.alert('Error', err.message || 'Failed to delete file.');
      }
    },
    [refreshDocuments]
  );

  const handleDeleteFolder = useCallback(
    (folder: FolderRecord) => {
      Alert.alert(
        'Delete folder?',
        'Encrypted files inside will be moved back to Documents, not deleted.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await deleteFolderAndUnlinkDocuments(folder.id);
                if (activeFolderId === folder.id) setActiveFolder(null);
                await refreshDocuments();
              } catch (err: any) {
                Alert.alert('Error', err.message || 'Failed to delete folder.');
              }
            },
          },
        ]
      );
    },
    [activeFolderId, refreshDocuments, setActiveFolder]
  );

  const handleOpenFolder = useCallback(
    (folder: FolderRecord) => {
      setSearchQuery('');
      setSelectedCategory('all');
      setActiveFolder(folder.id);
    },
    [setActiveFolder, setSearchQuery, setSelectedCategory]
  );

  const handleBackToRoot = useCallback(() => {
    setSearchQuery('');
    setSelectedCategory('all');
    setActiveFolder(null);
  }, [setActiveFolder, setSearchQuery, setSelectedCategory]);

  const scopedDocuments = useMemo(
    () =>
      documents.filter((doc) =>
        activeFolderId ? doc.folderId === activeFolderId : doc.folderId == null
      ),
    [documents, activeFolderId]
  );

  const folderCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const doc of documents) {
      if (doc.folderId) counts[doc.folderId] = (counts[doc.folderId] ?? 0) + 1;
    }
    return counts;
  }, [documents]);

  const rootFolders = useMemo(
    () => folders.filter((folder) => folder.parentId === null),
    [folders]
  );

  const filteredAndSortedDocuments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = scopedDocuments.filter((doc) => {
      const matchesSearch = !q || doc.name.toLowerCase().includes(q);
      const matchesCategory =
        selectedCategory === 'all' || doc.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });

    return filtered.sort((a, b) => {
      if (sortBy === 'newest') return b.createdAt - a.createdAt;
      if (sortBy === 'oldest') return a.createdAt - b.createdAt;
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'size') return b.originalSize - a.originalSize;
      return 0;
    });
  }, [scopedDocuments, searchQuery, selectedCategory, sortBy]);

  // One list section per group. Each section renders as a single settings-style
  // card containing plain rows: folders, photos, videos, files, and other.
  const listSections = useMemo<ListSection[]>(() => {
    const sections: ListSection[] = [];

    if (!activeFolder && rootFolders.length > 0) {
      sections.push({
        id: 'folders',
        kind: 'folder',
        title: 'Folders',
        count: rootFolders.length,
        items: rootFolders,
        showDivider: false,
      });
    }

    for (const { key, title } of DOCUMENT_SECTION_ORDER) {
      const items = filteredAndSortedDocuments.filter(
        (doc) => doc.category === key
      );
      if (items.length > 0) {
        sections.push({
          id: `documents-${key}`,
          kind: 'document',
          title,
          count: items.length,
          items,
          showDivider: false,
        });
      }
    }

    const otherItems = filteredAndSortedDocuments.filter(
      (doc) => !PRIMARY_DOCUMENT_CATEGORIES.has(doc.category)
    );
    if (otherItems.length > 0) {
      sections.push({
        id: 'documents-other',
        kind: 'document',
        title: 'Other',
        count: otherItems.length,
        items: otherItems,
        showDivider: false,
      });
    }

    // Keep a small divider only between folders and the first document group.
    return sections.map((section, index) => ({
      ...section,
      showDivider: index === 1 && sections[0]?.kind === 'folder',
    }));
  }, [activeFolder, rootFolders, filteredAndSortedDocuments]);

  const categoryCounts = useMemo(() => {
    let files = 0;
    let photos = 0;
    let videos = 0;
    for (const d of scopedDocuments) {
      if (d.category === 'files') files++;
      else if (d.category === 'photos') photos++;
      else if (d.category === 'videos') videos++;
    }
    return { all: scopedDocuments.length, files, photos, videos };
  }, [scopedDocuments]);

  // Folders are rendered in the header, so an empty document list should not
  // show the "no documents" message once the user has created a folder.
  const documentEmptyMessage = searchQuery
    ? 'No results found'
    : activeFolder
      ? 'This folder is empty — add files to get started'
      : rootFolders.length > 0
        ? null
        : 'No documents in this category';

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Search Input - Sleeker & Resized */}
      <View style={[styles.searchBar, isDark && styles.searchBarDark]}>
        <Search size={15} color={isDark ? '#78716C' : '#A8A29E'} style={{ marginRight: 8 }} />
        <TextInput
          style={[styles.searchInput, isDark && styles.searchInputDark]}
          placeholder="Search encrypted files..."
          placeholderTextColor={isDark ? '#78716C' : '#A8A29E'}
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearchQuery('')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <X size={15} color={isDark ? '#78716C' : '#A8A29E'} />
          </TouchableOpacity>
        )}
      </View>

      {/* Unified Compact Category & Toolbar Row */}
      <View style={styles.unifiedFilterRow}>
        {/* Left: Minimized Category Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScrollContent}
          style={styles.categoryScroll}>
          {filterCategories.map(({ key, label }) => {
            const isActive = selectedCategory === key;
            const count = categoryCounts[key as keyof typeof categoryCounts] ?? 0;
            return (
              <AnimatedPressable
                key={key}
                style={[
                  styles.categoryPill,
                  isDark && styles.categoryPillDark,
                  isActive && styles.categoryPillActive,
                ]}
                scaleTo={0.93}
                onPress={() => setSelectedCategory(key)}>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.categoryPillText,
                    isDark && styles.textSecondaryDark,
                    isActive && styles.categoryPillTextActive,
                  ]}>
                  {label}
                </Text>
                <View
                  style={[
                    styles.categoryBadge,
                    isDark && styles.categoryBadgeDark,
                    isActive && styles.categoryBadgeActive,
                  ]}>
                  <Text
                    style={[
                      styles.categoryBadgeText,
                      isDark && styles.textSecondaryDark,
                      isActive && styles.categoryBadgeTextActive,
                    ]}>
                    {count}
                  </Text>
                </View>
              </AnimatedPressable>
            );
          })}
        </ScrollView>

        {/* Right Side: Sort / Filter */}
        <View style={styles.toolsRight}>
          <AnimatedPressable
            style={[
              styles.filterIconBtn,
              isDark && styles.filterIconBtnDark,
              sortBy !== 'newest' && styles.filterIconBtnActive,
            ]}
            scaleTo={0.9}
            onPress={() => setIsSortModalVisible(true)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Filter
              size={13}
              color={sortBy !== 'newest' ? BrandColors.primary : (isDark ? '#A8A29E' : '#78716C')}
            />
            {sortBy !== 'newest' && <View style={styles.filterActiveDot} />}
          </AnimatedPressable>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, isDark && styles.containerDark]} edges={['top', 'left', 'right']}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Top Header with Clean Title */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {activeFolder ? (
            <>
              <AnimatedPressable
                style={[styles.folderBackBtn, isDark && styles.folderBackBtnDark]}
                scaleTo={0.88}
                onPress={handleBackToRoot}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <ArrowLeft size={19} color={isDark ? '#FFFDFB' : '#1C1917'} />
              </AnimatedPressable>
              <View style={styles.folderHeaderCopy}>
                <Text
                  style={[styles.folderHeaderTitle, isDark && styles.textPrimaryDark]}
                  numberOfLines={1}>
                  {activeFolder.name}
                </Text>
                <Text style={styles.folderHeaderMeta}>
                  {folderCounts[activeFolder.id] ?? 0}{' '}
                  {(folderCounts[activeFolder.id] ?? 0) === 1 ? 'file' : 'files'}
                </Text>
              </View>
            </>
          ) : (
            <Text style={[styles.title, isDark && styles.textPrimaryDark]}>Documents</Text>
          )}
        </View>

        {activeFolder && (
          <View style={styles.headerActions}>
            <AnimatedPressable
              style={styles.headerAddBtn}
              scaleTo={0.94}
              onPress={() => openImportModal('files', activeFolder.id)}>
              <Plus size={13} color="#FFFDFB" strokeWidth={2.6} style={{ marginRight: 4 }} />
              <Text style={styles.headerAddBtnText}>Add files</Text>
            </AnimatedPressable>
          </View>
        )}
      </View>

      {/* One settings-style card per group: no grid and no per-item cards */}
      <FlatList
        key={activeFolderId ?? 'root'}
        data={listSections}
        extraData={isDark}
        keyExtractor={(section) => section.id}
        renderItem={({ item: section }) => (
          <View
            style={[
              styles.sectionBlock,
              section.showDivider && styles.sectionBlockWithDivider,
            ]}>
            {section.showDivider && (
              <View
                style={[styles.sectionDivider, isDark && styles.sectionDividerDark]}
              />
            )}

            <View style={styles.sectionHeading}>
              <Text
                style={[
                  styles.sectionTitle,
                  isDark && styles.textSecondaryDark,
                ]}>
                {section.title}
              </Text>
              <Text style={styles.sectionCount}>{section.count}</Text>
            </View>

            <View style={[styles.settingsCard, isDark && styles.settingsCardDark]}>
              {section.kind === 'folder'
                ? section.items.map((folder, index) => (
                    <FolderRow
                      key={folder.id}
                      folder={folder}
                      itemCount={folderCounts[folder.id] ?? 0}
                      isLast={index === section.items.length - 1}
                      onPress={() => handleOpenFolder(folder)}
                      onDelete={() => handleDeleteFolder(folder)}
                    />
                  ))
                : section.items.map((doc, index) => (
                    <DocumentRow
                      key={doc.id}
                      document={doc}
                      isLast={index === section.items.length - 1}
                      onPress={() => setOpenWithDocument(doc)}
                      onDelete={() => handleDeleteDocument(doc)}
                    />
                  ))}
            </View>
          </View>
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          documentEmptyMessage ? (
            <View style={styles.emptyBox}>
              <FileText size={22} color="#A8A29E" style={{ marginBottom: 6 }} />
              <Text style={styles.emptyTitle}>{documentEmptyMessage}</Text>
            </View>
          ) : undefined
        }
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={5}
        removeClippedSubviews={Platform.OS === 'android'}
      />

      {/* Sort / Filter Modal */}
      <Modal
        visible={isSortModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsSortModalVisible(false)}
        statusBarTranslucent>
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setIsSortModalVisible(false)}>
          <View style={[styles.sortModalCard, isDark && styles.sortModalCardDark]}>
            <View style={styles.sortModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Filter size={15} color={BrandColors.primary} style={{ marginRight: 8 }} />
                <Text style={[styles.sortModalTitle, isDark && styles.textPrimaryDark]}>Sort Documents</Text>
              </View>
              <AnimatedPressable
                scaleTo={0.88}
                onPress={() => setIsSortModalVisible(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={17} color={isDark ? '#A8A29E' : '#78716C'} />
              </AnimatedPressable>
            </View>

            {sortOptions.map((opt) => {
              const isSelected = sortBy === opt.key;
              return (
                <AnimatedPressable
                  key={opt.key}
                  style={[
                    styles.sortOptionRow,
                    isDark && styles.sortOptionRowDark,
                    isSelected && (isDark ? styles.sortOptionRowSelectedDark : styles.sortOptionRowSelected),
                  ]}
                  scaleTo={0.96}
                  onPress={() => {
                    setSortBy(opt.key);
                    setIsSortModalVisible(false);
                  }}>
                  <Text
                    style={[
                      styles.sortOptionText,
                      isDark && styles.textSecondaryDark,
                      isSelected && styles.sortOptionTextSelected,
                    ]}>
                    {opt.label}
                  </Text>
                  {isSelected && <Check size={15} color={BrandColors.primary} strokeWidth={2.4} />}
                </AnimatedPressable>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FBF9F7',
  },
  containerDark: {
    backgroundColor: '#0A0604',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1C1917',
    letterSpacing: -0.4,
  },
  folderBackBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0E6DF',
    marginRight: 8,
  },
  folderBackBtnDark: {
    backgroundColor: '#17120F',
    borderColor: '#261C16',
  },
  folderHeaderCopy: {
    flexShrink: 1,
  },
  folderHeaderTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1C1917',
    letterSpacing: -0.3,
  },
  folderHeaderMeta: {
    fontSize: 11,
    color: '#8C857E',
    marginTop: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  headerAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BrandColors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    ...SoftShadows.button,
  },
  headerAddBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFDFB',
  },
  headerIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F0E6DF',
  },
  headerIconBtnDark: {
    backgroundColor: '#17120F',
    borderColor: '#261C16',
  },
  headerContainer: {
    paddingBottom: 4,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: '#F0E6DF',
    marginBottom: 12,
  },
  sectionDividerDark: {
    backgroundColor: '#2A1F19',
  },
  sectionBlock: {
    marginBottom: 18,
  },
  sectionBlockWithDivider: {
    paddingTop: 2,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 4,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#8C857E',
  },
  sectionCount: {
    fontSize: 10,
    fontWeight: '700',
    color: BrandColors.primaryDeep,
    backgroundColor: '#FFF4ED',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  settingsCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.2,
    borderColor: '#F0E6DF',
    borderRadius: 20,
    overflow: 'hidden',
    ...SoftShadows.card,
  },
  settingsCardDark: {
    backgroundColor: '#17120F',
    borderColor: '#261C16',
    shadowColor: '#000000',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E7E5E4',
  },
  searchBarDark: {
    backgroundColor: '#17120F',
    borderColor: '#261C16',
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#1C1917',
    padding: 0,
  },
  searchInputDark: {
    color: '#FFFDFB',
  },

  // Unified Category & Toolbar Row
  unifiedFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 8,
  },
  categoryScroll: {
    flex: 1,
  },
  categoryScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingRight: 4,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E5E4',
    gap: 4,
    minHeight: 30,
  },
  categoryPillDark: {
    backgroundColor: '#17120F',
    borderColor: '#261C16',
  },
  categoryPillActive: {
    backgroundColor: BrandColors.primary,
    borderColor: BrandColors.primary,
  },
  categoryPillText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#78716C',
  },
  categoryPillTextActive: {
    color: '#FFFDFB',
    fontWeight: '700',
  },
  categoryBadge: {
    backgroundColor: '#F5F5F4',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 6,
  },
  categoryBadgeDark: {
    backgroundColor: '#241B16',
  },
  categoryBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
  },
  categoryBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#78716C',
  },
  categoryBadgeTextActive: {
    color: '#FFFDFB',
  },

  // 2. Sort & View Tools Row (With clear space above)
  toolsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  toolsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toolsCountText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#78716C',
  },
  activeSortBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF4ED',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FCD8C1',
  },
  activeSortBadgeDark: {
    backgroundColor: '#2B160C',
    borderColor: BrandColors.primary,
  },
  activeSortBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: BrandColors.primaryDeep,
  },
  toolsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E7E5E4',
    position: 'relative',
  },
  filterIconBtnDark: {
    backgroundColor: '#17120F',
    borderColor: '#261C16',
  },
  filterIconBtnActive: {
    borderColor: BrandColors.primary,
    backgroundColor: '#FFF7F2',
  },
  filterActiveDot: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: BrandColors.primary,
  },

  listContent: {
    paddingHorizontal: 16,
    paddingTop: 2,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 13,
    color: '#A8A29E',
    fontWeight: '500',
  },
  fab: {
    position: 'absolute',
    right: 18,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: BrandColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...SoftShadows.button,
    zIndex: 10,
  },

  // Sort Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  sortModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#F0E6DF',
    ...SoftShadows.modal,
  },
  sortModalCardDark: {
    backgroundColor: '#17120F',
    borderColor: '#261C16',
    shadowColor: '#000000',
  },
  sortModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F5ECE5',
  },
  sortModalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1C1917',
  },
  sortOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
  },
  sortOptionRowDark: {
    backgroundColor: 'transparent',
  },
  sortOptionRowSelected: {
    backgroundColor: '#FFF7F2',
  },
  sortOptionRowSelectedDark: {
    backgroundColor: '#2B160C',
  },
  sortOptionText: {
    fontSize: 13,
    color: '#78716C',
    fontWeight: '500',
  },
  sortOptionTextSelected: {
    color: BrandColors.primaryDeep,
    fontWeight: '700',
  },

  textPrimaryDark: {
    color: '#FFFDFB',
  },
  textSecondaryDark: {
    color: '#A8A29E',
  },
});
