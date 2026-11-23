import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Trash2 } from 'lucide-react-native';

import { BrandColors } from '../../constants/theme';
import type { DocumentRecord } from '../../types/document';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { DocumentTypeIcon, getDocumentKindMeta } from './DocumentTypeIcon';

const imagesCardAsset = require('../../../assets/3d/images-card-cut.png');
const videoCardAsset = require('../../../assets/3d/video-card-cut.png');

interface DocumentRowProps {
  document: DocumentRecord;
  isLast?: boolean;
  onPress: () => void;
  onDelete?: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

/** A single settings-style row. The parent card supplies the border and radius. */
export const DocumentRow: React.FC<DocumentRowProps> = React.memo(({
  document,
  isLast = false,
  onPress,
  onDelete,
}) => {
  const isDark = useColorScheme() === 'dark';
  const meta = getDocumentKindMeta(document);

  return (
    <AnimatedPressable
      scaleTo={0.99}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Open ${document.name}`}
      style={[
        styles.row,
        isDark && styles.rowDark,
        !isLast && (isDark ? styles.dividerDark : styles.divider),
      ]}>
      {meta.kind === 'image' ? (
        <View style={[styles.iconWell, isDark && styles.iconWellDark]}>
          <Image
            source={imagesCardAsset}
            style={styles.iconImage}
            contentFit="contain"
            transition={150}
            cachePolicy="memory-disk"
          />
        </View>
      ) : meta.kind === 'video' ? (
        <View style={[styles.iconWell, isDark && styles.iconWellDark]}>
          <Image
            source={videoCardAsset}
            style={styles.iconImage}
            contentFit="contain"
            transition={150}
            cachePolicy="memory-disk"
          />
        </View>
      ) : (
        <DocumentTypeIcon document={document} size={42} isDark={isDark} />
      )}

      <View style={styles.text}>
        <Text
          style={[styles.title, isDark && styles.textPrimaryDark]}
          numberOfLines={1}>
          {document.name}
        </Text>
        <View style={styles.metaRow}>
          <View
            style={[
              styles.typeBadge,
              {
                backgroundColor: isDark ? meta.bgDark : meta.bgLight,
                borderColor: isDark ? meta.borderDark : meta.borderLight,
              },
            ]}>
            <Text style={[styles.typeBadgeText, { color: meta.accent }]}>
              {meta.label}
            </Text>
          </View>
          <Text style={[styles.metaText, isDark && styles.textSecondaryDark]}>
            {formatBytes(document.originalSize)}
          </Text>
          <Text style={styles.metaDot}>·</Text>
          <Text style={[styles.metaText, isDark && styles.textSecondaryDark]}>
            {formatDate(document.createdAt)}
          </Text>
        </View>
      </View>

      {onDelete && (
        <AnimatedPressable
          style={styles.deleteBtn}
          scaleTo={0.88}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={`Delete ${document.name}`}
          onPress={onDelete}>
          <Trash2 size={16} color="#FFFDFB" strokeWidth={2.2} />
        </AnimatedPressable>
      )}
    </AnimatedPressable>
  );
});

DocumentRow.displayName = 'DocumentRow';

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 68,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: '#FFFFFF',
  },
  rowDark: {
    backgroundColor: '#17120F',
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: '#F5EFE9',
  },
  dividerDark: {
    borderBottomWidth: 1,
    borderBottomColor: '#261C16',
  },
  iconWell: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF7F2',
    borderWidth: 1,
    borderColor: '#FCE7DB',
  },
  iconWellDark: {
    backgroundColor: '#261710',
    borderColor: '#3D2214',
  },
  iconImage: {
    width: 34,
    height: 34,
  },
  text: {
    flex: 1,
    minWidth: 0,
    marginRight: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1C1917',
    letterSpacing: -0.1,
    marginBottom: 3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  typeBadge: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 0.8,
    marginRight: 2,
  },
  typeBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  metaText: {
    fontSize: 11,
    color: '#8C857E',
    fontWeight: '500',
  },
  metaDot: {
    fontSize: 10,
    color: '#D6D3D1',
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    backgroundColor: BrandColors.primary,
  },
  textPrimaryDark: {
    color: '#FFFDFB',
  },
  textSecondaryDark: {
    color: '#A8A29E',
  },
});
