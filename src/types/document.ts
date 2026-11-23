export type DocumentCategory =
  | 'files'
  | 'photos'
  | 'videos'
  | 'folders'
  | 'pdf'
  | 'doc'
  | 'aadhaar'
  | 'pan'
  | 'passport'
  | 'certificates'
  | 'financial'
  | 'medical'
  | 'other';

export interface FolderRecord {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface DocumentRecord {
  id: string;
  name: string;
  folderId?: string | null;
  fileType: 'pdf' | 'image' | 'video' | 'doc' | 'other';
  originalSize: number;
  mimeType: string;
  encryptedFilePath: string;
  encryptedDek: string; // Base64 encoded wrapped DEK
  dekIv: string; // Base64 encoded IV used for DEK wrapping
  fileIv: string; // Base64 encoded IV used for file encryption
  fileTag: string; // Base64 encoded GCM Auth Tag
  fileSha256: string; // Checksum for file integrity verification
  category: DocumentCategory;
  expiryDate?: number | null;
  isFavorite: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface CategoryCardData {
  id: DocumentCategory;
  title: string;
  subtitle: string;
  imageAsset: any;
  colorScheme: 'pink' | 'dark' | 'cyan' | 'peach' | 'orange';
  itemCount?: number;
}

export type AuditAction = 'CREATED' | 'VIEWED' | 'EXPORTED' | 'DELETED' | 'KEY_ROTATED';

export interface AuditLogRecord {
  id: string;
  documentId?: string | null;
  action: AuditAction;
  timestamp: number;
  status: 'SUCCESS' | 'FAILED';
  details?: string;
}
