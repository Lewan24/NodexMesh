import type { BaseItem, BoardItem, ItemComment } from './types';

/** Decimal strings map to .NET Int64 without losing precision in JavaScript. */
export type Revision = string;

export interface AuditFields {
  revision: Revision;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
  deletedAt: string | null;
}

export type ItemAppearance = Pick<BaseItem, 'color' | 'colorRole' | 'gradient' | 'topColor' | 'typography'> & {
  textAlign?: 'left' | 'center' | 'right';
  fontSize?: 'sm' | 'base' | 'lg';
  bold?: boolean;
  italic?: boolean;
};

type DataFor<T extends BoardItem> = Omit<
  T,
  keyof BaseItem | keyof ItemAppearance | 'type' | 'items' | 'dispenserId' | 'startItemId' | 'endItemId'
> &
  (T extends { type: 'document' } ? { contentFormat: 'tiptap-html'; contentVersion: 1 } : object);

export type ItemDataMap = { [T in BoardItem as T['type']]: DataFor<T> };

export interface ItemFields {
  id: string;
  boardId: string;
  parentItemId: string | null;
  frameId: string | null;
  sortOrder: number;
  x: number;
  y: number;
  width: number | null;
  height: number | null;
  zIndex: number;
  locked: boolean;
  appearance: ItemAppearance;
}

export type ItemWrite = {
  [K in keyof ItemDataMap]: ItemFields & { type: K; schemaVersion: 1; data: ItemDataMap[K] };
}[keyof ItemDataMap];
export type ItemRecord = ItemWrite & AuditFields;

export interface ItemLink {
  sourceItemId: string;
  targetItemId: string;
  kind: 'line_start' | 'line_end' | 'created_from';
}

export interface CommentRecord extends AuditFields {
  id: string;
  itemId: string;
  text: string;
  status: NonNullable<ItemComment['status']>;
}

export interface TagRecord {
  id: string;
  projectId: string;
  name: string;
  normalizedName: string;
}

export interface BoardRecord extends AuditFields {
  id: string;
  projectId: string;
  name: string;
  sortOrder: number;
}

export interface BoardSnapshot {
  board: BoardRecord;
  items: ItemRecord[];
  links: ItemLink[];
  comments: CommentRecord[];
  tags: TagRecord[];
  itemTags: { itemId: string; tagId: string }[];
}

/** Relations are replaced only for the touched item, inside the same transaction. */
export interface ItemMutation {
  item: ItemWrite;
  expectedRevision: Revision | null;
  links: ItemLink[];
  comments: { id: string; text: string; status: CommentRecord['status'] }[];
  tags: string[];
}

export interface BoardMutation {
  clientMutationId: string;
  expectedBoardRevision: Revision;
  upserts: ItemMutation[];
  deletes: { id: string; expectedRevision: Revision }[];
}
