import { useTranslation } from 'react-i18next';
import type { FrameDraft, SelectionBox } from '@/features/canvas/types';

interface CanvasOverlaysProps {
  frameDraft: FrameDraft | null;
  lasso: SelectionBox | null;
}

export default function CanvasOverlays({ frameDraft, lasso }: CanvasOverlaysProps) {
  useTranslation();
  return (
    <>
      {frameDraft && (
        <div
          className="absolute pointer-events-none"
          style={{
            left: frameDraft.x,
            top: frameDraft.y,
            width: frameDraft.width,
            height: frameDraft.height,
            border: '2px dashed color-mix(in srgb, var(--color-accent) 70%, transparent)',
            borderRadius: 12,
            backgroundColor: 'color-mix(in srgb, var(--color-accent) 6%, transparent)',
          }}
        />
      )}

      {lasso && (
        <div
          className="absolute pointer-events-none"
          style={{
            left: lasso.x1,
            top: lasso.y1,
            width: lasso.x2 - lasso.x1,
            height: lasso.y2 - lasso.y1,
            border: '1.5px solid color-mix(in srgb, var(--color-accent) 80%, transparent)',
            borderRadius: 4,
            backgroundColor: 'color-mix(in srgb, var(--color-accent) 7%, transparent)',
          }}
        />
      )}
    </>
  );
}
