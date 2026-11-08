import { useTranslation } from 'react-i18next';
import type { AlignmentGuide } from '@/features/canvas/utils/alignmentGuides';

interface CanvasAlignmentGuidesProps {
  guides: AlignmentGuide[];
}

export default function CanvasAlignmentGuides({ guides }: CanvasAlignmentGuidesProps) {
  useTranslation();
  if (guides.length === 0) {
    return null;
  }

  return (
    <>
      {guides.map((guide, index) => {
        const isCenter = guide.kind === 'center';

        if (guide.axis === 'x') {
          return (
            <div
              key={`x-${guide.position}-${index}`}
              className="absolute pointer-events-none"
              style={{
                left: guide.position,
                top: guide.start,
                width: isCenter ? 2 : 1,
                height: guide.end - guide.start,
                transform: 'translateX(-50%)',
                backgroundColor: isCenter
                  ? 'var(--color-accent)'
                  : 'color-mix(in srgb, var(--color-accent) 65%, transparent)',
                boxShadow: isCenter ? '0 0 8px color-mix(in srgb, var(--color-accent) 40%, transparent)' : undefined,
                zIndex: 998,
              }}
            />
          );
        }

        return (
          <div
            key={`y-${guide.position}-${index}`}
            className="absolute pointer-events-none"
            style={{
              left: guide.start,
              top: guide.position,
              width: guide.end - guide.start,
              height: isCenter ? 2 : 1,
              transform: 'translateY(-50%)',
              backgroundColor: isCenter
                ? 'var(--color-accent)'
                : 'color-mix(in srgb, var(--color-accent) 65%, transparent)',
              boxShadow: isCenter ? '0 0 8px color-mix(in srgb, var(--color-accent) 40%, transparent)' : undefined,
              zIndex: 998,
            }}
          />
        );
      })}
    </>
  );
}
