import { lazy, Suspense, useRef, useState } from 'react';
import { Type, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { BoardItem } from '@/entities/board/types';
import { translate } from '@/shared/i18n';

import { getFontFamilyCss, updateTypography } from '../../typography/typographyUtils';

import FontFamilyPicker from './FontFamilyPicker';

const FontPreviewDialog = lazy(() => import('../../typography/FontPreviewDialog'));

export default function TypographyControls({
  item,
  onUpdate,
}: {
  item: BoardItem;
  onUpdate: (updater: (item: BoardItem) => BoardItem) => void;
}) {
  useTranslation();
  const typography = item.typography;
  const previewButton = useRef<HTMLButtonElement>(null);
  const [fontPreview, setFontPreview] = useState<{ defaultFontCss: string } | null>(null);
  const closePreview = () => {
    setFontPreview(null);
    requestAnimationFrame(() => previewButton.current?.focus({ preventScroll: true }));
  };
  const update = (patch: Partial<NonNullable<BoardItem['typography']>>) =>
    onUpdate((current) => updateTypography(current, patch));

  return (
    <>
      <div
        className="edit-bar-control-card flex min-w-[210px] items-center gap-2 rounded-xl border p-2"
        style={{ borderColor: 'var(--color-border-soft)', background: 'var(--edit-bar-card)' }}
      >
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
          style={{ color: 'var(--color-accent-ink)', background: 'var(--color-accent-soft)' }}
        >
          <Type size={15} />
        </span>
        <div className="min-w-0 flex-1">
          <span
            className="block text-[9px] font-bold uppercase tracking-[0.14em]"
            style={{ color: 'var(--color-text-faint)' }}
          >
            {translate('Font family')}
          </span>
          <FontFamilyPicker
            value={typography?.fontFamily ?? (item.type === 'code' ? 'mono' : undefined)}
            onChange={(fontFamily) => update({ fontFamily })}
          />
        </div>
        <button
          type="button"
          className="h-8 w-8 shrink-0 rounded-lg hover:bg-accent-soft"
          title={translate('Preview fonts')}
          aria-label={translate('Preview fonts')}
          aria-haspopup="dialog"
          ref={previewButton}
          onClick={(event) =>
            setFontPreview({
              defaultFontCss:
                item.type === 'code'
                  ? getFontFamilyCss('mono')
                  : getComputedStyle(event.currentTarget).getPropertyValue('--project-font'),
            })
          }
        >
          <Search size={16} className="mx-auto" aria-hidden="true" />
        </button>
      </div>
      {fontPreview && (
        <Suspense fallback={null}>
          <FontPreviewDialog
            value={typography?.fontFamily ?? (item.type === 'code' ? 'mono' : undefined)}
            defaultFontCss={fontPreview.defaultFontCss}
            onApply={(fontFamily) => update({ fontFamily })}
            onClose={closePreview}
          />
        </Suspense>
      )}
    </>
  );
}
