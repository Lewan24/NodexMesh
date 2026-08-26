export type ToolType = 'select' | 'note' | 'kanban' | 'image' | 'link' | 'text' | 'frame' | 'checklist' | 'line' | 'column';

// ─── Auth ──────────────────────────────────────────────────────────────────
export type Role = 'admin' | 'user';

export interface User {
  id: string;
  username: string;
  /** Mock-only plaintext password. Replace with a real auth flow when the API lands. */
  password: string;
  name: string;
  role: Role;
}

export interface Project {
  id: string;
  name: string;
  color: string;
  items: BoardItem[];
  /** Owning user's id — each user only sees their own projects. */
  ownerId: string;
}

export type BoardItem = NoteItem | KanbanItem | ImageItem | LinkItem | TextItem | FrameItem | ChecklistItem | LineItem | ColumnItem;

export interface BaseItem {
  id: string;
  x: number;
  y: number;
  zIndex: number;
  topColor?: string;  // accent strip color shown at top of item card
}

export interface NoteItem extends BaseItem {
  type: 'note';
  content: string;
  color: string;
  width?: number;
  /** Manually-set height in px. When unset, the note grows to fit its content. */
  height?: number;
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
  width?: number;
  imgHeight?: number;
  color?: string;
}

export interface LinkItem extends BaseItem {
  type: 'link';
  url: string;
  title: string;
  width?: number;
  description: string;
  color?: string;
}

export interface TextItem extends BaseItem {
  type: 'text';
  content: string;
  size: 'sm' | 'md' | 'lg' | 'xl';
  color?: string;
  /** Manually-set width in px, used once the block has a card background (so text wraps). */
  width?: number;
}

export interface FrameItem extends BaseItem {
  type: 'frame';
  title: string;
  width: number;
  height: number;
  color: string;
}

export interface ChecklistItem extends BaseItem {
  type: 'checklist';
  title: string;
  width?: number;
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
}

export interface ColumnItem extends BaseItem {
  type: 'column';
  title: string;
  color: string;
  width: number;
  items: BoardItem[];
}
