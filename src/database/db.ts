import * as SQLite from 'expo-sqlite';
import {
  DocumentRecord,
  AuditLogRecord,
  DocumentCategory,
  FolderRecord,
} from '../types/document';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbInstance) {
    dbInstance = await SQLite.openDatabaseAsync('needslocker.db');
    await initializeDatabase(dbInstance);
  }
  return dbInstance;
}

async function initializeDatabase(db: SQLite.SQLiteDatabase): Promise<void> {
  // WAL mode for high concurrency & integrity
  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS folders (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      parent_id TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      folder_id TEXT,
      file_type TEXT NOT NULL,
      original_size INTEGER NOT NULL,
      mime_type TEXT NOT NULL,
      encrypted_file_path TEXT NOT NULL,
      encrypted_dek TEXT NOT NULL,
      dek_iv TEXT NOT NULL,
      file_iv TEXT NOT NULL,
      file_tag TEXT NOT NULL,
      file_sha256 TEXT NOT NULL,
      category TEXT NOT NULL,
      expiry_date INTEGER,
      is_favorite INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY NOT NULL,
      document_id TEXT,
      action TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      status TEXT NOT NULL,
      details TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_docs_category ON documents(category);
    CREATE INDEX IF NOT EXISTS idx_docs_created ON documents(created_at DESC);
  `);

  // Existing installations predate folders, so add the column only when missing.
  const documentColumns = await db.getAllAsync<{ name: string }>(
    'PRAGMA table_info(documents)'
  );
  if (!documentColumns.some((column) => column.name === 'folder_id')) {
    await db.execAsync('ALTER TABLE documents ADD COLUMN folder_id TEXT');
  }
  await db.execAsync(
    'CREATE INDEX IF NOT EXISTS idx_docs_folder ON documents(folder_id)'
  );
}

export async function insertFolder(folder: FolderRecord): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO folders (id, name, parent_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)`,
    [folder.id, folder.name, folder.parentId, folder.createdAt, folder.updatedAt]
  );
}

export async function getAllFolders(): Promise<FolderRecord[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM folders ORDER BY created_at DESC'
  );

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    parentId: r.parent_id ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export async function insertDocument(doc: DocumentRecord): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO documents (
      id, name, folder_id, file_type, original_size, mime_type,
      encrypted_file_path, encrypted_dek, dek_iv, file_iv,
      file_tag, file_sha256, category, expiry_date, is_favorite,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      doc.id,
      doc.name,
      doc.folderId ?? null,
      doc.fileType,
      doc.originalSize,
      doc.mimeType,
      doc.encryptedFilePath,
      doc.encryptedDek,
      doc.dekIv,
      doc.fileIv,
      doc.fileTag,
      doc.fileSha256,
      doc.category,
      doc.expiryDate ?? null,
      doc.isFavorite ? 1 : 0,
      doc.createdAt,
      doc.updatedAt,
    ]
  );
}

export async function getAllDocuments(): Promise<DocumentRecord[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM documents ORDER BY created_at DESC'
  );

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    folderId: r.folder_id ?? null,
    fileType: r.file_type,
    originalSize: r.original_size,
    mimeType: r.mime_type,
    encryptedFilePath: r.encrypted_file_path,
    encryptedDek: r.encrypted_dek,
    dekIv: r.dek_iv,
    fileIv: r.file_iv,
    fileTag: r.file_tag,
    fileSha256: r.file_sha256,
    category: r.category as DocumentCategory,
    expiryDate: r.expiry_date,
    isFavorite: r.is_favorite === 1,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export async function deleteDocumentRecord(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM documents WHERE id = ?', [id]);
}

export async function updateFolderName(id: string, name: string): Promise<void> {
  const db = await getDatabase();
  const now = Date.now();
  await db.runAsync('UPDATE folders SET name = ?, updated_at = ? WHERE id = ?', [name, now, id]);
}

export async function updateDocumentName(id: string, name: string): Promise<void> {
  const db = await getDatabase();
  const now = Date.now();
  await db.runAsync('UPDATE documents SET name = ?, updated_at = ? WHERE id = ?', [name, now, id]);
}

export async function updateDocumentFolder(documentId: string, folderId: string | null): Promise<void> {
  const db = await getDatabase();
  const now = Date.now();
  await db.runAsync('UPDATE documents SET folder_id = ?, updated_at = ? WHERE id = ?', [folderId, now, documentId]);
}

/** Removes a folder while keeping its encrypted files in the main document list. */
export async function deleteFolderAndUnlinkDocuments(id: string): Promise<void> {
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    await db.runAsync('UPDATE documents SET folder_id = NULL WHERE folder_id = ?', [id]);
    await db.runAsync('DELETE FROM folders WHERE id = ?', [id]);
  });
}


export async function logAuditEvent(log: AuditLogRecord): Promise<void> {
  try {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO audit_logs (id, document_id, action, timestamp, status, details)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [log.id, log.documentId ?? null, log.action, log.timestamp, log.status, log.details ?? null]
    );
  } catch (err) {
    console.error('Failed to log audit event:', err);
  }
}

export async function clearAllData(): Promise<void> {
  const db = await getDatabase();
  await db.execAsync(`
    DELETE FROM documents;
    DELETE FROM folders;
    DELETE FROM audit_logs;
  `);
}
