import { useMemo } from 'react';
import { useCardAppearance } from '@/features/blocks/shared/cardAppearance';
import { getTypographyStyle } from '@/features/blocks/typography/typographyUtils';
import { getSectionStyle } from '@/features/blocks/typography/sectionTypography';
import { getHeavyPreviewLines, type HeavyPreviewItem } from '../utils/heavyPreview';

/** Navigation-only paint surface; the real editor remains mounted beside it. */
export default function CanvasHeavyPreview({ item }: { item: HeavyPreviewItem }) {
  const { background, textColor } = useCardAppearance(
    item.color,
    item.gradient,
    item.colorRole,
    item.backgroundOpacity,
  );
  const lines = useMemo(() => getHeavyPreviewLines(item), [item]);
  return (
    <div
      data-camera-preview="heavy"
      className="absolute inset-0 item-rounded overflow-hidden flex flex-col"
      style={{ background, color: textColor, contain: 'strict', ...getTypographyStyle(item) }}
    >
      {item.topColor && <div className="shrink-0 h-[5px]" style={{ background: item.topColor }} />}
      <div className="px-4 py-2 border-b truncate shrink-0" style={getSectionStyle(item.typography, 'title')}>
        {item.title}
      </div>
      <div className="p-4 min-h-0 overflow-hidden space-y-3" style={getSectionStyle(item.typography, 'body')}>
        {lines.map((line, index) => (
          <p key={index} className="whitespace-pre-wrap wrap-break-word">
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}
