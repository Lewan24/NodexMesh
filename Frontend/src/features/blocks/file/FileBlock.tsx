import { useContext, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, FolderOpen, RefreshCw } from 'lucide-react';
import type { BoardItem, FileItem } from '@/entities/board/types';
import { LibraryContext } from '@/features/library/LibraryContext';
import LibraryDialog from '@/features/library/LibraryDialog';
import FilePreviewDialog from '@/features/library/FilePreviewDialog';
import FileTypeIcon from '@/features/library/FileTypeIcon';
import { fileExtension, formatFileSize } from '@/features/library/filePreview';
import { translate } from '@/shared/i18n';
import ContentBlockShell from '../shared/ContentBlockShell';
import './fileBlock.css';

export default function FileBlock({
  item,
  readOnly,
  onUpdate,
  onDelete,
}: {
  item: FileItem;
  readOnly: boolean;
  onUpdate: (updater: (item: BoardItem) => BoardItem) => void;
  onDelete: () => void;
}) {
  useTranslation();
  const projectId = useContext(LibraryContext);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const update = (patch: Partial<FileItem>) =>
    onUpdate((current) => (current.type === 'file' ? { ...current, ...patch } : current));

  const title = editingTitle ? (
    <input
      autoFocus
      className="file-block-title-input"
      value={item.title}
      maxLength={200}
      onMouseDown={(event) => event.stopPropagation()}
      onChange={(event) => update({ title: event.target.value })}
      onBlur={() => setEditingTitle(false)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === 'Escape') setEditingTitle(false);
      }}
    />
  ) : (
    <button
      type="button"
      className="block w-full truncate text-left"
      title={item.title}
      onDoubleClick={() => !readOnly && setEditingTitle(true)}
    >
      {item.title || item.fileName || translate('File')}
    </button>
  );

  return (
    <>
      <ContentBlockShell item={item} title={title} onDelete={onDelete} minHeight={160}>
        <div
          role="button"
          tabIndex={0}
          className={`file-block-body ${item.source ? 'has-file' : ''}`}
          onMouseDown={(event) => event.stopPropagation()}
          onClick={() => (item.source ? setPreviewOpen(true) : !readOnly && setLibraryOpen(true))}
          onKeyDown={(event) => {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            event.preventDefault();
            item.source ? setPreviewOpen(true) : !readOnly && setLibraryOpen(true);
          }}
        >
          <span className="file-block-icon">
            {item.source ? (
              <FileTypeIcon name={item.fileName} contentType={item.contentType} size={34} />
            ) : (
              <FolderOpen size={34} />
            )}
          </span>
          <span className="file-block-copy">
            <strong>{item.fileName || translate('Choose a library file')}</strong>
            <small>
              {item.source
                ? `${fileExtension(item.fileName, item.contentType)} · ${formatFileSize(item.size)}`
                : translate('DOCX, Excel, PDF, text and more')}
            </small>
          </span>
          {item.source && !readOnly && (
            <button
              type="button"
              className="file-block-change"
              title={translate('Change file')}
              onClick={(event) => {
                event.stopPropagation();
                setLibraryOpen(true);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') setLibraryOpen(true);
              }}
            >
              <RefreshCw size={14} />
            </button>
          )}
          {item.source && <Eye className="file-block-open" size={16} />}
        </div>
      </ContentBlockShell>
      {libraryOpen && projectId && (
        <LibraryDialog
          projectId={projectId}
          onClose={() => setLibraryOpen(false)}
          onSelect={(source, name, asset) => {
            update({ source, title: name, fileName: name, contentType: asset.contentType, size: asset.size });
            setLibraryOpen(false);
          }}
        />
      )}
      {previewOpen && item.source && (
        <FilePreviewDialog
          source={item.source}
          name={item.fileName || item.title}
          contentType={item.contentType}
          size={item.size}
          onClose={() => setPreviewOpen(false)}
        />
      )}
    </>
  );
}
