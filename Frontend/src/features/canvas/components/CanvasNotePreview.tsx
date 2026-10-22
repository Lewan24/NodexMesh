import type { NoteItem } from '@/entities/board/types';
import { useCardAppearance } from '@/features/blocks/shared/cardAppearance';
import { getTypographyStyle } from '@/features/blocks/typography/typographyUtils';
import { getSectionStyle } from '@/features/blocks/typography/sectionTypography';
import { NOTE_FONT_SIZE_CLASS } from '@/features/blocks/note/utils/noteUtils';

/** Fixed bounds and readable content without editor effects, observers or hover shadows during navigation. */
export default function CanvasNotePreview({
  item,
  scrollPosition,
}: {
  item: NoteItem;
  scrollPosition?: { left: number; top: number };
}) {
  const { background, textColor } = useCardAppearance(
    item.color,
    item.gradient,
    item.colorRole,
    item.backgroundOpacity,
  );
  const verticalAlign = item.typography?.verticalAlign ?? (item.dispenserId ? 'middle' : 'top');
  return (
    <div
      data-camera-preview="true"
      className="item-rounded flex flex-col overflow-hidden"
      style={{
        width: item.width ?? 220,
        height: item.height,
        background,
        contain: 'strict',
        contentVisibility: 'auto',
      }}
    >
      {item.topColor && <div className="shrink-0" style={{ height: 5, background: item.topColor }} />}
      <div
        ref={(element) => {
          if (element && scrollPosition) {
            element.scrollLeft = scrollPosition.left;
            element.scrollTop = scrollPosition.top;
          }
        }}
        className="p-3 min-h-0 flex-1 flex flex-col overflow-hidden"
        style={{
          justifyContent:
            verticalAlign === 'middle' ? 'center' : verticalAlign === 'bottom' ? 'flex-end' : 'flex-start',
        }}
      >
        <div
          className={`leading-relaxed whitespace-pre-wrap wrap-break-word ${NOTE_FONT_SIZE_CLASS[item.fontSize ?? 'base']}`}
          style={{
            color: textColor,
            ...getTypographyStyle(item),
            ...(item.dispenserId && !item.typography?.textAlign ? { textAlign: 'center' } : {}),
            ...getSectionStyle(item.typography, 'body'),
          }}
        >
          {item.content}
        </div>
      </div>
    </div>
  );
}
