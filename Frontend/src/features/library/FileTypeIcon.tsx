import { File, FileCode2, FileImage, FileSpreadsheet, FileText, FileVideo2 } from 'lucide-react';
import { filePreviewKind } from './filePreview';

export default function FileTypeIcon({
  name,
  contentType,
  size = 28,
}: {
  name: string;
  contentType: string;
  size?: number;
}) {
  const kind = filePreviewKind(name, contentType);
  if (kind === 'image') return <FileImage size={size} />;
  if (kind === 'video') return <FileVideo2 size={size} />;
  if (kind === 'spreadsheet') return <FileSpreadsheet size={size} />;
  if (kind === 'text') return <FileCode2 size={size} />;
  if (kind === 'pdf' || kind === 'docx' || kind === 'document') return <FileText size={size} />;
  return <File size={size} />;
}
