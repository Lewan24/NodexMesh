import Canvas from '@/features/canvas/components/Canvas';
import type { CanvasProps } from '@/features/canvas/components/Canvas';
import { useBoardCamera } from '../hooks/useBoardCamera';

type BoardCanvasProps = Omit<CanvasProps, 'pan' | 'zoom' | 'onPanChange' | 'onZoomChange'> & { userId: string };

export default function BoardCanvas({ userId, ...props }: BoardCanvasProps) {
  const { pan, zoom, setPan, setZoom } = useBoardCamera(userId, props.project.id, props.project.boardId);
  return <Canvas {...props} pan={pan} zoom={zoom} onPanChange={setPan} onZoomChange={setZoom} />;
}
