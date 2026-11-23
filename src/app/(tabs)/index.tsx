import React, { useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { ChevronRight, LockKeyhole, ShieldCheck } from 'lucide-react-native';

import { BrandColors, SoftShadows } from '@/constants/theme';
import { NeedsLockerHorizontalLogo } from '@/components/brand/NeedsLockerLogo';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { DocumentTypeIcon, getDocumentFileKind } from '@/components/ui/DocumentTypeIcon';
import { useVaultStore } from '@/store/vaultStore';
import { DocumentCategory } from '@/types/document';
import { useColorScheme } from '@/hooks/use-color-scheme';

// 3D renders trimmed to their visible artwork so they scale consistently
const folderArt = require('../../../assets/3d/folder-dark-cut.png');
const photosArt = require('../../../assets/3d/images-card-cut.png');
const videosArt = require('../../../assets/3d/video-card-cut.png');

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDate(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}



export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === 'dark';
  const {
    documents,
    setSelectedCategory,
    setActiveFolder,
    setOpenWithDocument,
  } = useVaultStore();

  const { filesCount, photosCount, videosCount, totalSizeBytes } = useMemo(() => {
    let files = 0;
    let photos = 0;
    let videos = 0;
    let totalSize = 0;
    for (const d of documents) {
      totalSize += d.originalSize;
      if (d.category === 'files') files++;
      else if (d.category === 'photos') photos++;
      else if (d.category === 'videos') videos++;
    }
    return {
      filesCount: files,
      photosCount: photos,
      videosCount: videos,
      totalSizeBytes: totalSize,
    };
  }, [documents]);

  const formattedTotalStorage = useMemo(() => {
    if (totalSizeBytes === 0) return '0 KB';
    const mb = totalSizeBytes / (1024 * 1024);
    if (mb < 1) return `${(totalSizeBytes / 1024).toFixed(1)} KB`;
    return `${mb.toFixed(2)} MB`;
  }, [totalSizeBytes]);

  const recentDocuments = useMemo(() => {
    return [...documents].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5);
  }, [documents]);

  const handleSelectCategory = (cat: DocumentCategory) => {
    setActiveFolder(null);
    setSelectedCategory(cat);
    router.push('/documents');
  };

  const handleViewAll = () => {
    setActiveFolder(null);
    setSelectedCategory('all');
    router.push('/documents');
  };

  const artForDocument = (category: DocumentCategory, fileType?: string) => {
    if (category === 'photos' || fileType === 'image') return photosArt;
    if (category === 'videos' || fileType === 'video') return videosArt;
    return folderArt;
  };

  return (
    <SafeAreaView
      style={[styles.container, isDark && styles.containerDark]}
      edges={['top', 'left', 'right']}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Header */}
      <View style={styles.header}>
        <NeedsLockerHorizontalLogo height={30} />
        <View style={[styles.statusChip, isDark && styles.statusChipDark]}>
          <ShieldCheck size={13} color={BrandColors.securityMint} strokeWidth={2.4} />
          <Text style={[styles.statusChipText, isDark && styles.textSecondaryDark]}>
            Encrypted
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 96 }]}
        showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={[styles.hero, isDark && styles.heroDark]}>
          <View
            style={[styles.heroGlow, isDark && styles.heroGlowDark]}
            pointerEvents="none"
          />
          <View style={styles.heroCopy}>
            <View style={[styles.heroBadge, isDark && styles.heroBadgeDark]}>
              <LockKeyhole size={12} color={BrandColors.wordmark} strokeWidth={2.4} />
              <Text style={styles.heroBadgeText}>PRIVATE VAULT</Text>
            </View>
            <Text style={[styles.heroLabel, isDark && styles.textSecondaryDark]}>
              Total secured
            </Text>
            <Text style={[styles.heroValue, isDark && styles.textPrimaryDark]}>
              {formattedTotalStorage}
            </Text>
            <Text style={[styles.heroMeta, isDark && styles.textSecondaryDark]}>
              {documents.length} {documents.length === 1 ? 'file' : 'files'} encrypted on this device
            </Text>
          </View>
          <Image source={folderArt} style={styles.heroArt} contentFit="contain" />
        </View>

        {/* Categories */}
        <View style={styles.sectionRow}>
          <Text style={[styles.sectionTitle, isDark && styles.textPrimaryDark]}>
            Categories
          </Text>
        </View>

        {/* Unified 3-Column Category Hub */}
        <View style={[styles.categoryHub, isDark && styles.categoryHubDark]}>
          <AnimatedPressable
            style={styles.categoryTile}
            scaleTo={0.94}
            onPress={() => handleSelectCategory('files')}>
            <View style={styles.categoryIconBox}>
              <Image source={folderArt} style={styles.categoryTileImage} contentFit="contain" />
            </View>
            <Text style={[styles.categoryTileTitle, isDark && styles.textPrimaryDark]}>Files</Text>
            <Text style={[styles.categoryTileCount, isDark && styles.textSecondaryDark]}>
              {filesCount} {filesCount === 1 ? 'file' : 'files'}
            </Text>
          </AnimatedPressable>

          <View style={[styles.categoryDivider, isDark && styles.categoryDividerDark]} />

          <AnimatedPressable
            style={styles.categoryTile}
            scaleTo={0.94}
            onPress={() => handleSelectCategory('photos')}>
            <View style={styles.categoryIconBox}>
              <Image source={photosArt} style={styles.categoryTileImage} contentFit="contain" />
            </View>
            <Text style={[styles.categoryTileTitle, isDark && styles.textPrimaryDark]}>Photos</Text>
            <Text style={[styles.categoryTileCount, isDark && styles.textSecondaryDark]}>
              {photosCount} {photosCount === 1 ? 'item' : 'items'}
            </Text>
          </AnimatedPressable>

          <View style={[styles.categoryDivider, isDark && styles.categoryDividerDark]} />

          <AnimatedPressable
            style={styles.categoryTile}
            scaleTo={0.94}
            onPress={() => handleSelectCategory('videos')}>
            <View style={styles.categoryIconBox}>
              <Image source={videosArt} style={styles.categoryTileImage} contentFit="contain" />
            </View>
            <Text style={[styles.categoryTileTitle, isDark && styles.textPrimaryDark]}>Videos</Text>
            <Text style={[styles.categoryTileCount, isDark && styles.textSecondaryDark]}>
              {videosCount} {videosCount === 1 ? 'clip' : 'clips'}
            </Text>
          </AnimatedPressable>
        </View>

        {/* Recent */}
        <View style={[styles.sectionRow, styles.recentSectionRow]}>
          <Text style={[styles.sectionTitle, isDark && styles.textPrimaryDark]}>Recent</Text>
          {documents.length > 0 && (
            <AnimatedPressable
              scaleTo={0.94}
              onPress={handleViewAll}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.seeAll}>
              <Text style={styles.seeAllText}>See all</Text>
              <ChevronRight size={14} color={BrandColors.wordmark} strokeWidth={2.4} />
            </AnimatedPressable>
          )}
        </View>

        {recentDocuments.length === 0 ? (
          <View style={[styles.emptyCard, isDark && styles.emptyCardDark]}>
            <View style={[styles.emptyIcon, isDark && styles.emptyIconDark]}>
              <LockKeyhole size={22} color={BrandColors.wordmark} strokeWidth={2} />
            </View>
            <Text style={[styles.emptyTitle, isDark && styles.textPrimaryDark]}>
              Nothing here yet
            </Text>
            <Text style={[styles.emptyText, isDark && styles.textSecondaryDark]}>
              Add a file or photo to start your private collection
            </Text>
          </View>
        ) : (
          <View style={[styles.recentList, isDark && styles.recentListDark]}>
            {recentDocuments.map((doc, index) => {
              const fileKind = getDocumentFileKind(doc);
              const usesArt = fileKind === 'image' || fileKind === 'video';

              return (
                <AnimatedPressable
                  key={doc.id}
                  style={[
                    styles.recentRow,
                    isDark && styles.recentRowDark,
                    index === recentDocuments.length - 1 && styles.recentRowLast,
                  ]}
                  scaleTo={0.98}
                  onPress={() => setOpenWithDocument(doc)}>
                  {usesArt ? (
                    <View style={[styles.recentThumb, isDark && styles.recentThumbDark]}>
                      <Image
                        source={artForDocument(doc.category, doc.fileType)}
                        style={styles.recentThumbArt}
                        contentFit="contain"
                        cachePolicy="memory-disk"
                      />
                    </View>
                  ) : (
                    <DocumentTypeIcon document={doc} size={46} isDark={isDark} />
                  )}
                  <View style={styles.recentInfo}>
                    <Text
                      style={[styles.recentName, isDark && styles.textPrimaryDark]}
                      numberOfLines={1}>
                      {doc.name}
                    </Text>
                    <Text style={[styles.recentMeta, isDark && styles.textSecondaryDark]}>
                      {formatBytes(doc.originalSize)}  ·  {formatDate(doc.createdAt)}
                    </Text>
                  </View>
                  <ChevronRight size={16} color={isDark ? '#6B5B52' : '#C4B5AC'} />
                </AnimatedPressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FBF9F7',
  },
  containerDark: {
    backgroundColor: BrandColors.pitchBlack,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 8,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#F0E6DF',
  },
  statusChipDark: {
    backgroundColor: '#17120F',
    borderColor: '#261C16',
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#78716C',
  },
  content: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingTop: 4,
  },

  // Hero
  hero: {
    position: 'relative',
    minHeight: 122,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0E6DF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    ...SoftShadows.card,
  },
  heroDark: {
    backgroundColor: '#17120F',
    borderColor: '#261C16',
    shadowColor: '#000000',
  },
  heroGlow: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: '#FFF7F1',
    top: -48,
    right: -26,
  },
  heroGlowDark: {
    backgroundColor: '#21160F',
  },
  heroCopy: {
    flex: 1,
    zIndex: 1,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    backgroundColor: '#FFF8F2',
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 7,
    borderWidth: 1,
    borderColor: '#FBE3D1',
  },
  heroBadgeDark: {
    backgroundColor: '#2A1B13',
    borderColor: '#3A2418',
  },
  heroBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.7,
    color: BrandColors.wordmark,
  },
  heroLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8C857E',
  },
  heroValue: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1C1917',
    letterSpacing: -0.8,
    marginTop: 1,
  },
  heroMeta: {
    fontSize: 11,
    color: '#8C857E',
    marginTop: 3,
  },
  heroArt: {
    width: 96,
    height: 84,
    marginLeft: -4,
    zIndex: 1,
  },

  // Sections
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 14,
    marginBottom: 8,
  },
  recentSectionRow: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1C1917',
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: '#8C857E',
    marginTop: 1,
  },
  seeAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingBottom: 2,
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: BrandColors.wordmark,
  },

  // Categories (Unified Horizontal Island)
  categoryHub: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1.2,
    borderColor: '#F0E6DF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    ...SoftShadows.card,
  },
  categoryHubDark: {
    backgroundColor: '#17120F',
    borderColor: '#261C16',
    shadowColor: '#000000',
  },
  categoryTile: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  categoryIconBox: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  categoryTileImage: {
    width: 48,
    height: 48,
  },
  categoryTileTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1C1917',
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  categoryTileCount: {
    fontSize: 10.5,
    fontWeight: '500',
    color: '#8C857E',
  },
  categoryDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#F0E6DF',
  },
  categoryDividerDark: {
    backgroundColor: '#261C16',
  },

  // Recent
  recentList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F0E6DF',
    paddingHorizontal: 12,
    ...SoftShadows.card,
  },
  recentListDark: {
    backgroundColor: '#17120F',
    borderColor: '#261C16',
    shadowColor: '#000000',
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F1ED',
  },
  recentRowLast: {
    borderBottomWidth: 0,
  },
  recentRowDark: {
    borderBottomColor: '#261C16',
  },
  recentThumb: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#FFF4EA',
    borderWidth: 1,
    borderColor: '#FBE7D6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentThumbDark: {
    backgroundColor: '#221710',
    borderColor: '#33231A',
  },
  recentThumbArt: {
    width: 34,
    height: 30,
  },
  recentInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  recentName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1C1917',
    marginBottom: 3,
  },
  recentMeta: {
    fontSize: 11,
    color: '#8C857E',
  },

  // Empty state
  emptyCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F0E6DF',
    paddingVertical: 28,
    paddingHorizontal: 24,
  },
  emptyCardDark: {
    backgroundColor: '#17120F',
    borderColor: '#261C16',
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#FFF4EA',
    borderWidth: 1,
    borderColor: '#FBE7D6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyIconDark: {
    backgroundColor: '#221710',
    borderColor: '#33231A',
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1C1917',
  },
  emptyText: {
    fontSize: 12,
    color: '#8C857E',
    textAlign: 'center',
    marginTop: 4,
  },

  textPrimaryDark: {
    color: '#FFFDFB',
  },
  textSecondaryDark: {
    color: '#A8A29E',
  },
});
