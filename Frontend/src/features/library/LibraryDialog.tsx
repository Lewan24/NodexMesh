import { translate } from '@/shared/i18n';
import { useTranslation } from 'react-i18next';
import { useEffect, useRef, useState } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  FileImage,
  Film,
  FolderOpen,
  Globe,
  Image,
  Link2,
  LoaderCircle,
  LockKeyhole,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';
import { httpClient } from '@/app/services';
import Modal from '@/shared/components/dialogs/Modal';
import { errorMessage } from '@/shared/api/errors';
import { librarySource } from './librarySource';
import MediaPreview from './MediaPreview';
import FilePreviewDialog from './FilePreviewDialog';
import FileTypeIcon from './FileTypeIcon';
import { fileExtension, filePreviewKind } from './filePreview';
import type { LibraryAsset, ProjectLibrary } from './libraryTypes';
import './library.css';

const FILTERS = ['All files', 'Documents', 'Images', 'GIFs', 'Videos', 'SVG icons'] as const;
type Filter = (typeof FILTERS)[number];
const formatSize = (bytes: number) =>
  bytes === 0
    ? '0 KB'
    : bytes < 1024 * 1024
      ? `${Math.max(1, Math.round(bytes / 1024))} KB`
      : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
const publicUrl = (path: string) =>
  new URL(`${(import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '')}${path}`, window.location.origin).href;

