export const DROPPABLE_ON_COLUMN = new Set([
  'note',
  'text',
  'image',
  'file',
  'link',
  'checklist',
  'document',
  'code',
  'embed',
]);

export const ZOOM_MIN = 0.1;
export const ZOOM_MAX = 3;

export const CANVAS_VIEWPORT_OVERSCAN = 320;

export const CANVAS_GRID_SIZE = 16;
export const CANVAS_MAJOR_GRID_SIZE = 64;

export const DEFAULT_NOTE_WIDTH = 320;
/** N notes plus the minimum grid gap between them, without a trailing gap. */
export const noteModuleWidth = (count: number) => count * DEFAULT_NOTE_WIDTH + (count - 1) * CANVAS_GRID_SIZE;

export const FRAME_AUTO_EXPAND_PADDING = 24;
export const FRAME_FIT_PADDING = 36;

export const MIN_FRAME_WIDTH = 128;
export const MIN_FRAME_HEIGHT = 80;

export const MIN_BLOCK_WIDTH = 144;
export const MIN_IMAGE_HEIGHT = 80;

export const CANVAS_HISTORY_LIMIT = 50;

export const ITEM_WIDTH = {
  board: DEFAULT_NOTE_WIDTH,
  'section-title': DEFAULT_NOTE_WIDTH,
  drawing: DEFAULT_NOTE_WIDTH,
  timeline: noteModuleWidth(3),
  diagram: noteModuleWidth(3),
  mindmap: noteModuleWidth(3),
  database: noteModuleWidth(3),
  document: noteModuleWidth(2),
  embed: noteModuleWidth(2),
  code: noteModuleWidth(2),
  dispenser: DEFAULT_NOTE_WIDTH,
  note: DEFAULT_NOTE_WIDTH,
  checklist: DEFAULT_NOTE_WIDTH,
  link: DEFAULT_NOTE_WIDTH,
  icon: 96,
  image: DEFAULT_NOTE_WIDTH,
  file: DEFAULT_NOTE_WIDTH,
  text: DEFAULT_NOTE_WIDTH,
  column: noteModuleWidth(2),
  frame: noteModuleWidth(2),
  kanban: noteModuleWidth(3),
  line: DEFAULT_NOTE_WIDTH,
} as const;
