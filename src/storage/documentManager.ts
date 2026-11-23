import { Directory, File, Paths } from 'expo-file-system';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import {
  generateRandomBytes,
  encryptAesGcm,
  decryptAesGcmSafe,
  wrapDek,
  unwrapDek,
  uint8ArrayToBase64,
  base64ToUint8Array,
} from '../security/cipher';
import {
  insertDocument,
  deleteDocumentRecord,
  logAuditEvent,
  clearAllData,
} from '../database/db';
import { DocumentRecord, DocumentCategory } from '../types/document';

// Keep the same stored path format as before so existing vault files are still found.
const withTrailingSlash = (uri: string) => (uri.endsWith('/') ? uri : `${uri}/`);

let vaultDirectoryInstance: Directory | null = null;
let cacheTempDirectoryInstance: Directory | null = null;

function assertFileSystemAvailable(): void {
  if (Platform.OS === 'web') {
    throw new Error('Encrypted vault file storage is only available on native builds.');
  }
}

function getVaultDirectory(): Directory {
  if (!vaultDirectoryInstance) {
    assertFileSystemAvailable();
    vaultDirectoryInstance = new Directory(Paths.document, 'vault_store');
  }
  return vaultDirectoryInstance;
}

function getCacheTempDirectory(): Directory {
  if (!cacheTempDirectoryInstance) {
    assertFileSystemAvailable();
    cacheTempDirectoryInstance = new Directory(Paths.cache, 'temp_preview');
  }
  return cacheTempDirectoryInstance;
}

function getVaultDir(): string {
  return withTrailingSlash(getVaultDirectory().uri);
}

function getCacheTempDir(): string {
  return withTrailingSlash(getCacheTempDirectory().uri);
}

/** Keeps decrypted temp files using the original file extension. */
function getTempExtension(doc: DocumentRecord): string {
  const lowerName = (doc.name || '').toLowerCase();
  const lastDot = lowerName.lastIndexOf('.');
  if (lastDot !== -1 && lastDot < lowerName.length - 1) {
    const ext = lowerName.substring(lastDot);
    if (/^\.[a-z0-9]{1,8}$/.test(ext)) {
      return ext;
    }
  }
  if (doc.fileType === 'pdf') return '.pdf';
  if (doc.fileType === 'doc') return '.docx';
  if (doc.fileType === 'image') return '.jpg';
  if (doc.fileType === 'video') return '.mp4';
  return '.bin';
}

/**
 * Builds a safe user-facing file name that keeps the document's original name.
 * Invalid path characters are replaced and a type-based extension is added only
 * when the original name has none.
 */
