export type FilePreviewKind = 'image' | 'video' | 'pdf' | 'docx' | 'spreadsheet' | 'text' | 'document' | 'other';

export function filePreviewKind(name: string, contentType: string): FilePreviewKind {
  const extension = name.toLowerCase().split('.').pop() ?? '';
  if (contentType.startsWith('image/')) return 'image';
  if (contentType.startsWith('video/')) return 'video';
  if (contentType === 'application/pdf' || extension === 'pdf') return 'pdf';
  if (extension === 'docx') return 'docx';
  if (extension === 'xlsx') return 'spreadsheet';
  if (contentType.startsWith('text/') || ['txt', 'csv', 'md'].includes(extension)) return 'text';
  if (['doc', 'rtf', 'pptx'].includes(extension)) return 'document';
  if (extension === 'xls') return 'spreadsheet';
  return 'other';
}

export function fileExtension(name: string, contentType = ''): string {
  const extension = name.includes('.') ? name.split('.').pop() : '';
  return (extension || contentType.split('/').pop() || 'file').replace('vnd.', '').slice(0, 8).toUpperCase();
}

export function formatFileSize(bytes: number): string {
  if (!bytes) return '0 KB';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