export default function LibraryDialog({
  projectId,
  onClose,
  onSelect,
  iconsOnly = false,
}: {
  projectId: string;
  onClose: () => void;
  onSelect?: (source: string, name: string, asset: LibraryAsset) => void;
  iconsOnly?: boolean;
}) {
  useTranslation();
  const [library, setLibrary] = useState<ProjectLibrary>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('All files');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState('');
  const [rename, setRename] = useState('');
  const [confirm, setConfirm] = useState<'delete' | 'revoke' | null>(null);
  const [copied, setCopied] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const detailsPanel = useRef<HTMLElement>(null);
  const path = `/projects/${projectId}/library`;
  const selected = library?.assets.find((asset) => asset.id === selectedId);

  useEffect(() => {
    const controller = new AbortController();
    if (!httpClient) return;
    void httpClient
      .request(path, { signal: controller.signal })
      .then((value) => {
        if (!controller.signal.aborted) setLibrary(value as ProjectLibrary);
      })
      .catch((error) => {
        if (!controller.signal.aborted) setError(errorMessage(error));
      });
    return () => controller.abort();
  }, [path]);

  useEffect(() => {
    if (selectedId && window.matchMedia('(max-width: 640px)').matches) {
      detailsPanel.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
    }
  }, [selectedId]);

  const run = async (action: () => Promise<unknown>) => {
    if (busy || !httpClient) return;
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      try {
        setLibrary((await httpClient.request(path)) as ProjectLibrary);
      } catch (error) {
        setError(errorMessage(error));
      }
      setBusy(false);
    }
  };
  const upload = (files: File[]) => {
    if (!library?.canManage || !files.length) return;
    void run(async () => {
      for (const file of files)
        await httpClient!.request(`${path}?name=${encodeURIComponent(file.name)}`, { method: 'POST', rawBody: file });
    });
  };
  const select = (asset: LibraryAsset) => {
    setSelectedId(asset.id);
    setRename(asset.name);
    setConfirm(null);
    setCopied(false);
  };
  const copyLink = async () => {
    if (!selected?.sharePath) return;
    try {
      await navigator.clipboard.writeText(publicUrl(selected.sharePath));
      setCopied(true);
    } catch {
      setError(translate('Select and copy the public link below.'));
    }
  };
  const filtered = (library?.assets ?? []).filter((asset) => {
    if (iconsOnly && !asset.contentType.startsWith('image/')) return false;
    if (!asset.name.toLowerCase().includes(query.toLowerCase())) return false;
    if (filter === 'Images')
      return asset.contentType.startsWith('image/') && !['image/gif', 'image/svg+xml'].includes(asset.contentType);
    if (filter === 'GIFs') return asset.contentType === 'image/gif';
    if (filter === 'Videos') return asset.contentType.startsWith('video/');
    if (filter === 'SVG icons') return asset.contentType === 'image/svg+xml';
    if (filter === 'Documents')
      return !asset.contentType.startsWith('image/') && !asset.contentType.startsWith('video/');
    return true;
  });
  if (sort === 'name') filtered.sort((a, b) => a.name.localeCompare(b.name));
  if (sort === 'size') filtered.sort((a, b) => b.size - a.size);
  const currentPage = Math.min(page, Math.max(0, Math.ceil(filtered.length / 12) - 1));
  const visibleFilters = iconsOnly ? FILTERS.filter((value) => value !== 'Videos' && value !== 'Documents') : FILTERS;

  return (
    <Modal onClose={onClose} centered label={translate('Project library')}>
      <div
        className="media-library"
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="library-header">
          <div className="library-brand">
            <div className="library-brand-icon">
              <FolderOpen size={25} />
            </div>
            <div>
              <span className="library-eyebrow">{translate('YOUR CREATIVE SPACE')}</span>
              <h2>{translate('Project library')}</h2>
              <p>{translate('A home for every visual in your project.')}</p>
            </div>
          </div>
          <div className="library-header-actions">
            {library?.canManage && (
              <button
                type="button"
                className="library-primary"
                disabled={busy}
                onClick={() => fileInput.current?.click()}
              >
                {busy ? <LoaderCircle size={17} className="library-spin" /> : <UploadCloud size={17} />}
                {translate('Upload files')}
              </button>
            )}
            <button type="button" className="library-icon-button" aria-label={translate('Close')} onClick={onClose}>
              <X size={20} />
            </button>
          </div>
        </header>
        <div className="library-summary">
          <span>
            <FileImage size={15} />
            {translate('{{count}} files', { count: library?.assets.length ?? 0 })}
          </span>
          <span>{formatSize(library?.assets.reduce((sum, asset) => sum + asset.size, 0) ?? 0)}</span>
          <span className="library-privacy">
            <ShieldCheck size={15} />
            {translate('Private by default')}
          </span>
        </div>
        <input
          ref={fileInput}
          type="file"
          hidden
          multiple
          accept=".png,.jpg,.jpeg,.gif,.webp,.svg,.mp4,.webm,.pdf,.doc,.docx,.xls,.xlsx,.pptx,.rtf,.txt,.csv,.md"
          onChange={(event) => {
            upload(Array.from(event.target.files ?? []));
            event.target.value = '';
          }}
        />
        {error && (
          <div className="library-alert" role="alert">
            {error}
            <button type="button" aria-label={translate('Close')} onClick={() => setError('')}>
              <X size={16} />
            </button>
          </div>
        )}
        {busy && (
          <div className="library-progress" role="status">
            <LoaderCircle size={14} className="library-spin" />
            {translate('Saving…')}
          </div>
        )}
        <div className="library-workspace">
          <main className="library-browser">
            {library?.canManage && (
              <button
                type="button"
                disabled={busy}
                className={`library-dropzone ${dragging ? 'is-dragging' : ''}`}
                onClick={() => fileInput.current?.click()}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragging(false);
                  upload(Array.from(event.dataTransfer.files));
                }}
              >
                <span className="library-drop-icon">
                  <UploadCloud size={24} />
                </span>
                <span>
                  <strong>{translate('Drop something inspiring')}</strong>
                  <small>
                    {translate('Drag files here or click to browse. Documents, spreadsheets, media and text.')}
                  </small>
                </span>
                <span className="library-drop-plus">+</span>
              </button>
            )}
            <div className="library-tools">
              <label className="library-search">
                <Search size={17} />
                <input
                  aria-label={translate('Search library')}
                  placeholder={translate('Search library…')}
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setPage(0);
                  }}
                />
              </label>
              <select
                aria-label={translate('Sort files')}
                value={sort}
                onChange={(event) => setSort(event.target.value)}
              >
                <option value="newest">{translate('Newest first')}</option>
                <option value="name">{translate('Name A–Z')}</option>
                <option value="size">{translate('Largest first')}</option>
              </select>
            </div>
            <div className="library-filters" aria-label={translate('File types')}>
              {visibleFilters.map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={filter === value}
                  onClick={() => {
                    setFilter(value);
                    setPage(0);
                  }}
                >
                  {translate(value)}
                </button>
              ))}
            </div>
            <div className="library-gallery">
              {!library && !error && httpClient && (
                <div className="library-empty" role="status">
                  <LoaderCircle size={28} className="library-spin" />
                  <p>{translate('Loading library…')}</p>
                </div>
              )}
              {!httpClient && (
                <div className="library-empty">
                  <FolderOpen size={32} />
                  <p>{translate('Connect to the API to use the project library.')}</p>
                </div>
              )}
              {library && !filtered.length && (
                <div className="library-empty">
                  <span>
                    <Image size={36} />
                  </span>
                  <h3>
                    {translate(query || filter !== 'All files' ? 'No matching files' : 'Your next idea starts here')}
                  </h3>
                  <p>
                    {translate(
                      query || filter !== 'All files'
                        ? 'Try another search or file type.'
                        : 'Add your first visual to bring this project to life.',
                    )}
                  </p>
                </div>
              )}
              <div className="library-grid">
                {filtered.slice(currentPage * 12, currentPage * 12 + 12).map((asset) => (
                  <button
                    type="button"
                    key={asset.id}
                    className={`library-card ${selectedId === asset.id ? 'is-selected' : ''}`}
                    aria-pressed={selectedId === asset.id}
                    onClick={() => select(asset)}
                  >
                    <div className="library-thumbnail">
                      {asset.contentType.startsWith('video/') ? (
                        <div className="library-video-tile">
                          <Film size={34} />
                          <span>{translate('Video')}</span>
                        </div>
                      ) : asset.contentType.startsWith('image/') ? (
                        <MediaPreview source={librarySource(projectId, asset.id)} name={asset.name} />
                      ) : (
                        <div className="library-file-tile">
                          <FileTypeIcon name={asset.name} contentType={asset.contentType} size={38} />
                          <span>{fileExtension(asset.name, asset.contentType)}</span>
                        </div>
                      )}
                      <span className="library-format">{fileExtension(asset.name, asset.contentType)}</span>
                      <span
                        className={`library-access ${asset.shared ? 'is-public' : ''}`}
                        title={translate(asset.shared ? 'Public link enabled' : 'Private')}
                      >
                        {asset.shared ? <Globe size={12} /> : <LockKeyhole size={12} />}
                      </span>
                      {selectedId === asset.id && (
                        <span className="library-selected-mark">
                          <Check size={15} />
                        </span>
                      )}
                    </div>
                    <div className="library-card-caption">
                      <strong title={asset.name}>{asset.name}</strong>
                      <span>{formatSize(asset.size)}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <footer className="library-pagination">
              <span>{translate('{{count}} files', { count: filtered.length })}</span>
              <div>
                <button
                  type="button"
                  className="library-icon-button"
                  aria-label={translate('Previous')}
                  disabled={currentPage === 0}
                  onClick={() => setPage(currentPage - 1)}
                >
                  <ChevronLeft size={17} />
                </button>
                <span>
                  {currentPage + 1} / {Math.max(1, Math.ceil(filtered.length / 12))}
                </span>
                <button
                  type="button"
                  className="library-icon-button"
                  aria-label={translate('Next')}
                  disabled={(currentPage + 1) * 12 >= filtered.length}
                  onClick={() => setPage(currentPage + 1)}
                >
                  <ChevronRight size={17} />
                </button>
              </div>
            </footer>
          </main>
          <aside ref={detailsPanel} className="library-details" aria-label={translate('File details')}>
            {selected ? (
              <>
                <div className="library-detail-heading">
                  <span>{translate('File details')}</span>
                  <button
                    type="button"
                    className="library-icon-button"
                    aria-label={translate('Close file details')}
                    onClick={() => setSelectedId('')}
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="library-detail-preview">
                  {selected.contentType.startsWith('image/') || selected.contentType.startsWith('video/') ? (
                    <MediaPreview
                      key={selected.id}
                      source={librarySource(projectId, selected.id)}
                      name={selected.name}
                    />
                  ) : (
                    <button type="button" className="library-file-detail" onClick={() => setPreviewOpen(true)}>
                      <FileTypeIcon name={selected.name} contentType={selected.contentType} size={42} />
                      <span>
                        {translate(
                          filePreviewKind(selected.name, selected.contentType) === 'other' ? 'File' : 'Open preview',
                        )}
                      </span>
                    </button>
                  )}
                </div>
                <div className="library-detail-title">
                  <h3>{selected.name}</h3>
                  <span>
                    {fileExtension(selected.name, selected.contentType)} · {formatSize(selected.size)}
                  </span>
                </div>
                {onSelect && (
                  <button
                    type="button"
                    className="library-primary library-full"
                    onClick={() => onSelect(librarySource(projectId, selected.id), selected.name, selected)}
                  >
                    <Check size={16} />
                    {translate('Use file')}
                  </button>
                )}
                {library?.canManage && (
                  <div className="library-detail-section">
                    <label htmlFor="library-file-name">{translate('File name')}</label>
                    <input
                      id="library-file-name"
                      maxLength={200}
                      value={rename}
                      onChange={(event) => setRename(event.target.value)}
                    />
                    <button
                      type="button"
                      className="library-secondary library-full"
                      disabled={busy || !rename.trim() || rename.trim() === selected.name}
                      onClick={() =>
                        void run(() =>
                          httpClient!.request(`${path}/${selected.id}`, { method: 'PATCH', body: { name: rename } }),
                        )
                      }
                    >
                      {translate('Save name')}
                    </button>
                  </div>
                )}
                <div className="library-detail-section">
                  <div className="library-sharing-heading">
                    <span>{translate('Sharing')}</span>
                    <span className={`library-status ${selected.shared ? 'is-public' : ''}`}>
                      {selected.shared ? <Globe size={12} /> : <LockKeyhole size={12} />}
                      {translate(selected.shared ? 'Public' : 'Private')}
                    </span>
                  </div>
                  <p>
                    {translate(
                      selected.shared
                        ? 'Anyone with the public link can view this file.'
                        : 'Only members of this project can view this file.',
                    )}
                  </p>
                  {library?.canShare && (
                    <>
                      {selected.sharePath ? (
                        <>
                          <div className="library-link-field">
                            <Link2 size={14} />
                            <input
                              aria-label={translate('Public link')}
                              readOnly
                              value={publicUrl(selected.sharePath)}
                              onFocus={(event) => event.target.select()}
                            />
                          </div>
                          <button
                            type="button"
                            className="library-secondary library-full"
                            onClick={() => void copyLink()}
                          >
                            {copied ? <Check size={15} /> : <Copy size={15} />}
                            {translate(copied ? 'Copied!' : 'Copy public link')}
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="library-secondary library-full"
                          disabled={busy}
                          onClick={() =>
                            void run(() => httpClient!.request(`${path}/${selected.id}/share`, { method: 'POST' }))
                          }
                        >
                          <Link2 size={15} />
                          {translate(selected.shared ? 'Get public link' : 'Create public link')}
                        </button>
                      )}
                      {selected.shared && (
                        <button
                          type="button"
                          className="library-text-button"
                          disabled={busy}
                          onClick={() => setConfirm('revoke')}
                        >
                          {translate('Revoke link')}
                        </button>
                      )}
                    </>
                  )}
                </div>
                {library?.canManage && (
                  <button type="button" className="library-delete" disabled={busy} onClick={() => setConfirm('delete')}>
                    <Trash2 size={15} />
                    {translate('Delete file')}
                  </button>
                )}
                {confirm && (
                  <div className="library-confirm">
                    <p>
                      {translate(
                        confirm === 'delete'
                          ? 'Delete this file? Blocks and public links using it will stop working.'
                          : 'Revoke public access? Existing public links will stop working.',
                      )}
                    </p>
                    <div>
                      <button
                        type="button"
                        disabled={busy}
                        className="library-danger"
                        onClick={() =>
                          void run(async () => {
                            await httpClient!.request(`${path}/${selected.id}${confirm === 'revoke' ? '/share' : ''}`, {
                              method: 'DELETE',
                            });
                            setConfirm(null);
                            setCopied(false);
                          })
                        }
                      >
                        {translate(confirm === 'delete' ? 'Confirm delete' : 'Revoke link')}
                      </button>
                      <button type="button" className="library-text-button" onClick={() => setConfirm(null)}>
                        {translate('Cancel')}
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="library-detail-empty">
                <div>
                  <Sparkles size={27} />
                </div>
                <h3>{translate('Make room for inspiration')}</h3>
                <p>{translate('Select a file to preview it, edit its name or manage sharing.')}</p>
                <span>
                  <ShieldCheck size={14} />
                  {translate('Your files, your project.')}
                </span>
              </div>
            )}
          </aside>
        </div>
      </div>
      {previewOpen && selected && (
        <FilePreviewDialog
          source={librarySource(projectId, selected.id)}
          name={selected.name}
          contentType={selected.contentType}
          size={selected.size}
          onClose={() => setPreviewOpen(false)}
        />
      )}
    </Modal>
  );
}
