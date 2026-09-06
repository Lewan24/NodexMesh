import type {
  AlignmentGuide,
} from '@/features/canvas/utils/alignmentGuides';

interface CanvasAlignmentGuidesProps {
  guides: AlignmentGuide[];
}

export default function CanvasAlignmentGuides({
  guides,
}: CanvasAlignmentGuidesProps) {
  if (guides.length === 0) {
    return null;
  }

  return (
    <>
      {guides.map((guide, index) => {
        const isCenter =
          guide.kind === 'center';

        if (guide.axis === 'x') {
          return (
            <div
              key={`x-${guide.position}-${index}`}
              className="absolute pointer-events-none"
              style={{
                left: guide.position,
                top: guide.start,
                width: isCenter ? 2 : 1,
                height:
                  guide.end -
                  guide.start,
                transform:
                  'translateX(-50%)',
                backgroundColor:
                  isCenter
                    ? 'var(--color-accent)'
                    : 'rgba(124,58,237,0.65)',
                boxShadow:
                  isCenter
                    ? '0 0 8px rgba(124,58,237,0.4)'
                    : undefined,
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
              width:
                guide.end -
                guide.start,
              height: isCenter ? 2 : 1,
              transform:
                'translateY(-50%)',
              backgroundColor:
                isCenter
                  ? 'var(--color-accent)'
                  : 'rgba(124,58,237,0.65)',
              boxShadow:
                isCenter
                  ? '0 0 8px rgba(124,58,237,0.4)'
                  : undefined,
              zIndex: 998,
            }}
          />
        );
      })}
    </>
  );
}