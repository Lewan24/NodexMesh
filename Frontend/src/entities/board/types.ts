export interface SectionTitleItem extends BaseItem {
  type: 'section-title';
  content: string;
}

export interface BoardBlockItem extends BaseItem {
  type: 'board';
  boardId: string | null;
  title: string;
  description: string;
  icon: string;
  color: string;
}

export type BoardItem =
  | BoardBlockItem
  | SectionTitleItem
  | NoteItem
  | KanbanItem
  | IconItem
  | ImageItem
  | LinkItem
  | TextItem
  | FrameItem
  | ChecklistItem
  | LineItem
  | ColumnItem
  | DocumentItem
  | EmbedItem
  | CodeItem
  | DispenserItem
  | TimelineItem
  | DiagramItem
  | MindmapItem
  | DatabaseDiagramItem
  | DrawingItem;

export interface IconItem extends BaseItem {
  type: 'icon';
  iconMode: 'preset' | 'emoji' | 'svg' | 'url' | 'library';
  source: string;
  label: string;
}

export interface DrawingStroke {
  points: { x: number; y: number; pressure?: number }[];
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  color: string;
  strokeWidth: number;
}

export interface DrawingItem extends BaseItem {
  strokes?: DrawingStroke[];
  type: 'drawing';
  points: { x: number; y: number; pressure?: number }[];
  viewWidth: number;
  viewHeight: number;
  width: number;
  height: number;
  color: string;
  strokeWidth: number;
}

export interface TimelineTask {
  id: string;
  title: string;
  start: string;
  end: string;
  done: boolean;
  color: string;
  assigneeUserId?: string;
  checklist: ChecklistEntry[];
}
export interface TimelineItem extends BaseItem {
  taskColumnWidth?: number;
  type: 'timeline';
  title: string;
  mode: 'simple' | 'schedule';
  tasks: TimelineTask[];
}
export type DiagramShape = 'process' | 'decision' | 'terminal' | 'database' | 'input' | 'document' | 'service';
export interface DiagramNode {
  id: string;
  position: { x: number; y: number };
  data: { label: string; shape: DiagramShape; color: string };
  type: 'shape';
}
export interface DiagramEdge {
  type?: 'smoothstep' | 'default' | 'straight';
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  label?: string;
}
export interface DiagramItem extends BaseItem {
  type: 'diagram';
  title: string;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
}

export interface MindmapNode {
  id: string;
  parentId: string | null;
  label: string;
  side: 'negative' | 'positive';
  branchColor: string;
  background: string;
  textColor: string;
}

export interface MindmapItem extends BaseItem {
  type: 'mindmap';
  title: string;
  nodes: MindmapNode[];
  layout: 'horizontal' | 'vertical';
  lineStyle: 'curve' | 'elbow' | 'straight';
  lineWidth: number;
  dashed: boolean;
}

export interface DocumentItem extends BaseItem {
  contentFormat?: 'tiptap-html';
  contentVersion?: 1;
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
  | 'caveat'
  | 'kalam'
  | 'patrick-hand'
  | 'comic-neue'
  | 'architects-daughter'
  | 'trebuchet'
  | 'short-stack'
  | 'shantell-sans'
  | 'mynerve'
  | 'schoolbell'
  | 'mansalva'
  | 'walter-turncoat'
  | 'patrick-hand-sc'
  | 'indie-flower'
  | 'gloria-hallelujah';

export type TextAlign = 'left' | 'center' | 'right';
export type VerticalAlign = 'top' | 'middle' | 'bottom';
export type ColumnLayout = 'vertical' | 'horizontal' | 'grid';
export type LineLabelMode = 'horizontal' | 'follow-line';
export type CommentStatus = 'open' | 'todo' | 'in-progress' | 'resolved';

export interface ItemComment {
  authorId?: string;
  id: string;
  text: string;
  status?: CommentStatus;
  createdAt: string;
}

export type TextSection = 'title' | 'description' | 'body' | 'links' | 'caption' | 'labels';

export interface TextSectionStyle {
  color?: string;
  fontSize?: number;
  bold?: boolean;
  italic?: boolean;
  textAlign?: TextAlign;
}

export interface TypographySettings {
  sections?: Partial<Record<TextSection, TextSectionStyle>>;
  fontFamily?: FontFamily;
  fontSize?: number;
  bold?: boolean;
  italic?: boolean;
  textAlign?: TextAlign;
  verticalAlign?: VerticalAlign;
}

export interface BaseItem {
  customCss?: { enabled: boolean; source: string };
  colorRole?: 'default' | 'accent1' | 'accent2' | 'accent3' | 'accent4' | 'accent5';
  gradient?: { from: string; to: string; kind: 'linear' | 'radial'; angle: number };

  /** Persistent root-frame ownership; null means explicitly unassigned. */
  frameId?: string | null;
  color?: string;
  /** Opacity of the item's fill only. Omitted means fully opaque. */
  backgroundOpacity?: number;
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
  /** Relative width weight; legacy pixel widths retain their proportions. */
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
  curve?: number;
  lineCap?: 'round' | 'butt' | 'square';
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

export interface DatabaseField {
  id: string;
  name: string;
  dataType: string;
  primaryKey: boolean;
  nullable: boolean;
  unique: boolean;
  defaultValue: string;
}
export interface DatabaseTable {
  id: string;
  name: string;
  position: { x: number; y: number };
  fields: DatabaseField[];
}
export interface DatabaseRelation {
  id: string;
  source: string;
  target: string;
  sourceField: string;
  targetField: string;
  cardinality: '1:1' | '1:N' | 'N:1' | 'N:N';
}
export interface DatabaseDiagramItem extends BaseItem {
  type: 'database';
  title: string;
  tables: DatabaseTable[];
  relations: DatabaseRelation[];
}
