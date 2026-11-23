import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  FileText,
  Music,
  Film,
  Image as ImageIcon,
} from 'lucide-react-native';
import {
  PdfFileIcon,
  WordFileIcon,
  SheetFileIcon,
  PptFileIcon,
  CodeFileIcon,
  ZipFileIcon,
} from '@/components/icons/FileTypeIcons';
import type { DocumentRecord } from '@/types/document';

export type DocumentFileKind =
  | 'pdf'
  | 'doc'
  | 'sheet'
  | 'presentation'
  | 'text'
  | 'archive'
  | 'audio'
  | 'image'
  | 'video'
  | 'other';

export interface DocumentKindMeta {
  kind: DocumentFileKind;
  label: string;
  accent: string;
  bgLight: string;
  bgDark: string;
  borderLight: string;
  borderDark: string;
}

/**
 * Detects the display kind from stored fileType, extension, or MIME type.
 */
export function getDocumentFileKind(
  doc: Pick<DocumentRecord, 'fileType' | 'name' | 'mimeType'>
): DocumentFileKind {
  const lowerName = (doc.name || '').toLowerCase();
  const mime = (doc.mimeType || '').toLowerCase();

  if (doc.fileType === 'pdf' || lowerName.endsWith('.pdf') || mime.includes('pdf')) {
    return 'pdf';
  }

  if (
    doc.fileType === 'doc' ||
    /\.(doc|docx|rtf|odt)$/.test(lowerName) ||
    mime.includes('msword') ||
    mime.includes('wordprocessingml')
  ) {
    return 'doc';
  }

  if (
    /\.(xls|xlsx|csv|tsv|ods)$/.test(lowerName) ||
    mime.includes('spreadsheet') ||
    mime.includes('excel') ||
    mime.includes('csv')
  ) {
    return 'sheet';
  }

  if (
    /\.(ppt|pptx|odp|key)$/.test(lowerName) ||
    mime.includes('presentation') ||
    mime.includes('powerpoint')
  ) {
    return 'presentation';
  }

  if (
    /\.(txt|md|markdown|json|xml|html|htm|css|js|ts|tsx|jsx|yaml|yml|sh|log|ini|env)$/.test(lowerName) ||
    mime.startsWith('text/') ||
    mime.includes('json') ||
    mime.includes('xml')
  ) {
    return 'text';
  }

  if (
    /\.(zip|rar|7z|tar|gz|bz2|xz)$/.test(lowerName) ||
    mime.includes('zip') ||
    mime.includes('compressed') ||
    mime.includes('tar')
  ) {
    return 'archive';
  }

  if (
    /\.(mp3|wav|m4a|aac|flac|ogg|wma)$/.test(lowerName) ||
    mime.startsWith('audio/')
  ) {
    return 'audio';
  }

  if (
    doc.fileType === 'image' ||
    /\.(png|jpe?g|webp|gif|bmp|svg|heic)$/.test(lowerName) ||
    mime.startsWith('image/')
  ) {
    return 'image';
  }

  if (
    doc.fileType === 'video' ||
    /\.(mp4|mov|mkv|webm|avi|3gp)$/.test(lowerName) ||
    mime.startsWith('video/')
  ) {
    return 'video';
  }

  return 'other';
}