export function getExportFileName(doc: DocumentRecord): string {
  const safeName = (doc.name || '')
    .trim()
    .replace(/[\\/:*?"<>|\u0000-\u001F]/g, '_')
    .replace(/^\.+/, '')
    .slice(0, 120)
    .trim();

  if (!safeName) {
    return `document_${Date.now()}${getTempExtension(doc)}`;
  }

  return /\.[a-z0-9]{1,8}$/i.test(safeName) ? safeName : `${safeName}${getTempExtension(doc)}`;
}

/** Shared decryption so previews and exports use exactly the same crypto path. */
async function decryptDocumentBytes(vaultKey: Uint8Array, doc: DocumentRecord): Promise<Uint8Array> {
  await ensureDirectories();

  // 1. Unwrap DEK using Vault Key (handles 48-byte GCM payload and CTR recovery fallback)
  const dek = unwrapDek(vaultKey, doc.encryptedDek, doc.dekIv, doc.fileTag);

  // 2. Read encrypted ciphertext file
  const ciphertext = await new File(doc.encryptedFilePath).bytes();
  const fileIv = base64ToUint8Array(doc.fileIv);
  const fileTag = base64ToUint8Array(doc.fileTag);

  // 3. Decrypt ciphertext using DEK safely (never crashes with invalid tag)
  return decryptAesGcmSafe(dek, ciphertext, fileIv, fileTag);
}

export async function ensureDirectories(): Promise<void> {
  const vaultDirectory = getVaultDirectory();
  const cacheTempDirectory = getCacheTempDirectory();

  if (!vaultDirectory.exists) {
    vaultDirectory.create({ intermediates: true });
  }
  if (!cacheTempDirectory.exists) {
    cacheTempDirectory.create({ intermediates: true });
  }
}

/**
 * Ingest, encrypt with AES-256-GCM, and securely store a document
 */
export async function encryptAndSaveDocument(
  vaultKey: Uint8Array,
  source: string | File,
  fileName: string,
  category: DocumentCategory,
  mimeType: string = 'application/octet-stream',
  folderId: string | null = null
): Promise<DocumentRecord> {
  await ensureDirectories();

  // 1. Read via the modern File API. When passed the File returned by
  //    File.pickFileAsync(), reading it uses the persistable READ grant that picker
  //    obtains on the content:// URI. expo-document-picker never takes that grant,
  //    which is why reading its result failed with "missing READ permission".
  const plaintext = source instanceof File ? await source.bytes() : await new File(source).bytes();
  const originalSize = plaintext.byteLength;
  const fileBase64 = uint8ArrayToBase64(plaintext);

  // 2. Generate SHA-256 checksum of original file
  const fileSha256 = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    fileBase64
  );

  // 3. Generate a dedicated 256-bit DEK (Data Encryption Key)
  const dek = generateRandomBytes(32);

  // 4. Encrypt file with DEK using AES-256-GCM
  const { ciphertext, iv: fileIv, tag: fileTag } = encryptAesGcm(dek, plaintext);

  // 5. Wrap the DEK with Vault Key (KEK)
  const { wrappedDekBase64, ivBase64: dekIvBase64 } = wrapDek(vaultKey, dek);

  // 6. Write ciphertext to sandboxed storage
  const documentId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const encryptedFilePath = `${getVaultDir()}${documentId}.enc`;

  await new File(encryptedFilePath).write(ciphertext);

  // Determine file type
  let fileType: DocumentRecord['fileType'] = 'other';
  const lowerName = fileName.toLowerCase();
  if (lowerName.endsWith('.pdf') || mimeType.includes('pdf')) {
    fileType = 'pdf';
  } else if (
    lowerName.endsWith('.doc') ||
    lowerName.endsWith('.docx') ||
    mimeType.includes('msword') ||
    mimeType.includes('wordprocessingml')
  ) {
    fileType = 'doc';
  } else if (
    lowerName.endsWith('.png') ||
    lowerName.endsWith('.jpg') ||
    lowerName.endsWith('.jpeg') ||
    lowerName.endsWith('.webp') ||
    mimeType.includes('image')
  ) {
    fileType = 'image';
  } else if (
    lowerName.endsWith('.mp4') ||
    lowerName.endsWith('.mov') ||
    mimeType.includes('video')
  ) {
    fileType = 'video';
  }

  const now = Date.now();
  const documentRecord: DocumentRecord = {
    id: documentId,
    name: fileName,
    folderId,
    fileType,
    originalSize,
    mimeType,
    encryptedFilePath,
    encryptedDek: wrappedDekBase64,
    dekIv: dekIvBase64,
    fileIv: uint8ArrayToBase64(fileIv),
    fileTag: uint8ArrayToBase64(fileTag),
    fileSha256,
    category,
    isFavorite: false,
    createdAt: now,
    updatedAt: now,
  };

  // 7. Store in SQLite DB
  await insertDocument(documentRecord);

  // 8. Log audit trail
  await logAuditEvent({
    id: `log_${Date.now()}`,
    documentId,
    action: 'CREATED',
    timestamp: now,
    status: 'SUCCESS',
    details: `Encrypted ${originalSize} bytes via AES-256-GCM`,
  });

  return documentRecord;
}

/**
 * Decrypt a document into an ephemeral file or in-memory buffer
 */
export async function decryptDocument(
  vaultKey: Uint8Array,
  doc: DocumentRecord
): Promise<{ decryptedBase64: string; ephemeralUri: string }> {
  const decrypted = await decryptDocumentBytes(vaultKey, doc);
  const decryptedBase64 = uint8ArrayToBase64(decrypted);

  // Write to ephemeral cache location for rendering
  const ephemeralUri = `${getCacheTempDir()}temp_${doc.id}${getTempExtension(doc)}`;
  await new File(ephemeralUri).write(decrypted);

  await logAuditEvent({
    id: `log_${Date.now()}`,
    documentId: doc.id,
    action: 'VIEWED',
    timestamp: Date.now(),
    status: 'SUCCESS',
  });

  return { decryptedBase64, ephemeralUri };
}

/**
 * Decrypts a vault file into the temporary preview cache using the document's
 * original file name. Used by Share and Download so the OS sees the real name
 * and extension instead of an internal `temp_<id>` name.
 *
 * The file stays inside the preview cache, so it is removed by
 * `purgePreviewCache()` when the vault locks or the action sheet closes again.
 */
export async function prepareDocumentExport(
  vaultKey: Uint8Array,
  doc: DocumentRecord
): Promise<{ file: File; fileName: string; base64: string }> {
  const decrypted = await decryptDocumentBytes(vaultKey, doc);
  const fileName = getExportFileName(doc);
  const file = new File(getCacheTempDirectory(), fileName);
  await file.write(decrypted);

  await logAuditEvent({
    id: `log_${Date.now()}`,
    documentId: doc.id,
    action: 'EXPORTED',
    timestamp: Date.now(),
    status: 'SUCCESS',
    details: fileName,
  });

  return { file, fileName, base64: uint8ArrayToBase64(decrypted) };
}

/**
 * Securely shred and delete an encrypted file
 */
export async function secureDeleteDocument(doc: DocumentRecord): Promise<void> {
  try {
    const encryptedFile = new File(doc.encryptedFilePath);
    if (encryptedFile.exists) {
      // Overwrite with random bytes (cryptographic shredding)
      const randomNoise = generateRandomBytes(Math.min(encryptedFile.size, 1024 * 64));
      await encryptedFile.write(randomNoise);
      encryptedFile.delete();
    }
  } catch (err) {
    console.error('Error during secure shred:', err);
  }

  // Purge any temporary preview files
  try {
    const ephemeralUri = `${getCacheTempDir()}temp_${doc.id}${getTempExtension(doc)}`;
    new File(ephemeralUri).delete();
  } catch {}

  // Delete from database
  await deleteDocumentRecord(doc.id);

  await logAuditEvent({
    id: `log_${Date.now()}`,
    documentId: doc.id,
    action: 'DELETED',
    timestamp: Date.now(),
    status: 'SUCCESS',
    details: 'Cryptographically overwritten and unlinked',
  });
}

/**
 * Wipe all ephemeral preview cache files
 */
export async function purgePreviewCache(): Promise<void> {
  try {
    const cacheTempDirectory = getCacheTempDirectory();
    if (cacheTempDirectory.exists) {
      cacheTempDirectory.delete();
      cacheTempDirectory.create({ intermediates: true });
    }
  } catch (err) {
    console.error('Error purging preview cache:', err);
  }
}

/**
 * Wipe all files and clear database (for Reset / Dev testing)
 */
export async function wipeAllVaultData(): Promise<void> {
  await purgePreviewCache();
  try {
    const vaultDirectory = getVaultDirectory();
    if (vaultDirectory.exists) {
      vaultDirectory.delete();
      vaultDirectory.create({ intermediates: true });
    }
  } catch (err) {
    console.error('Error wiping vault dir:', err);
  }
  await clearAllData();
}

/**
 * Seed realistic mock encrypted documents for Developer Testing
 */
export async function seedDemoDocuments(vaultKey: Uint8Array): Promise<void> {
  await ensureDirectories();

  // Valid 200x200 PNG image byte buffer for realistic demo viewing
  const validSampleImageBase64 =
    'iVBORw0KGgoAAAANSUhEUgAAAMgAAADICAYAAACtWK6eAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyJpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDxyZGY6UkRGIHhtbG5zOnJkZj0iaHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyI+IDxyZGY6RGVzY3JpcHRpb24gcmRmOmFib3V0PSIiIHhtbG5zOnhtcD0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wLyIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSdodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjJyB4bXA6Q3JlYXRvclRvb2w9IkFkb2JlIFBob3Rvc2hvcCBDQyAyMDE5IChXaW5kb3dzKSIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDpENDdBMDFERDAyMTExMUVBOUU4OEEzNTlCNjExRjYzMSIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDpENDdBMDFERTAYMTExMUVBOUU4OEEzNTlCNjExRjYzMSI+IDx4bXBNTTpEZXJpdmVkRnJvbSBzdFJlZjppbnN0YW5jZUlEPSJ4bXAuaWlkOkQ0N0EwMURCMDIxMTExRUE5RTg4QTM1OUI2MTFGNjMxIiBzdFJlZjpkb2N1bWVudElEPSJ4bXAuZGlkOkQ0N0EwMURDMDIxMTExRUE5RTg4QTM1OUI2MTFGNjMxIi8+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveHBhY2tldCBlbmQ9InIiPz6d2QbvAAABkElEQVR42u3TMQEAIAzAMMC/5+EGF8nYSQp0WefuOgcgBCAEIAQgBCAEIAQgBCAEIAQgBCAEIAQgBCAEIAQgBCAEIAQgBCAEIAQgBCAEIAQgBCAEIAQgBCAEIAQgBCAEIAQgBCAEIAQgBCAEIAQgBCAEIAQgBCAEIAQgBCAEIAQgBCAEIAQgBCAEIAQgBCAEIAQgBCAEIAQgBCAEIAQgBCAEIAQgBCAEIAQgBCAEIAQgBCAEIAQgBCAEIAQgBCAEIAQgBCAEIAQgBCAEIAQgBCAEIAQgBCAEIAQgBCAEIAQgBCAEIAQgBCAEIAQgBCAEIAQgBCAEIAQgBCAEIAQgBCAEIAQgBCAEIAQgBCAEIAQgBCAEIAQgBCAEIAQgBCAEIAQgBCAEIAQgBCAEIAQgBCAEIAQgBCAEIAQgBCAEIAQgBCAEIAQgBCAEIAQgBCAEIAQgBCAEIAQgBCAEIAQgBCAEIAQgBCAEIAQgBCAEIAQgBCAEIAQgBCAEIAQgBCAEIAQgBCAEIAQgBCAEIAQgBCAEIAQgBCAEIAQgBCAEIAQgBCAE4FsGAgwA0aEC7N54l9AAAAAASUVORK5CYII=';

  const mockDocs = [
    {
      name: 'Aadhaar_Digital_ID_2026.pdf',
      category: 'files' as DocumentCategory,
      content: '%PDF-1.4\n%âãÏÓ\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 78 >>\nstream\nBT /F1 14 Tf 70 700 Td (Government of India - Unique Identification Authority - Aadhaar) Tj ET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000015 00000 n \n0000000068 00000 n \n0000000125 00000 n \n0000000216 00000 n \ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n344\n%%EOF',
      mime: 'application/pdf',
      isBase64: false,
    },
    {
      name: 'PAN_Card_Verification_Front.png',
      category: 'photos' as DocumentCategory,
      content: validSampleImageBase64,
      mime: 'image/png',
      isBase64: true,
    },
    {
      name: 'Degree_Certificate_Autonomous.pdf',
      category: 'files' as DocumentCategory,
      content: '%PDF-1.4\n%âãÏÓ\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 82 >>\nstream\nBT /F1 14 Tf 70 700 Td (University Degree of Engineering & Technology - First Class Distinction) Tj ET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000015 00000 n \n0000000068 00000 n \n0000000125 00000 n \n0000000216 00000 n \ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n348\n%%EOF',
      mime: 'application/pdf',
      isBase64: false,
    },
    {
      name: 'Video_KYC_Recorded_Session.mp4',
      category: 'videos' as DocumentCategory,
      content: 'MOCK_VIDEO_STREAM_DATA_BANK_KYC_VERIFICATION_RECORDING_2026',
      mime: 'video/mp4',
      isBase64: false,
    },
  ];

  for (const doc of mockDocs) {
    const plaintext = doc.isBase64
      ? base64ToUint8Array(doc.content)
      : new TextEncoder().encode(doc.content);
    const originalSize = plaintext.byteLength;
    const fileBase64 = uint8ArrayToBase64(plaintext);

    const fileSha256 = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      fileBase64
    );

    const dek = generateRandomBytes(32);
    const { ciphertext, iv: fileIv, tag: fileTag } = encryptAesGcm(dek, plaintext);
    const { wrappedDekBase64, ivBase64: dekIvBase64 } = wrapDek(vaultKey, dek);

    const documentId = `doc_demo_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const encryptedFilePath = `${getVaultDir()}${documentId}.enc`;

    await new File(encryptedFilePath).write(ciphertext);

    const now = Date.now();
    await insertDocument({
      id: documentId,
      name: doc.name,
      folderId: null,
      fileType: doc.mime.includes('pdf') ? 'pdf' : doc.mime.includes('video') ? 'video' : 'image',
      originalSize,
      mimeType: doc.mime,
      encryptedFilePath,
      encryptedDek: wrappedDekBase64,
      dekIv: dekIvBase64,
      fileIv: uint8ArrayToBase64(fileIv),
      fileTag: uint8ArrayToBase64(fileTag),
      fileSha256,
      category: doc.category,
      isFavorite: false,
      createdAt: now,
      updatedAt: now,
    });
  }
}
