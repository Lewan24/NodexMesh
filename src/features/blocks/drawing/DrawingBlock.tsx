import type { DrawingItem } from '@/entities/board/types';
import { drawingOutline } from './drawingUtils';

export default function DrawingBlock({ item }: { item: DrawingItem }) {
  return <svg role="img" aria-label="Freehand drawing" width={item.width} height={item.height}
    viewBox={`0 0 ${item.viewWidth} ${item.viewHeight}`} preserveAspectRatio="none"
    className="overflow-visible cursor-grab active:cursor-grabbing">
    <path d={drawingOutline(item.points, item.strokeWidth)} fill={item.color} />
  </svg>;
}