export function getDocumentKindMeta(
  doc: Pick<DocumentRecord, 'fileType' | 'name' | 'mimeType'>
): DocumentKindMeta {
  const kind = getDocumentFileKind(doc);
  const lowerName = (doc.name || '').toLowerCase();

  switch (kind) {
    case 'pdf':
      return {
        kind,
        label: 'PDF',
        accent: '#E11D48',
        bgLight: '#FFF1F2',
        bgDark: '#2C1015',
        borderLight: '#FECDD3',
        borderDark: '#5E1A24',
      };
    case 'doc':
      return {
        kind,
        label: lowerName.endsWith('.docx') ? 'DOCX' : 'WORD',
        accent: '#2563EB',
        bgLight: '#EFF6FF',
        bgDark: '#122038',
        borderLight: '#BFDBFE',
        borderDark: '#1E3A66',
      };
    case 'sheet':
      return {
        kind,
        label: lowerName.endsWith('.csv') ? 'CSV' : lowerName.endsWith('.xls') ? 'XLS' : 'SHEET',
        accent: '#059669',
        bgLight: '#ECFDF5',
        bgDark: '#0D271D',
        borderLight: '#A7F3D0',
        borderDark: '#164E38',
      };
    case 'presentation':
      return {
        kind,
        label: lowerName.endsWith('.pptx') ? 'PPTX' : 'SLIDES',
        accent: '#EA580C',
        bgLight: '#FFF7ED',
        bgDark: '#2E170C',
        borderLight: '#FED7AA',
        borderDark: '#56250F',
      };
    case 'text':
      return {
        kind,
        label: lowerName.endsWith('.md') ? 'MD' : lowerName.endsWith('.json') ? 'JSON' : 'TXT',
        accent: '#7C3AED',
        bgLight: '#F5F3FF',
        bgDark: '#22153B',
        borderLight: '#DDD6FE',
        borderDark: '#432675',
      };
    case 'archive':
      return {
        kind,
        label: lowerName.endsWith('.rar') ? 'RAR' : lowerName.endsWith('.7z') ? '7Z' : 'ZIP',
        accent: '#D97706',
        bgLight: '#FFFBEB',
        bgDark: '#2A1D0B',
        borderLight: '#FDE68A',
        borderDark: '#563B12',
      };
    case 'audio':
      return {
        kind,
        label: 'AUDIO',
        accent: '#0891B2',
        bgLight: '#ECFEFF',
        bgDark: '#0C272E',
        borderLight: '#A5F3FC',
        borderDark: '#154B58',
      };
    case 'image':
      return {
        kind,
        label: 'IMG',
        accent: '#FF7A00',
        bgLight: '#FFF7ED',
        bgDark: '#2B160C',
        borderLight: '#FFEDD5',
        borderDark: '#502812',
      };
    case 'video':
      return {
        kind,
        label: 'VIDEO',
        accent: '#10B981',
        bgLight: '#ECFDF5',
        bgDark: '#0E281F',
        borderLight: '#A7F3D0',
        borderDark: '#154B3A',
      };
    default: {
      const ext = lowerName.split('.').pop()?.toUpperCase() || 'FILE';
      const cleanExt = ext.length <= 4 ? ext : 'FILE';
      return {
        kind,
        label: cleanExt,
        accent: '#EA580C',
        bgLight: '#FFF4ED',
        bgDark: '#27170E',
        borderLight: '#FED7AA',
        borderDark: '#4B2715',
      };
    }
  }
}

interface DocumentTypeIconProps {
  document: Pick<DocumentRecord, 'fileType' | 'name' | 'mimeType'>;
  size?: number;
  isDark?: boolean;
  showBadge?: boolean;
}

const DocumentTypeIconComponent: React.FC<DocumentTypeIconProps> = ({
  document,
  size = 56,
  isDark = false,
  showBadge,
}) => {
  const meta = getDocumentKindMeta(document);
  const iconSize = Math.max(16, Math.round(size * 0.44));
  const fileIconSize = Math.max(28, Math.round(size * 0.72));

  const renderIcon = () => {
    switch (meta.kind) {
      case 'pdf':
        return <PdfFileIcon size={fileIconSize} />;
      case 'doc':
        return <WordFileIcon size={fileIconSize} />;
      case 'sheet':
        return <SheetFileIcon size={fileIconSize} />;
      case 'presentation':
        return <PptFileIcon size={fileIconSize} />;
      case 'text':
        return <CodeFileIcon size={fileIconSize} />;
      case 'archive':
        return <ZipFileIcon size={fileIconSize} />;
      case 'audio':
        return <Music size={iconSize} color={meta.accent} strokeWidth={2} />;
      case 'image':
        return <ImageIcon size={iconSize} color={meta.accent} strokeWidth={2} />;
      case 'video':
        return <Film size={iconSize} color={meta.accent} strokeWidth={2} />;
      default:
        return <FileText size={iconSize} color={meta.accent} strokeWidth={2} />;
    }
  };

  const isSmall = size < 46;
  const isDocumentCardArt = [
    'pdf',
    'doc',
    'sheet',
    'presentation',
    'text',
    'archive',
  ].includes(meta.kind);
  const displayBadge = showBadge ?? !isDocumentCardArt;

  return (
    <View
      accessible
      accessibilityLabel={`${meta.label} document`}
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: Math.max(10, Math.round(size * 0.22)),
          backgroundColor: isDark ? meta.bgDark : meta.bgLight,
          borderColor: isDark ? meta.borderDark : meta.borderLight,
        },
      ]}>
      {renderIcon()}
      {displayBadge && (
        <View
          style={[
            styles.badge,
            {
              backgroundColor: meta.accent,
              borderColor: isDark ? '#140F0D' : '#FFFFFF',
              borderRadius: Math.max(4, Math.round(size * 0.1)),
              paddingHorizontal: isSmall ? 3 : Math.max(4, Math.round(size * 0.08)),
              paddingVertical: isSmall ? 0.5 : 1,
              right: isSmall ? 1 : Math.max(2, Math.round(size * 0.04)),
              bottom: isSmall ? 1 : Math.max(2, Math.round(size * 0.04)),
            },
          ]}>
          <Text
            numberOfLines={1}
            style={[
              styles.badgeText,
              { fontSize: isSmall ? 7.5 : Math.max(8, Math.round(size * 0.13)) },
            ]}>
            {meta.label}
          </Text>
        </View>
      )}
    </View>
  );
};

export const DocumentTypeIcon = React.memo(DocumentTypeIconComponent);
DocumentTypeIcon.displayName = 'DocumentTypeIcon';

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.2,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFFDFB',
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
