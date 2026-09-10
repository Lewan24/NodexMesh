import type { DrawingItem } from '@/entities/board/types';
import { drawingOutline, drawingStrokes } from './drawingUtils';

export default function DrawingBlock({ item }: { item: DrawingItem }) {
  return <svg role="img" aria-label="Freehand drawing" width={item.width} height={item.height}
    viewBox={`0 0 ${item.viewWidth} ${item.viewHeight}`} preserveAspectRatio="none"
    className="overflow-visible cursor-grab active:cursor-grabbing">
    {drawingStrokes(item).map((stroke, index) => <path key={index} transform={`translate(${stroke.x} ${stroke.y}) scale(${stroke.scaleX} ${stroke.scaleY})`} d={drawingOutline(stroke.points, stroke.strokeWidth)} fill={stroke.color} />)}
  </svg>;
}
