import { httpClient } from '@/app/services';
import Modal from '@/shared/components/dialogs/Modal';
import { translate } from '@/shared/i18n';
import { AlertTriangle, Download, LoaderCircle, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { filePreviewKind, formatFileSize } from './filePreview';
import { parseLibrarySource } from './librarySource';
import './filePreview.css';

type Sheet = { sheet: string; data: unknown[][] };

export default function FilePreviewDialog({
  source,
  name,
  contentType,
  size,
  onClose,
}: {
  source: string;
  name: string;
  contentType: string;
  size: number;
  onClose: () => void;
}) {
  useTranslation();
  const reference = parseLibrarySource(source);
  const assetId = reference?.id;
  const projectId = reference?.projectId;
  const kind = filePreviewKind(name, contentType);
  const docxHost = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [objectUrl, setObjectUrl] = useState('');
  const [text, setText] = useState('');
  const [truncated, setTruncated] = useState(false);
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [activeSheet, setActiveSheet] = useState(0);

  useEffect(() => {
    const client = httpClient;
    if (!assetId || !projectId || !client) {
      setLoading(false);
      setError(translate('File preview is unavailable.'));
      return;
    }
    const controller = new AbortController();
    let url = '';
    const load = async () => {
      setLoading(true);
      setError('');
      setObjectUrl('');
      setText('');
      setTruncated(false);
      setSheets([]);
      setActiveSheet(0);
      try {
        const blob = (await client.request(`/projects/${projectId}/library/${assetId}/content`, {
          responseType: 'blob',
          signal: controller.signal,
        })) as Blob;
        if (controller.signal.aborted) return;

        if (kind === 'image' || kind === 'video' || kind === 'pdf') {
          url = URL.createObjectURL(blob);
          setObjectUrl(url);
        } else if (kind === 'docx') {
          const { renderAsync } = await import('docx-preview');
          if (!docxHost.current || controller.signal.aborted) return;
          docxHost.current.replaceChildren();
          await renderAsync(blob, docxHost.current, undefined, {
            className: 'file-docx-preview',
            inWrapper: true,
            ignoreWidth: false,
            ignoreHeight: false,
          });
        } else if (kind === 'spreadsheet' && name.toLowerCase().endsWith('.xlsx')) {
          const { default: readXlsxFile } = await import('read-excel-file/browser');
          const workbook = await readXlsxFile(blob);
          if (!controller.signal.aborted)
            setSheets(
              workbook.map((sheet) => ({
                sheet: sheet.sheet,
                data: sheet.data.slice(0, 300).map((row) => row.slice(0, 80) as unknown[]),
              })),
            );
        } else if (kind === 'text') {
          const previewLimit = 1024 * 1024;
          const previewText = await blob.slice(0, previewLimit).text();
          if (controller.signal.aborted) return;
          setText(previewText);
          setTruncated(blob.size > previewLimit);
        }
      } catch {
        if (!controller.signal.aborted) setError(translate("Couldn't load a preview for this file."));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void load();
    return () => {
      controller.abort();
      if (url) URL.revokeObjectURL(url);
    };
  }, [kind, name, assetId, projectId]);

  const download = async () => {
    if (!reference || !httpClient) return;
    const blob = (await httpClient.request(
      `/projects/${reference.projectId}/library/${reference.id}/content?download=true`,
      { responseType: 'blob' },
    )) as Blob;
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = name;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const sheet = sheets[activeSheet];
  const previewUnsupported =
    ['document', 'other'].includes(kind) || (kind === 'spreadsheet' && !name.toLowerCase().endsWith('.xlsx'));

  return (
    <Modal readOnlyAction onClose={onClose} centered label={translate('File preview')}>
      <div className="file-preview-dialog" onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <div className="min-w-0">
            <h2 title={name}>{name}</h2>
            <span>{formatFileSize(size)}</span>
          </div>
          <button
            type="button"
            onClick={() => void download()}
            title={translate('Download')}
            aria-label={translate('Download')}
          >
            <Download size={17} />
          </button>
          <button type="button" onClick={onClose} title={translate('Close')} aria-label={translate('Close')}>
            <X size={19} />
          </button>
        </header>
        {sheets.length > 1 && (
          <nav aria-label={translate('Workbook sheets')}>
            {sheets.map((entry, index) => (
              <button
                key={entry.sheet}
                type="button"
                aria-pressed={activeSheet === index}
                onClick={() => setActiveSheet(index)}
              >
                {entry.sheet}
              </button>
            ))}
          </nav>
        )}
        <main>
          {kind === 'docx' && <div ref={docxHost} className="file-docx-host" />}
          {loading && (
            <div className="file-preview-state" role="status">
              <LoaderCircle className="library-spin" />
              {translate('Loading preview…')}
            </div>
          )}
          {!loading && error && (
            <div className="file-preview-state" role="alert">
              <AlertTriangle />
              <p>{error}</p>
              <button type="button" onClick={() => void download()}>
                {translate('Download instead')}
              </button>
            </div>
          )}
          {!loading && !error && kind === 'pdf' && objectUrl && <iframe src={objectUrl} title={name} />}
          {!loading && !error && kind === 'image' && objectUrl && <img src={objectUrl} alt={name} />}
          {!loading && !error && kind === 'video' && objectUrl && <video src={objectUrl} controls />}
          {!loading && !error && kind === 'text' && (
            <div className="file-text-preview">
              <pre>{text}</pre>
              {truncated && <p>{translate('Preview limited to the first 1 MB.')}</p>}
            </div>
          )}
          {!loading && !error && sheet && (
            <div className="file-sheet-preview">
              <table>
                <tbody>
                  {sheet.data.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {row.map((cell, cellIndex) => (
                        <td key={cellIndex}>{cell instanceof Date ? cell.toLocaleDateString() : String(cell ?? '')}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!loading && !error && previewUnsupported && (
            <div className="file-preview-state">
              <AlertTriangle />
              <p>{translate('A browser preview is not available for this file type.')}</p>
              <button type="button" onClick={() => void download()}>
                {translate('Download file')}
              </button>
            </div>
          )}
        </main>
      </div>
    </Modal>
  );
}
