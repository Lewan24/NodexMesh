import { FrameDraft, SelectionBox } from "@/features/canvas/types";

interface CanvasOverlaysProps {
  frameDraft: FrameDraft | null;
  lasso: SelectionBox | null;
}

export default function CanvasOverlays({
  frameDraft,
  lasso,
}: CanvasOverlaysProps) {
  return (
    <>
      {frameDraft && (
        <div
          className="absolute pointer-events-none"
          style={{
            left:
              frameDraft.x,

            top:
              frameDraft.y,

            width:
              frameDraft.width,

            height:
              frameDraft.height,

            border:
              '2px dashed rgba(124, 58, 237, 0.7)',

            borderRadius: 12,

            backgroundColor:
              'rgba(124, 58, 237, 0.06)',
          }}
        />
      )}

      {lasso && (
        <div
          className="absolute pointer-events-none"
          style={{
            left: lasso.x1,
            top: lasso.y1,

            width:
              lasso.x2 -
              lasso.x1,

            height:
              lasso.y2 -
              lasso.y1,

            border:
              '1.5px solid rgba(124, 58, 237, 0.8)',

            borderRadius: 4,

            backgroundColor:
              'rgba(124, 58, 237, 0.07)',
          }}
        />
      )}
    </>
  );
}