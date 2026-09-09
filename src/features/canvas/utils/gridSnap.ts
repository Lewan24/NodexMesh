import { CANVAS_GRID_SIZE } from '../constants';

export const snapToGrid = (value: number) =>
  Math.round(value / CANVAS_GRID_SIZE) * CANVAS_GRID_SIZE;
