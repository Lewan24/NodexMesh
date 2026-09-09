export type BoardItem = NoteItem | KanbanItem | ImageItem | LinkItem | TextItem | FrameItem | ChecklistItem | LineItem | ColumnItem | DocumentItem | EmbedItem | CodeItem | DispenserItem;

export interface DocumentItem extends BaseItem {
  autoHeight?: boolean;
  type: 'document';
  title: string;
  content: string;
}

export interface EmbedItem extends BaseItem {
  type: 'embed';
  url: string;
  title: string;
  showLabel: boolean;
}

export interface CodeItem extends BaseItem {
  autoHeight?: boolean;
  type: 'code';
  content: string;
  language: string;
}

export interface DispenserItem extends BaseItem {
  type: 'dispenser';
  title: string;
  color: string;
}

export type FontFamily =
  | 'sans'
  | 'serif'
  | 'mono'
  | 'arial'
  | 'georgia'
  | 'verdana'
  | 'trebuchet';

export type TextAlign = 'left' | 'center' | 'right';
export type VerticalAlign = 'top' | 'middle' | 'bottom';
export type ColumnLayout = 'vertical' | 'horizontal' | 'grid';
export type LineLabelMode = 'horizontal' | 'follow-line';
export type CommentStatus = 'open' | 'todo' | 'in-progress' | 'resolved';

export interface ItemComment {
  id: string;
  text: string;
  status?: CommentStatus;
  createdAt: string;
}

export interface TypographySettings {
  fontFamily?: FontFamily;
  fontSize?: number;
  bold?: boolean;
  italic?: boolean;
  textAlign?: TextAlign;
  verticalAlign?: VerticalAlign;
}

export interface BaseItem {
  id: string;
  typography?: TypographySettings;
  x: number;
  y: number;
  zIndex: number;
  width?: number;
  height?: number;
  topColor?: string;
  tags?: string[];
  locked?: boolean;
  comments?: ItemComment[];
}

export interface NoteItem extends BaseItem {
  dispenserId?: string;
  type: 'note';
  content: string;
  color: string;
  textAlign?: 'left' | 'center' | 'right';
  fontSize?: 'sm' | 'base' | 'lg';
  bold?: boolean;
  italic?: boolean;
}

export interface KanbanItem extends BaseItem {
  type: 'kanban';
  title: string;
  columns: KanbanColumn[];
  color?: string;
}

export interface KanbanColumn {
  id: string;
  title: string;
  color: string;
  cards: KanbanCard[];
  width?: number;
}

export interface KanbanCard {
  id: string;
  text: string;
  done: boolean;
}

export interface ImageItem extends BaseItem {
  type: 'image';
  url: string;
  caption: string;
  imgHeight?: number; // temporary legacy field
  color?: string;
  variant?: 'card' | 'sticker';
}

export interface LinkItem extends BaseItem {
  type: 'link';
  url: string;
  title: string;
  description: string;
  color?: string;
}

export interface TextItem extends BaseItem {
  type: 'text';
  content: string;
  size: 'sm' | 'md' | 'lg' | 'xl';
  color?: string;
  textAlign?: 'left' | 'center' | 'right';
  bold?: boolean;
  italic?: boolean;
}

export interface FrameItem extends BaseItem {
  type: 'frame';
  title: string;
  width: number;
  height: number;
  color: string;
  opacity?: number;
}

export interface ChecklistItem extends BaseItem {
  type: 'checklist';
  title: string;
  color: string;
  entries: ChecklistEntry[];
}

export interface ChecklistEntry {
  id: string;
  text: string;
  done: boolean;
}

export interface LineItem extends BaseItem {
  type: 'line';
  x2: number;
  y2: number;
  arrowStart: boolean;
  arrowEnd: boolean;
  color: string;
  strokeWidth: number;
  /** If set, the start point (x,y) follows this item's center instead of being fixed. */
  startItemId?: string;
  /** If set, the end point (x2,y2) follows this item's center instead of being fixed. */
  endItemId?: string;

  label?: string;
  labelMode?: LineLabelMode;
  /**
   * Distance from the actual line.
   * 0 = directly in the middle of the line.
   */
  labelOffset?: number;
  labelFontSize?: number;

  divider?: boolean;
}

export interface ColumnItem extends BaseItem {
  type: 'column';
  title: string;
  color: string;
  width: number;
  items: BoardItem[];
  layout?: ColumnLayout;
  gridColumns?: number;
  gap?: number;
}
