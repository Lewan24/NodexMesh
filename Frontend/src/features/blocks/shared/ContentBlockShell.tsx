import { translate } from '@/shared/i18n';
import { useTranslation } from 'react-i18next';
import { getSectionStyle } from '@/features/blocks/typography/sectionTypography';
import { useEffect, useRef, useState, type ReactNode, type CSSProperties } from 'react';
import { CANVAS_GRID_SIZE } from '@/features/canvas/constants';
import type { BaseItem } from '@/entities/board/types';
import { getFontFamilyCss } from '../typography/typographyUtils';
import { useCardAppearance } from './cardAppearance';

export default function ContentBlockShell({
  item,
  title,
  children,
  onDelete,
  autoHeight = false,
  minHeight = 120,
  onOutsideClick,
}: {
  item: BaseItem;
  title: ReactNode;
  children: ReactNode;
  onDelete: () => void;
  autoHeight?: boolean;
  minHeight?: number;
  onOutsideClick?: () => void;
}) {
  useTranslation();
  const contentRef = useRef<HTMLDivElement>(null);
  const [fittedHeight, setFittedHeight] = useState(minHeight);
  useEffect(() => {
    const content = contentRef.current;
    if (!autoHeight || !content) return;
    const measure = () =>
      setFittedHeight(Math.ceil(Math.max(minHeight, content.offsetHeight) / CANVAS_GRID_SIZE) * CANVAS_GRID_SIZE);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(content);
    return () => observer.disconnect();
  }, [autoHeight, minHeight]);
  const shellRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!onOutsideClick) return;
    const outside = (event: PointerEvent) => {
      const target = event.target;
      if (
        target instanceof Element &&
        !shellRef.current?.contains(target) &&
        !target.closest('[role="dialog"], dialog')
      )
        onOutsideClick();
    };
    document.addEventListener('pointerdown', outside, true);
    return () => document.removeEventListener('pointerdown', outside, true);
  }, [onOutsideClick]);
  const { background, textColor } = useCardAppearance(
    item.color,
    item.gradient,
    item.colorRole,
    item.backgroundOpacity,
  );
  return (
    <section
      ref={shellRef}
      className="content-block-shell item-rounded shadow-xl flex flex-col overflow-hidden"
      style={
        {
          width: item.width,

          height: autoHeight ? fittedHeight : item.height,

          minHeight,

          background,
          color: textColor,

          fontFamily: getFontFamilyCss(item.typography?.fontFamily),

          fontSize: item.typography?.fontSize ?? 14,

          '--block-font-weight': item.typography?.bold === undefined ? undefined : item.typography.bold ? 700 : 400,
          '--block-font-size': item.typography?.fontSize ? `${item.typography.fontSize}px` : undefined,

          '--block-background': background,

          fontWeight: item.typography?.bold ? 700 : undefined,

          fontStyle: item.typography?.italic ? 'italic' : undefined,

          textAlign: item.typography?.textAlign,
        } as CSSProperties
      }
    >
      <div
        ref={contentRef}
        className="flex flex-col min-h-0"
        style={{ height: autoHeight ? undefined : '100%', flexShrink: autoHeight ? 0 : undefined }}
      >
        {item.topColor && <div className="h-[5px] shrink-0" style={{ background: item.topColor }} />}
        <header
          className="flex items-center gap-2 px-4 py-2 border-b cursor-grab text-sm font-medium"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <span aria-hidden="true" className="opacity-35 select-none" title={translate('Drag block')}>
            ⠿
          </span>
          <div className="flex-1 min-w-0" style={getSectionStyle(item.typography, 'title')}>
            {title}
          </div>
          <button
            type="button"
            title={translate('Delete block')}
            aria-label={translate('Delete block')}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={onDelete}
            className="px-2 rounded hover:bg-black/10"
          >
            ×
          </button>
        </header>
        {children}
      </div>
    </section>
  );
}
