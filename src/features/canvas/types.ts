export interface CanvasPoint {
  x: number;
  y: number;
}

export interface FrameDraft {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SelectionBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export type ResizeDirection =
  | 'n'
  | 'ne'
  | 'e'
  | 'se'
  | 's'
  | 'sw'
  | 'w'
  | 'nw';