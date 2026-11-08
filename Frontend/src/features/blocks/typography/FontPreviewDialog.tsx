import { useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import type { FontFamily } from '@/entities/board/types';
import Modal from '@/shared/components/dialogs/Modal';
import { translate } from '@/shared/i18n';
import { FONT_FAMILIES, getFontFamilyCss } from './typographyUtils';
import './fontPreviewDialog.css';

export default function FontPreviewDialog({
  value,
  defaultFontCss,
  onApply,
  onClose,
}: {
  value?: FontFamily;
  defaultFontCss?: string;
  onApply: (font?: FontFamily) => void;
  onClose: () => void;
}) {
  useTranslation();
  const [draft, setDraft] = useState<FontFamily | ''>(value ?? '');
  const [sample, setSample] = useState('Zażółć gęślą jaźń — Twoja następna wielka idea.');
  const [size, setSize] = useState(28);
  const [bold, setBold] = useState(false);
  const [italic, setItalic] = useState(false);
  const options = [
    { value: '' as const, label: translate('Project default'), css: defaultFontCss || getFontFamilyCss() },
    ...FONT_FAMILIES,
  ];
  const selected = options.find((font) => font.value === draft) ?? options[0]!;
  const previewStyle: CSSProperties = {
    fontFamily: selected.css,
    fontSize: size,
    fontWeight: bold ? 700 : 400,
    fontStyle: italic ? 'italic' : 'normal',
  };

  return (
    <Modal centered label={translate('Preview fonts')} onClose={onClose}>
      <div className="font-preview-dialog">
        <header className="font-preview-header">
          <h2>{translate('Preview fonts')}</h2>
          <button type="button" onClick={onClose} aria-label={translate('Close')}>
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        <div className="font-preview-body">
          <fieldset className="font-preview-list">
            <legend>{translate('Font family')}</legend>
            {options.map((font) => (
              <label key={font.value} data-selected={draft === font.value}>
                <input
                  type="radio"
                  name="font-preview-family"
                  value={font.value}
                  checked={draft === font.value}
                  onChange={() => setDraft(font.value)}
                />
                <span style={{ fontFamily: font.css }}>{font.label}</span>
              </label>
            ))}
          </fieldset>
          <section className="font-preview-workspace" aria-label={translate('Font preview')}>
            <label className="font-preview-sample-label">
              {translate('Your sample text')}
              <textarea
                autoFocus
                rows={3}
                maxLength={2000}
                value={sample}
                onChange={(event) => setSample(event.target.value)}
              />
            </label>
            <div className="font-preview-options">
              <label>
                {translate('Preview size')}
                <input
                  type="range"
                  min={12}
                  max={64}
                  value={size}
                  onChange={(event) => setSize(Number(event.target.value))}
                />
                <span>{size} px</span>
              </label>
              <button type="button" aria-pressed={bold} onClick={() => setBold(!bold)}>
                {translate('Bold')}
              </button>
              <button type="button" aria-pressed={italic} onClick={() => setItalic(!italic)}>
                {translate('Italic')}
              </button>
            </div>
            <div className="font-preview-output" data-font-preview style={previewStyle}>
              {sample || translate('Enter text to preview this font.')}
            </div>
            <p className="font-preview-alphabet" style={{ fontFamily: selected.css }}>
              Ąą Ćć Ęę Łł Ńń Óó Śś Źź Żż · 0123456789
            </p>
          </section>
        </div>
        <footer className="font-preview-footer">
          <button type="button" onClick={onClose}>
            {translate('Cancel')}
          </button>
          <button
            type="button"
            className="btn-accent"
            onClick={() => {
              onApply(draft || undefined);
              onClose();
            }}
          >
            {translate('Use font')}
          </button>
        </footer>
      </div>
    </Modal>
  );
}
