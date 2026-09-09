export const DROPPABLE_ON_COLUMN = new Set([
  'note',
  'text',
  'image',
  'link',
  'checklist',
]);

export const ZOOM_MIN = 0.1;
export const ZOOM_MAX = 3;

export const CANVAS_GRID_SIZE = 16;
export const CANVAS_MAJOR_GRID_SIZE = 64;

export const FRAME_AUTO_EXPAND_PADDING = 24;
export const FRAME_FIT_PADDING = 36;

export const MIN_FRAME_WIDTH = 120;
export const MIN_FRAME_HEIGHT = 80;

export const MIN_BLOCK_WIDTH = 140;
export const MIN_IMAGE_HEIGHT = 80;

export const CANVAS_HISTORY_LIMIT = 50;

export const ITEM_WIDTH = {
  document: 480,
  embed: 480,
  code: 480,
  dispenser: 240,
  note: 320,
  checklist: 320,
  link: 320,
  image: 320,
  text: 320,
  column: 320,
  frame: 500,
  kanban: 576,
  line: 192,
} as const;
