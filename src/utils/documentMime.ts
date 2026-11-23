import type { DocumentRecord } from '@/types/document';

/** Android ACTION_VIEW needs a real MIME type to pick the right default app. */
export function getPreviewMimeType(doc: DocumentRecord): string {
  if (doc.mimeType && doc.mimeType !== 'application/octet-stream') {
    return doc.mimeType;
  }

  const lowerName = doc.name.toLowerCase();
  if (lowerName.endsWith('.pdf') || doc.fileType === 'pdf') {
    return 'application/pdf';
  }
  if (lowerName.endsWith('.docx')) {
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  }
  if (lowerName.endsWith('.doc')) {
    return 'application/msword';
  }
  if (lowerName.endsWith('.xlsx')) {
    return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  }
  if (lowerName.endsWith('.xls')) {
    return 'application/vnd.ms-excel';
  }
  if (lowerName.endsWith('.csv')) {
    return 'text/csv';
  }
  if (lowerName.endsWith('.txt') || lowerName.endsWith('.log')) {
    return 'text/plain';
  }
  if (lowerName.endsWith('.json')) {
    return 'application/json';
  }
  if (lowerName.endsWith('.mp4') || doc.fileType === 'video') {
    return 'video/mp4';
  }
  if (lowerName.endsWith('.mov')) {
    return 'video/quicktime';
  }
  if (lowerName.endsWith('.png')) {
    return 'image/png';
  }
  if (lowerName.endsWith('.webp')) {
    return 'image/webp';
  }
  if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg') || doc.fileType === 'image') {
    return 'image/jpeg';
  }
  return '*/*';
}
