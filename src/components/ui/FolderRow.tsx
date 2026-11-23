import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { ChevronRight, Trash2 } from 'lucide-react-native';

import { BrandColors } from '../../constants/theme';
import type { FolderRecord } from '../../types/document';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';

const folderArt = require('../../../assets/3d/folder-dark-cut.png');

interface FolderRowProps {
  folder: FolderRecord;
  itemCount: number;
  isLast?: boolean;
  onPress: () => void;
  onDelete?: () => void;
}

function countLabel(count: number): string {
  if (count === 0) return 'Empty folder';
  return `${count} ${count === 1 ? 'file' : 'files'}`;
}

/** A single settings-style row. The parent card supplies the border and radius. */
export const FolderRow: React.FC<FolderRowProps> = React.memo(({
  folder,
  itemCount,
  isLast = false,
  onPress,
  onDelete,
}) => {
  const isDark = useColorScheme() === 'dark';

  return (
    <AnimatedPressable
      scaleTo={0.99}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Open folder ${folder.name}`}
      style={[
        styles.row,
        isDark && styles.rowDark,
        !isLast && (isDark ? styles.dividerDark : styles.divider),
      ]}>
      <View style={[styles.iconWell, isDark && styles.iconWellDark]}>
        <Image
          source={folderArt}
          style={styles.iconImage}
          contentFit="contain"
          cachePolicy="memory-disk"
        />
      </View>

      <View style={styles.text}>
        <Text
          style={[styles.title, isDark && styles.textPrimaryDark]}
          numberOfLines={1}>
          {folder.name}
        </Text>
        <Text style={[styles.subtitle, isDark && styles.textSecondaryDark]}>
          {countLabel(itemCount)} · Secured folder
        </Text>
      </View>

      <View style={styles.trailing}>
        {onDelete && (
          <AnimatedPressable
            style={styles.deleteBtn}
            scaleTo={0.88}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={`Delete folder ${folder.name}`}
            onPress={onDelete}>
            <Trash2 size={16} color="#FFFDFB" strokeWidth={2.2} />
          </AnimatedPressable>
        )}
        <ChevronRight size={16} color={isDark ? '#6B5B52' : '#C4B5AC'} />
      </View>
    </AnimatedPressable>
  );
});

FolderRow.displayName = 'FolderRow';

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
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1C1917',
    letterSpacing: -0.1,
  },
  subtitle: {
    fontSize: 11,
    color: '#8C857E',
    marginTop: 2,
  },
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BrandColors.primary,
  },
  textPrimaryDark: {
    color: '#FFFDFB',
  },
  textSecondaryDark: {
    color: '#A8A29E',
  },
});
